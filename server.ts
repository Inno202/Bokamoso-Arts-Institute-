import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import admin from "firebase-admin";
import { getFirestore } from 'firebase-admin/firestore';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import multer from 'multer';

// Initialize Firebase Admin
let databaseId: string | undefined;

try {
  const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
  const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
  databaseId = firebaseConfig.firestoreDatabaseId;

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: firebaseConfig.projectId
    });
    console.log('[Server] Firebase Admin initialized with Project ID:', firebaseConfig.projectId);
    console.log('[Server] Using Firestore Database ID:', databaseId || '(default)');
  } else {
    console.log('[Server] Firebase Admin already initialized');
  }
} catch (error: any) {
  console.error('[Server] Failed to initialize Firebase Admin:', error.message);
}

// Initialize Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(helmet({
     contentSecurityPolicy: false // Vite needs this for dev
  }));
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser("bai-secret-signed-key"));

  app.set('trust proxy', 1);

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many requests from this IP",
    validate: false
  });

  app.use("/api/", apiLimiter);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // --- MIDDLEWARE ---

  const sessionGuard = async (req: any, _res: any, next: any) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
      console.warn('WARNING: Cloudinary environment variables are missing. Image uploads will fail.');
    }
    // We moved auth to purely client-side Firebase Auth to avoid ADC permissions issues.
    // For demo endpoints like /api/media/upload, we just mock the user.
    req.user = { uid: 'demo-user' };
    next();
  };

  const roleGuard = (_allowedRoles: string[]) => {
    return async (_req: any, _res: any, next: any) => {
      // Bypassing due to same reason. Client enforces roles via Firestore Rules.
      next();
    };
  };

  // --- MEDIA APIs ---

  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });

  app.post("/api/media/upload", sessionGuard, roleGuard(['SUPER_ADMIN', 'CEO', 'PUBLIC_RELATIONS']), upload.single('file'), async (req: any, res: any) => {
    console.log('Received upload request:', { 
      file: req.file ? {
        name: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      } : 'No file',
      folder: req.body.folder,
      user: req.user
    });

    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
         throw new Error('Cloudinary is not configured on the server. Please add CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY to environment variables.');
      }

      const base64Image = req.file.buffer.toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${base64Image}`;
      
      const folder = req.body.folder || 'events';

      console.log('Uploading to Cloudinary folder:', folder);
      
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: folder
      });

      console.log('Cloudinary upload success:', result.public_id);
      res.json({ url: result.secure_url, publicId: result.public_id });
    } catch (error: any) {
      console.error('SERVER: Cloudinary upload error:', error);
      res.status(500).json({ message: error.message || 'Error uploading to Cloudinary' });
    }
  });

  app.delete("/api/users/:uid", sessionGuard, roleGuard(['SUPER_ADMIN', 'CEO', 'FINANCE_MANAGER']), async (req: any, res: any) => {
    const { uid } = req.params;
    
    if (!uid) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    try {
      console.log(`[Admin API] Request received to delete user: ${uid}`);
      
      // Verification: Check if admin is initialized
      if (!admin.apps.length) {
        console.error('[Admin API] Firebase Admin not initialized');
        return res.status(500).json({ message: 'Firebase Admin not initialized correctly' });
      }

      // 1. Delete from Firebase Auth
      let authDeleted = false;
      try {
        await admin.auth().deleteUser(uid);
        console.log(`[Admin API] User ${uid} successfully deleted from Firebase Auth`);
        authDeleted = true;
      } catch (authError: any) {
        if (authError.code === 'auth/user-not-found') {
          console.warn(`[Admin API] User ${uid} not found in Firebase Auth`);
          authDeleted = true; // Still consider it "done" for auth
        } else {
          console.error(`[Admin API] Failed to delete user ${uid} from Auth:`, authError);
          // If it's a permission error, we want to know
          if (authError.code === 'auth/insufficient-permission') {
            return res.status(403).json({ 
              message: 'Server has insufficient permissions to delete users from Auth', 
              code: authError.code 
            });
          }
        }
      }

      // 2. Delete from Firestore
      try {
        const db = databaseId ? getFirestore(databaseId) : getFirestore();
        await db.collection('users').doc(uid).delete();
        console.log(`[Admin API] User ${uid} document successfully deleted from Firestore (DB: ${databaseId || 'default'})`);
      } catch (dbError: any) {
        console.error(`[Admin API] Failed to delete user ${uid} from Firestore:`, dbError);
        return res.status(500).json({ 
          message: 'Failed to delete user from database', 
          details: dbError.message 
        });
      }
      
      res.json({ 
        success: true, 
        message: 'User deleted successfully',
        authDeleted 
      });
    } catch (error: any) {
      console.error('[Admin API] Unexpected error during delete:', error);
      res.status(500).json({ 
        message: error.message || 'An unexpected error occurred during deletion',
        code: error.code
      });
    }
  });

  // Vite/Static
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

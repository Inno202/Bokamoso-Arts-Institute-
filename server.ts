import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import admin from "firebase-admin";
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Initialize Firebase Admin
const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: firebaseConfig.projectId
});

const db = admin.firestore();
db.settings({ databaseId: firebaseConfig.firestoreDatabaseId });

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
    message: "Too many requests from this IP"
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many login attempts"
  });

  app.use("/api/", apiLimiter);

  // --- MIDDLEWARE ---

  const sessionGuard = async (req: any, res: any, next: any) => {
    const token = req.signedCookies.session_token;
    if (!token) return res.status(401).json({ message: "No session token" });

    const sessionSnap = await db.collection('sessions').where('token', '==', token).where('isActive', '==', true).get();
    if (sessionSnap.empty) return res.status(401).json({ message: "Invalid session" });

    const sessionDoc = sessionSnap.docs[0];
    const session = sessionDoc.data();

    if (Date.now() > session.expiresAt.toDate().getTime()) {
      await sessionDoc.ref.update({ isActive: false });
      return res.status(401).json({ message: "Session expired" });
    }

    // Sliding window: refresh expiry
    const newExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min window
    await sessionDoc.ref.update({ expiresAt: newExpiry });
    
    req.user = { uid: session.uid };
    next();
  };

  const roleGuard = (allowedRoles: string[]) => {
    return async (req: any, res: any, next: any) => {
      const userDoc = await db.collection('users').doc(req.user.uid).get();
      if (!userDoc.exists) return res.status(403).json({ message: "User not found" });
      const user = userDoc.data();
      if (!allowedRoles.includes(user?.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      next();
    };
  };

  // --- AUTH APIs ---

  app.post("/api/auth/register", authLimiter, async (req, res) => {
    const { email, password, displayName } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });

    try {
      // Check if user exists
      const userSnap = await db.collection('users').where('email', '==', email).get();
      if (!userSnap.empty) return res.status(400).json({ message: "Email already registered" });

      const hash = await bcrypt.hash(password, 12);
      
      // Create in Firebase Auth
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName
      });

      // Create profile in Firestore
      await db.collection('users').doc(userRecord.uid).set({
        email,
        displayName: displayName || email.split('@')[0],
        role: 'USER',
        passwordHash: hash,
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/session", authLimiter, async (req, res) => {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: "Token required" });

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await db.collection('sessions').add({
        uid,
        token: sessionToken,
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isActive: true,
        deviceInfo: req.headers['user-agent']
      });

      res.cookie('session_token', sessionToken, {
        httpOnly: true,
        secure: true,
        signed: true,
        sameSite: 'strict',
        maxAge: 10 * 60 * 1000
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/logout", sessionGuard, async (req: any, res) => {
     const token = req.signedCookies.session_token;
     const sessionSnap = await db.collection('sessions').where('token', '==', token).get();
     if (!sessionSnap.empty) {
        await sessionSnap.docs[0].ref.update({ isActive: false });
     }
     res.clearCookie('session_token');
     res.json({ success: true });
  });

  // --- ADMIN APIs ---

  app.post("/api/admin/set-role", sessionGuard, roleGuard(['SUPER_ADMIN']), async (req, res) => {
    const { targetUid, role } = req.body;
    if (!targetUid || !role) return res.status(400).json({ message: "Missing params" });
    
    await db.collection('users').doc(targetUid).update({ role });
    res.json({ success: true });
  });

  app.get("/api/admin/users", sessionGuard, roleGuard(['SUPER_ADMIN']), async (_req, res) => {
     const snap = await db.collection('users').orderBy('createdAt', 'desc').get();
     const users = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
     res.json(users);
  });

  // --- SCANNER APIs ---

  app.post("/api/scanner/validate", sessionGuard, roleGuard(['SUPER_ADMIN', 'TICKET_SCANNER', 'PUBLIC_RELATIONS']), async (req: any, res) => {
    const { ticketId } = req.body;
    const cleanId = ticketId.replace('ticket:', '');

    const ticketRef = db.collection('tickets').doc(cleanId);
    const ticketSnap = await ticketRef.get();

    if (!ticketSnap.exists) return res.status(404).json({ message: "Ticket not found" });

    const ticket = ticketSnap.data();
    if (ticket?.status === 'SCANNED') {
      const scanSnap = await db.collection('ticket_scanned').where('ticketId', '==', cleanId).orderBy('scannedAt', 'desc').limit(1).get();
      const lastScan = scanSnap.empty ? null : scanSnap.docs[0].data();
      return res.status(400).json({ 
        message: "Already scanned", 
        scannedAt: lastScan?.scannedAt.toDate().toLocaleString() 
      });
    }

    if (ticket?.status !== 'VALID') return res.status(400).json({ message: "Invalid ticket status" });

    await ticketRef.update({ status: 'SCANNED' });
    await db.collection('ticket_scanned').add({
      ticketId: cleanId,
      scannedAt: admin.firestore.FieldValue.serverTimestamp(),
      scannedBy: req.user.uid,
      eventId: ticket?.eventId,
      buyerEmail: ticket?.buyerEmail,
      deviceInfo: req.headers['user-agent']
    });

    res.json({ success: true, ticket });
  });

  // --- MEDIA APIs ---

  app.post("/api/media/upload", sessionGuard, roleGuard(['SUPER_ADMIN', 'CEO', 'PUBLIC_RELATIONS']), async (_req, res) => {
    // Cloudinary upload logic would go here
    // For demo/simulated flow:
    res.json({ url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800', publicId: 'dummy' });
  });

  // --- CHECKOUT API ---

  app.post("/api/cart/checkout", sessionGuard, async (req: any, res) => {
     const { userId } = req.body;
     const cartSnap = await db.collection('cart').doc(userId).get();
     if (!cartSnap.exists) return res.status(400).json({ message: "Cart not found" });
     
     const cart = cartSnap.data();
     const tickets = [];

     for (const item of cart?.items || []) {
        for (let i = 0; i < item.quantity; i++) {
           const ticketId = crypto.randomUUID();
           const ticket = {
              eventId: item.eventId,
              ticketType: item.ticketType,
              buyerEmail: req.user.email || 'customer@example.com', // get from user doc usually
              buyerId: userId,
              status: 'VALID',
              price: item.price,
              quantity: 1,
              ticketImageUrl: item.ticketImageUrl,
              createdAt: admin.firestore.FieldValue.serverTimestamp()
           };
           await db.collection('tickets').doc(ticketId).set(ticket);
           tickets.push({ id: ticketId, ...ticket });
        }
     }

     await db.collection('cart').doc(userId).delete();
     res.json({ success: true, tickets });
  });

  // Vite/Static
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const distPath = path.join(__dirname, 'dist');
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

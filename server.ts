import express, { type NextFunction, type Request, type Response } from "express";
import path from "path";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import multer from "multer";

/**
 * Dev server and optional API.
 *
 * The public site is a static build (GitHub Pages) that talks to Firebase directly,
 * so nothing here is required in production. When this server IS run, every
 * endpoint that changes anything verifies the caller's Firebase ID token and
 * looks up their role in Firestore. Nothing is trusted from the request body.
 */

const isProd = process.env.NODE_ENV === "production";
const PORT = Number(process.env.PORT) || 3000;

type Role = "SUPER_ADMIN" | "PRO" | "CEO" | "FINANCE_MANAGER" | "TICKET_SCANNER" | "USER";
interface AuthedRequest extends Request {
  user?: { uid: string; role: Role };
}

// ---------- Firebase Admin ----------

let databaseId: string | undefined;
let authDomain = "";
try {
  const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
  databaseId = firebaseConfig.firestoreDatabaseId;
  authDomain = firebaseConfig.authDomain || "";
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: firebaseConfig.projectId,
    });
  }
} catch (error) {
  console.error("[server] Firebase Admin could not start:", (error as Error).message);
}

const firestore = () => (databaseId ? getFirestore(databaseId) : getFirestore());

// ---------- Cloudinary ----------

const cloudinaryReady = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET,
);
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ---------- auth middleware ----------

/** Verifies the Firebase ID token and loads the caller's role. No token, no access. */
async function requireUser(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ message: "Sign in to continue." });
  if (!admin.apps.length) return res.status(503).json({ message: "Service unavailable." });

  try {
    const decoded = await admin.auth().verifyIdToken(token, true);
    const snap = await firestore().collection("users").doc(decoded.uid).get();
    const profile = snap.data();
    if (!snap.exists || !profile || profile.isActive === false) {
      return res.status(403).json({ message: "This account is not active." });
    }
    req.user = { uid: decoded.uid, role: profile.role as Role };
    next();
  } catch {
    res.status(401).json({ message: "Your session has expired. Sign in again." });
  }
}

const requireRole = (...allowed: Role[]) => (req: AuthedRequest, res: Response, next: NextFunction) => {
  if (!req.user || !allowed.includes(req.user.role)) {
    return res.status(403).json({ message: "You do not have permission to do that." });
  }
  next();
};

// ---------- uploads ----------

const UPLOAD_FOLDERS = ["events", "staff", "choir", "programs"];
const IMAGE_SIGNATURES: Array<{ mime: string; test: (b: Buffer) => boolean }> = [
  { mime: "image/jpeg", test: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", test: b => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/webp", test: b => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" },
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 5 },
  fileFilter: (_req, file, cb) => cb(null, IMAGE_SIGNATURES.some(s => s.mime === file.mimetype)),
});

async function startServer() {
  const app = express();
  app.set("trust proxy", 1);

  app.use(helmet({
    // Vite's dev server needs inline scripts, so the policy is production-only.
    contentSecurityPolicy: isProd ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://apis.google.com", "https://www.gstatic.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        mediaSrc: ["'self'", "blob:"],
        connectSrc: ["'self'", "https://*.googleapis.com", "https://api.cloudinary.com"],
        frameSrc: authDomain ? [`https://${authDomain}`] : ["'none'"],
        workerSrc: ["'self'", "blob:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    } : false,
    // Google sign-in opens a popup that must be able to talk back to this page.
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  }));

  // Cross-origin calls are refused unless the origin is listed in ALLOWED_ORIGINS.
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").map(o => o.trim()).filter(Boolean);
  app.use("/api/", cors({ origin: allowedOrigins.length ? allowedOrigins : false }));

  app.use(express.json({ limit: "100kb" }));

  app.use("/api/", rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many requests. Try again in a few minutes." },
  }));
  const writeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many requests. Try again in a few minutes." },
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post(
    "/api/media/upload",
    writeLimiter,
    requireUser,
    requireRole("SUPER_ADMIN", "CEO", "PRO", "FINANCE_MANAGER"),
    upload.single("file"),
    async (req: AuthedRequest, res: Response) => {
      try {
        const file = req.file;
        // Check the file's real bytes, not just the type the browser claimed.
        if (!file || !IMAGE_SIGNATURES.some(s => s.mime === file.mimetype && s.test(file.buffer))) {
          return res.status(400).json({ message: "Upload a JPEG, PNG or WebP image." });
        }
        if (!cloudinaryReady) return res.status(503).json({ message: "Image uploads are not configured." });

        const folder = UPLOAD_FOLDERS.includes(req.body.folder) ? req.body.folder : "events";
        const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
          cloudinary.uploader.upload_stream({ folder, resource_type: "image" }, (err, out) => {
            if (err || !out) reject(err || new Error("upload failed"));
            else resolve(out);
          }).end(file.buffer);
        });
        res.json({ url: result.secure_url, publicId: result.public_id });
      } catch (error) {
        console.error("[server] upload failed:", (error as Error).message);
        res.status(502).json({ message: "The image could not be uploaded." });
      }
    },
  );

  // Permanently removes an account (sign-in and profile). Super admins only.
  app.delete(
    "/api/users/:uid",
    writeLimiter,
    requireUser,
    requireRole("SUPER_ADMIN"),
    async (req: AuthedRequest, res: Response) => {
      const { uid } = req.params;
      if (!/^[A-Za-z0-9]{1,128}$/.test(uid)) return res.status(400).json({ message: "Invalid user." });
      if (uid === req.user!.uid) return res.status(400).json({ message: "You cannot delete your own account." });

      try {
        try {
          await admin.auth().deleteUser(uid);
        } catch (authError) {
          if ((authError as { code?: string }).code !== "auth/user-not-found") throw authError;
        }
        await firestore().collection("users").doc(uid).delete();
        console.info(`[server] user ${uid} deleted by ${req.user!.uid}`);
        res.json({ success: true });
      } catch (error) {
        console.error("[server] user delete failed:", (error as { code?: string }).code || (error as Error).message);
        res.status(500).json({ message: "The account could not be deleted." });
      }
    },
  );

  app.use("/api/", (_req, res) => res.status(404).json({ message: "Not found." }));

  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { index: false, maxAge: "1h" }));
    app.use("/assets", express.static(path.join(distPath, "assets"), { immutable: true, maxAge: "1y" }));
    app.get("*", (_req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Never send stack traces or internals to the client.
  app.use((err: Error & { status?: number; code?: string }, _req: Request, res: Response, _next: NextFunction) => {
    if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ message: "That file is larger than 10 MB." });
    console.error("[server] unhandled error:", err.message);
    res.status(err.status && err.status < 500 ? err.status : 500).json({ message: "Something went wrong." });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

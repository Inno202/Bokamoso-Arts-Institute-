import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import QRCode from "qrcode";
import crypto from "crypto";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add middleware to parse JSON bodies
  app.use(express.json());

  // Ticket APIs stub - we only generate QR code on backend to avoid leaking the QR logic, 
  // or we can just send back the UUID and let the client generate QR.
  // Actually, let's keep a simple stub that just generates the UUID and returns a QR code,
  // while the client handles the Firestore save.
  app.post("/api/tickets/generate-qr", async (req, res) => {
    try {
      const ticketId = crypto.randomUUID();
      const qrCodeDataUrl = await QRCode.toDataURL(`ticket:${ticketId}`);

      res.json({
        success: true,
        ticketId,
        qrCode: qrCodeDataUrl
      });
    } catch (error) {
      console.error("QR error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Derive __dirname for ES modules
    const __dirname = path.dirname(new URL(import.meta.url).pathname);
    const distPath = path.join(__dirname, 'dist');
    // Note: express v4
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

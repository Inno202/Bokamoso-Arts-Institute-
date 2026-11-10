import { AppError } from '../controllers/lib/utils';

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_EDGE = 1600;
// Without Cloudinary, images are stored inside the Firestore document itself,
// which is capped at 1 MB in total, so the fallback has to stay small.
const INLINE_MAX_EDGE = 800;
const INLINE_MAX_CHARS = 180_000;

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new AppError('That file could not be read as an image.')); };
    img.src = url;
  });
}

/** Re-encodes to JPEG at a bounded size. This also strips metadata such as GPS location. */
async function resize(file: Blob, maxEdge: number, quality: number): Promise<HTMLCanvasElement> {
  const img = await loadImage(file);
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new AppError('This browser could not process the image.');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  canvas.dataset.quality = String(quality);
  return canvas;
}

const toBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new AppError('This browser could not process the image.'))), 'image/jpeg', quality));

export const cloudinaryService = {
  /** True when uploads go to Cloudinary rather than being stored inline in Firestore. */
  isConfigured: Boolean(CLOUD_NAME && UPLOAD_PRESET),

  async upload(file: Blob, folder: string): Promise<{ url: string; publicId: string }> {
    if (file.type && !ALLOWED_TYPES.includes(file.type)) {
      throw new AppError('Please choose a JPEG, PNG or WebP image.');
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new AppError('That image is larger than 10 MB. Choose a smaller one.');
    }

    if (CLOUD_NAME && UPLOAD_PRESET) {
      const blob = await toBlob(await resize(file, MAX_EDGE, 0.85), 0.85);
      const body = new FormData();
      body.append('file', blob, 'upload.jpg');
      body.append('upload_preset', UPLOAD_PRESET);
      body.append('folder', folder.replace(/[^a-z0-9/_-]/gi, ''));
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body });
      if (!res.ok) throw new AppError('The image could not be uploaded. Please try again.');
      const data = await res.json();
      return { url: data.secure_url, publicId: data.public_id };
    }

    // Fallback: a compact data URL kept in the document.
    for (const quality of [0.8, 0.65, 0.5]) {
      const canvas = await resize(file, INLINE_MAX_EDGE, quality);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (dataUrl.length <= INLINE_MAX_CHARS) return { url: dataUrl, publicId: dataUrl };
    }
    const canvas = await resize(file, 480, 0.6);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
    return { url: dataUrl, publicId: dataUrl };
  },

  getOptimizedUrl(publicIdOrUrl: string | undefined | null, width = 800) {
    if (!publicIdOrUrl || typeof publicIdOrUrl !== 'string') return '';
    if (publicIdOrUrl.startsWith('data:image/')) return publicIdOrUrl;

    if (publicIdOrUrl.startsWith('https://')) {
      const isCloudinary = /^https:\/\/res\.cloudinary\.com\//.test(publicIdOrUrl);
      if (isCloudinary && publicIdOrUrl.includes('/upload/') && !/\/upload\/[a-z]_/.test(publicIdOrUrl)) {
        return publicIdOrUrl.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${width}/`);
      }
      return publicIdOrUrl;
    }

    // Anything else (http:, javascript:, relative paths) is only trusted as a Cloudinary id.
    if (!CLOUD_NAME || !/^[\w\-/.]+$/.test(publicIdOrUrl)) return '';
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,c_limit,w_${width}/${publicIdOrUrl}`;
  },
};

/** Rough size of a document once stored, to warn before Firestore's 1 MB limit rejects a save. */
export function approximateDocBytes(data: unknown) {
  return new Blob([JSON.stringify(data)]).size;
}
export const FIRESTORE_DOC_LIMIT = 1_000_000;

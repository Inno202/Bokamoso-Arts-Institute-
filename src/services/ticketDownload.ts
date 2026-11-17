/**
 * Builds a printable ticket as a PDF, entirely in the browser.
 *
 * Size: 210 x 95 mm, the width of an A4 page at the same proportions (about 2.2 : 1)
 * as the event tickets the institute's audience already knows (MojaTicket, Quicket).
 * Layout: the whole event photo or poster on the left (never cropped), event and ticket-holder details in the middle,
 * the QR code on a tear-off stub on the right.
 *
 * The ticket is drawn on a canvas at 300 dpi in the site's own fonts, then wrapped in
 * a one-page PDF. No PDF library is needed: a single JPEG image in a minimal PDF is
 * valid everywhere and keeps the download small.
 */
import QRCode from 'qrcode';

export interface PrintableTicket {
  id: string;
  eventName: string;
  /** e.g. "Sat, 30 Sep 2027" */
  dateText: string;
  /** e.g. "18:00" (may be empty) */
  timeText: string;
  venueText: string;
  ticketType: string;
  /** Already formatted in the ticket's currency, e.g. "R 150,00", or "Free". */
  priceText: string;
  holderName: string;
  holderEmail: string;
  /** e.g. "16 Nov 2026" (may be empty) */
  issuedText: string;
  /** Event photo; falls back to `fallbackImageUrl` if it cannot be used. */
  imageUrl: string;
  fallbackImageUrl: string;
  logoUrl: string;
}

const MM_W = 210;
const MM_H = 95;
const DPI = 300;
const PX_PER_MM = DPI / 25.4;
const W = Math.round(MM_W * PX_PER_MM); // 2480
const H = Math.round(MM_H * PX_PER_MM); // 1122
const mm = (v: number) => v * PX_PER_MM;

const INK = '#0B0B0C';
const INK_SOFT = '#55534E';
const ACCENT_DEEP = '#BE123C';
const SAND = '#F1EEE8';
const HAIRLINE = '#DDD8CF';
const SERIF = '"Cormorant Garamond", Georgia, serif';
const SANS = '"DM Sans", system-ui, sans-serif';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Images from other sites must allow cross-origin use, or the canvas could not be saved.
    // Without that permission the image simply fails to load and the fallback is used.
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Image failed: ${src.slice(0, 80)}`));
    img.src = src;
  });
}

async function firstImage(urls: string[]): Promise<HTMLImageElement | null> {
  for (const url of urls.filter(Boolean)) {
    try { return await loadImage(url); } catch { /* try the next one */ }
  }
  return null;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | [number, number, number, number]) {
  const [tl, tr, br, bl] = Array.isArray(r) ? r : [r, r, r, r];
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

/** Shortens text with an ellipsis so it fits `maxWidth`. */
function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let lo = 0, hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(text.slice(0, mid) + '…').width <= maxWidth) lo = mid; else hi = mid - 1;
  }
  return text.slice(0, lo).trimEnd() + '…';
}

/** Splits text into at most `maxLines` lines that fit `maxWidth`; the last line is shortened if needed. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const next = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(next).width <= maxWidth || !line) { line = next; continue; }
    lines.push(line);
    line = words[i];
    if (lines.length === maxLines - 1) { line = words.slice(i).join(' '); break; }
  }
  if (line) lines.push(line);
  return lines.slice(0, maxLines).map((l, i, all) => (i === all.length - 1 ? fit(ctx, l, maxWidth) : l));
}

async function ensureFonts() {
  if (!document.fonts?.load) return;
  await Promise.allSettled([
    document.fonts.load(`600 ${Math.round(mm(9))}px "Cormorant Garamond"`),
    document.fonts.load(`400 ${Math.round(mm(3))}px "DM Sans"`),
    document.fonts.load(`600 ${Math.round(mm(3))}px "DM Sans"`),
    document.fonts.load(`700 ${Math.round(mm(3))}px "DM Sans"`),
  ]);
}

/** Draws the ticket and returns the canvas (exported for previews and tests). */
export async function drawTicket(t: PrintableTicket): Promise<HTMLCanvasElement> {
  await ensureFonts();
  const [photo, logo, qrUrl] = await Promise.all([
    firstImage([t.imageUrl, t.fallbackImageUrl]),
    firstImage([t.logoUrl]),
    QRCode.toDataURL(t.id, { width: Math.round(mm(34)), margin: 1, errorCorrectionLevel: 'M' }),
  ]);
  const qr = await loadImage(qrUrl);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');
  ctx.textBaseline = 'alphabetic';

  // Paper, with a hairline edge to cut along.
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);
  const edge = mm(2.5), radius = mm(5);
  roundRect(ctx, edge, edge, W - edge * 2, H - edge * 2, radius);
  ctx.lineWidth = mm(0.25);
  ctx.strokeStyle = HAIRLINE;
  ctx.stroke();

  // ---- Left: the whole event photo or poster ----
  // Shown at its own proportions, as large as fits, never cropped or stretched: the
  // panel takes the image's shape and the details start right after it.
  const frameInset = mm(3);
  const photoX = edge + frameInset;
  const maxPhotoW = mm(80), maxPhotoH = H - (edge + frameInset) * 2;
  let photoW = mm(60), photoH = maxPhotoH;
  if (photo) {
    const scale = Math.min(maxPhotoW / photo.naturalWidth, maxPhotoH / photo.naturalHeight);
    photoW = photo.naturalWidth * scale;
    photoH = photo.naturalHeight * scale;
  }
  const photoY = (H - photoH) / 2;
  ctx.save();
  roundRect(ctx, photoX, photoY, photoW, photoH, mm(3));
  ctx.clip();
  ctx.fillStyle = SAND;
  ctx.fillRect(photoX, photoY, photoW, photoH);
  if (photo) ctx.drawImage(photo, photoX, photoY, photoW, photoH);
  ctx.restore();

  // ---- Stub divider: dashed tear-off line with notches ----
  const stubX = mm(165);
  ctx.save();
  ctx.setLineDash([mm(1.6), mm(1.4)]);
  ctx.lineWidth = mm(0.35);
  ctx.strokeStyle = HAIRLINE;
  ctx.beginPath();
  ctx.moveTo(stubX, edge + mm(4));
  ctx.lineTo(stubX, H - edge - mm(4));
  ctx.stroke();
  ctx.restore();
  for (const y of [edge, H - edge]) {
    ctx.beginPath();
    ctx.arc(stubX, y, mm(2.6), 0, Math.PI * 2);
    ctx.fillStyle = SAND;
    ctx.fill();
  }

  // ---- Middle: details ----
  const left = photoX + photoW + mm(7);
  const right = stubX - mm(6);
  const width = right - left;
  let y = edge + mm(9);

  // Brand line
  if (logo) ctx.drawImage(logo, left, y - mm(5), mm(6.5), mm(6.5));
  ctx.fillStyle = INK;
  ctx.font = `700 ${mm(2.6)}px ${SANS}`;
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${mm(0.35)}px`;
  ctx.fillText('BOKAMOSO ARTS INSTITUTE', left + (logo ? mm(8.5) : 0), y);
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';

  // Event name: the logo's serif, up to two lines.
  y += mm(11);
  ctx.font = `600 ${mm(8)}px ${SERIF}`;
  ctx.fillStyle = INK;
  for (const line of wrap(ctx, t.eventName, width, 2)) {
    ctx.fillText(line, left, y);
    y += mm(7.9);
  }

  // When and where
  y += mm(0.6);
  ctx.font = `600 ${mm(3.4)}px ${SANS}`;
  ctx.fillStyle = ACCENT_DEEP;
  ctx.fillText(fit(ctx, [t.dateText, t.timeText].filter(Boolean).join(' · '), width), left, y);
  y += mm(5);
  ctx.font = `400 ${mm(3.2)}px ${SANS}`;
  ctx.fillStyle = INK_SOFT;
  ctx.fillText(fit(ctx, t.venueText, width), left, y);

  // Details grid, anchored to the bottom so long titles never push it off the ticket.
  const gridTop = H - edge - mm(27);
  ctx.fillStyle = HAIRLINE;
  ctx.fillRect(left, gridTop - mm(4.5), width, mm(0.25));
  // The holder column is wider so a full email address fits.
  const col1W = width * 0.56 - mm(3);
  const col2 = left + width * 0.56;
  const col2W = width * 0.44;
  const cell = (label: string, value: string, x: number, top: number, w: number, sub?: string) => {
    ctx.font = `400 ${mm(2.5)}px ${SANS}`;
    ctx.fillStyle = INK_SOFT;
    ctx.fillText(label, x, top);
    ctx.font = `600 ${mm(3)}px ${SANS}`;
    ctx.fillStyle = INK;
    ctx.fillText(fit(ctx, value, w), x, top + mm(4.6));
    if (sub) {
      ctx.font = `400 ${mm(2.5)}px ${SANS}`;
      ctx.fillStyle = INK_SOFT;
      ctx.fillText(fit(ctx, sub, w), x, top + mm(8.6));
    }
  };
  cell('Ticket holder', t.holderName, left, gridTop, col1W, t.holderEmail);
  cell('Ticket', t.ticketType, col2, gridTop, col2W, t.priceText);
  const row2 = gridTop + mm(13.5);
  cell('Ticket reference', t.id, left, row2, col1W);
  if (t.issuedText) cell('Issued', t.issuedText, col2, row2, col2W);

  // ---- Right: QR stub ----
  const stubLeft = stubX + mm(4);
  const stubW = W - edge - mm(4) - stubLeft;
  const qrSize = Math.min(mm(34), stubW);
  const qrX = stubLeft + (stubW - qrSize) / 2;
  const qrY = edge + mm(8);
  ctx.imageSmoothingEnabled = false; // keep the code's squares crisp
  ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);
  ctx.imageSmoothingEnabled = true;
  ctx.textAlign = 'center';
  const mid = stubLeft + stubW / 2;
  ctx.font = `700 ${mm(3.1)}px ${SANS}`;
  ctx.fillStyle = INK;
  ctx.fillText(t.id, mid, qrY + qrSize + mm(6));
  ctx.font = `400 ${mm(2.5)}px ${SANS}`;
  ctx.fillStyle = INK_SOFT;
  ctx.fillText('Admits one person, once.', mid, qrY + qrSize + mm(10.5));
  ctx.fillText('Show this code at the door.', mid, qrY + qrSize + mm(14.2));
  ctx.textAlign = 'start';

  return canvas;
}

const encoder = new TextEncoder();

/** Wraps one JPEG in a single-page PDF of the ticket's size. */
export function jpegToPdf(jpeg: Uint8Array, pxW: number, pxH: number, title: string): Uint8Array {
  const ptW = (MM_W / 25.4 * 72).toFixed(2);
  const ptH = (MM_H / 25.4 * 72).toFixed(2);
  const safeTitle = title.replace(/[\\()]/g, '').replace(/[^\x20-\x7E]/g, '').slice(0, 120);
  const content = `q ${ptW} 0 0 ${ptH} 0 0 cm /Im0 Do Q`;
  const parts: (string | Uint8Array)[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (p: string | Uint8Array) => { parts.push(p); length += typeof p === 'string' ? encoder.encode(p).length : p.length; };
  const obj = (n: number, body: string | (string | Uint8Array)[]) => {
    offsets[n] = length;
    push(`${n} 0 obj\n`);
    (Array.isArray(body) ? body : [body]).forEach(push);
    push('\nendobj\n');
  };

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW} ${ptH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  obj(4, [`<< /Type /XObject /Subtype /Image /Width ${pxW} /Height ${pxH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`, jpeg, '\nendstream']);
  obj(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  obj(6, `<< /Title (${safeTitle}) /Producer (Bokamoso Arts Institute) >>`);

  const xref = length;
  push(`xref\n0 7\n0000000000 65535 f \n${offsets.slice(1).map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`);
  push(`trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const out = new Uint8Array(length);
  let at = 0;
  for (const p of parts) {
    const bytes = typeof p === 'string' ? encoder.encode(p) : p;
    out.set(bytes, at);
    at += bytes.length;
  }
  return out;
}

/** Builds the ticket PDF and returns it as a Blob. */
export async function ticketPdf(t: PrintableTicket): Promise<Blob> {
  const canvas = await drawTicket(t);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  if (!blob) throw new Error('The ticket image could not be created');
  const jpeg = new Uint8Array(await blob.arrayBuffer());
  return new Blob([jpegToPdf(jpeg, canvas.width, canvas.height, `${t.eventName} - ${t.id}`)], { type: 'application/pdf' });
}

/** Builds the PDF and starts the download. */
export async function downloadTicket(t: PrintableTicket) {
  const blob = await ticketPdf(t);
  const slug = t.eventName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'event';
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bokamoso-ticket-${slug}-${t.id}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

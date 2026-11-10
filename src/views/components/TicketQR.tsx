import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * Draws a ticket's QR code in the browser from its reference. Nothing is stored
 * or fetched: the code is just the reference, checked against the database at the door.
 */
export function TicketQR({ value, size = 320, className }: { value: string; size?: number; className?: string }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { width: size, margin: 1, errorCorrectionLevel: 'M' })
      .then(url => { if (!cancelled) setSrc(url); })
      .catch(() => { if (!cancelled) setSrc(''); });
    return () => { cancelled = true; };
  }, [value, size]);

  if (!src) return <div className={className} aria-hidden="true" />;
  return <img src={src} alt={`QR code for ticket ${value}`} className={className} />;
}

export const ticketQrDataUrl = (value: string, size = 640) =>
  QRCode.toDataURL(value, { width: size, margin: 2, errorCorrectionLevel: 'M' });

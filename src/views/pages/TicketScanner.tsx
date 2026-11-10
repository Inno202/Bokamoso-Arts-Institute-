import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle, XCircle, Keyboard, Calendar, Ticket as TicketIcon } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { ticketController } from '../../controllers/ticketController';
import { eventController } from '../../controllers/eventController';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { logger } from '../../services/loggerService';
import { formatDateTime, friendlyError } from '../../controllers/lib/utils';
import { Ticket } from '../../models/types';

type Result =
  | { kind: 'success'; ticket: Ticket; eventName: string; eventDate: string }
  | { kind: 'error'; message: string };

export default function TicketScanner() {
  const { user, userData } = useAuth();
  const [manualId, setManualId] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [checking, setChecking] = useState(false);
  const [showManual, setShowManual] = useState(false);
  // The camera reports the same code many times a second; these keep one check per code.
  const busy = useRef(false);
  const lastScan = useRef({ code: '', at: 0 });

  const verify = useCallback(async (code: string) => {
    if (!user || busy.current) return;
    const now = Date.now();
    if (code === lastScan.current.code && now - lastScan.current.at < 4000) return;
    lastScan.current = { code, at: now };

    busy.current = true;
    setChecking(true);
    try {
      const ticket = await ticketController.admit(code, user.uid);
      const event = await eventController.getEventById(ticket.eventId).catch(() => null);
      setResult({
        kind: 'success',
        ticket,
        eventName: event?.name || ticket.eventName || 'Event',
        eventDate: formatDateTime(event?.date),
      });
      navigator.vibrate?.(80);
    } catch (err) {
      logger.error('Ticket check failed', err);
      setResult({ kind: 'error', message: friendlyError(err, 'The ticket could not be checked. Check the connection and scan again.') });
      navigator.vibrate?.([60, 60, 60]);
    } finally {
      busy.current = false;
      setChecking(false);
    }
  }, [user]);

  useEffect(() => {
    if (showManual) return;
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
      false,
    );
    scanner.render((decoded) => { void verify(decoded); }, () => { /* frames without a code are normal */ });
    return () => {
      scanner.clear().catch(error => logger.error('Failed to stop the camera', error));
    };
  }, [showManual, verify]);

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId.trim()) return;
    lastScan.current = { code: '', at: 0 };
    void verify(manualId);
  };

  const modeButton = (active: boolean) =>
    `h-14 rounded-xl flex items-center justify-center gap-3 font-bold text-xs uppercase tracking-widest border-2 transition-colors ${
      active ? 'bg-white text-bai-black border-white' : 'border-white/30 text-white/80 hover:border-white/60'
    }`;

  return (
    <div className={`min-h-screen text-white p-4 flex flex-col transition-colors duration-300 ${
      result?.kind === 'success' ? 'bg-green-950' : result?.kind === 'error' ? 'bg-red-950' : 'bg-bai-black'
    }`}>
      <div className="max-w-lg mx-auto w-full flex-grow flex flex-col">
        <div className="pt-8 pb-6 text-center">
          <h1 className="font-display font-bold text-2xl uppercase tracking-tighter italic flex items-center justify-center gap-3">
            <TicketIcon size={22} className="text-bai-red-soft" aria-hidden="true" />
            Door scanner
          </h1>
          <p className="text-white/70 text-sm mt-2">Signed in as {userData?.displayName || user?.displayName || user?.email}</p>
        </div>

        <div className="mb-6 min-h-48" aria-live="assertive">
          {result?.kind === 'success' ? (
            <div className="bg-white text-bai-black rounded-3xl p-6 sm:p-8">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 bg-green-700 text-white rounded-2xl flex items-center justify-center shrink-0">
                  <CheckCircle size={32} aria-hidden="true" />
                </div>
                <div>
                  <p className="font-display font-bold text-2xl uppercase italic leading-none text-green-800">Admit</p>
                  <p className="num text-sm font-bold text-bai-black/70 mt-1">{result.ticket.id}</p>
                </div>
              </div>
              <p className="font-display font-bold text-xl uppercase tracking-tight leading-tight break-words">{result.eventName}</p>
              <dl className="mt-4 pt-4 border-t border-bai-black/10 space-y-2 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-bai-black/70">Ticket</dt><dd className="font-semibold text-right">{result.ticket.ticketType}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-bai-black/70">Booked by</dt><dd className="font-semibold text-right break-all">{result.ticket.buyerEmail || 'Unknown'}</dd></div>
                {result.eventDate && (
                  <div className="flex justify-between gap-4"><dt className="text-bai-black/70 flex items-center gap-2"><Calendar size={14} aria-hidden="true" />Event</dt><dd className="num font-semibold text-right">{result.eventDate}</dd></div>
                )}
              </dl>
            </div>
          ) : result?.kind === 'error' ? (
            <div className="bg-bai-red text-white rounded-3xl p-8 text-center">
              <XCircle size={56} className="mx-auto mb-4" aria-hidden="true" />
              <p className="font-display font-bold text-3xl uppercase italic mb-2">Do not admit</p>
              <p className="font-semibold">{result.message}</p>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center border-2 border-dashed border-white/25 rounded-3xl text-white/70">
              {checking ? 'Checking ticket' : 'Ready for the next ticket'}
            </div>
          )}
        </div>

        <div className="flex-grow flex flex-col items-center">
          {!showManual ? (
            <div className="w-full bg-white/5 rounded-3xl overflow-hidden" id="qr-reader" />
          ) : (
            <form onSubmit={submitManual} className="w-full bg-white/5 rounded-3xl p-6 sm:p-8 space-y-5">
              <div>
                <label htmlFor="manual-ticket" className="block text-sm font-bold text-white/80 mb-3">Ticket reference</label>
                <input
                  id="manual-ticket"
                  type="text"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  placeholder="BAI-XXXXXXXXXXXX"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  className="num w-full h-16 bg-white/10 border-2 border-white/30 text-white placeholder:text-white/50 rounded-xl px-5 focus:border-white font-mono text-lg uppercase"
                />
              </div>
              <button
                type="submit"
                disabled={checking || !manualId.trim()}
                className="w-full h-16 bg-white text-bai-black font-display font-bold uppercase tracking-widest rounded-xl hover:bg-bai-red hover:text-white transition-colors disabled:opacity-50"
              >
                {checking ? 'Checking' : 'Check ticket'}
              </button>
            </form>
          )}

          <div className="w-full grid grid-cols-2 gap-4 mt-6">
            <button onClick={() => { setShowManual(false); setResult(null); }} aria-pressed={!showManual} className={modeButton(!showManual)}>
              <Camera size={18} aria-hidden="true" />
              <span>Camera</span>
            </button>
            <button onClick={() => { setShowManual(true); setResult(null); }} aria-pressed={showManual} className={modeButton(showManual)}>
              <Keyboard size={18} aria-hidden="true" />
              <span>Type it in</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

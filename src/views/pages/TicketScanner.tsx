import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle, XCircle, Keyboard, Calendar, Ticket as TicketIcon, RefreshCw, WifiOff } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { EVENT_PASSED_AFTER_HOURS, ScanRefused, ticketController, type ScanRefusal } from '../../controllers/ticketController';
import { eventController } from '../../controllers/eventController';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { logger } from '../../services/loggerService';
import { formatDateTime, friendlyError, toDate } from '../../controllers/lib/utils';
import { BAIEvent, Ticket } from '../../models/types';

type Result =
  | { kind: 'success'; ticket: Ticket; eventName: string; eventDate: string }
  | { kind: 'error'; title: string; message: string };

const DOOR_EVENT_KEY = 'bai-door-event';
const REFUSAL_TITLE: Record<ScanRefusal, string> = {
  passed: 'Event has passed',
  'wrong-event': 'Wrong event',
  used: 'Already used',
  cancelled: 'Cancelled',
  unknown: 'Not a valid ticket',
};

type CameraState = { kind: 'starting' } | { kind: 'running' } | { kind: 'failed'; message: string };

/** A code still in view is ignored until it has been out of sight this long. */
const SAME_CODE_GAP_MS = 3000;
/** The green/red result clears by itself so the next person starts from "Ready". */
const RESULT_CLEARS_AFTER_MS = 8000;

function cameraProblem(err: unknown): string {
  const name = (err as { name?: string })?.name || '';
  const text = String((err as { message?: string })?.message || err || '');
  if (name === 'NotAllowedError' || /permission|denied|notallowed/i.test(text)) {
    return 'Camera access is blocked. Allow the camera for this site in the browser settings, then tap Try again.';
  }
  if (name === 'NotFoundError' || /not ?found|no camera|requested device/i.test(text)) {
    return 'No camera was found on this device. Use "Type it in" instead.';
  }
  if (name === 'NotReadableError' || /in use|could not start|notreadable/i.test(text)) {
    return 'The camera is being used by another app. Close it, then tap Try again.';
  }
  if (typeof window !== 'undefined' && !window.isSecureContext) return 'The camera only works over a secure (https) connection.';
  return 'The camera could not start. Tap Try again, or use "Type it in".';
}

export default function TicketScanner() {
  const { user, userData } = useAuth();
  const [manualId, setManualId] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [checking, setChecking] = useState(false);
  const [showManual, setShowManual] = useState(false);
  // The show being checked in tonight; tickets for any other event are refused.
  const [doorEvents, setDoorEvents] = useState<BAIEvent[] | null>(null);
  const [doorEventId, setDoorEventId] = useState<string>(() => { try { return localStorage.getItem(DOOR_EVENT_KEY) || ''; } catch { return ''; } });
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [camera, setCamera] = useState<CameraState>({ kind: 'starting' });
  const [cameraAttempt, setCameraAttempt] = useState(0);
  // The camera reports the same code many times a second; these keep one check per code.
  const busy = useRef(false);
  const lastSeen = useRef({ code: '', at: 0 });
  // Lets the running camera call the latest verify() without restarting when it changes.
  const verifyRef = useRef<(code: string) => void>(() => {});
  // Each camera start waits for the previous stop, so quick switches never collide.
  const cameraQueue = useRef<Promise<void>>(Promise.resolve());

  const verify = useCallback(async (raw: string) => {
    if (!user || busy.current) return; // the code being checked is re-marked as seen when the check ends
    const code = raw.trim();
    const now = Date.now();
    const repeat = code === lastSeen.current.code && now - lastSeen.current.at < SAME_CODE_GAP_MS;
    lastSeen.current = { code, at: now };
    if (repeat) return;

    busy.current = true;
    setChecking(true);
    try {
      if (!navigator.onLine) throw new ScanRefused('unknown', 'No connection. Tickets can only be checked online. Try again once the phone is back online.');
      const ticket = await ticketController.admit(code, user.uid, doorEventId || undefined);
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
      const kind: ScanRefusal | undefined = err instanceof ScanRefused ? err.kind : undefined;
      setResult({
        kind: 'error',
        title: !navigator.onLine ? 'No connection' : (kind && REFUSAL_TITLE[kind]) || 'Do not admit',
        message: friendlyError(err, 'The ticket could not be checked. Check the connection and scan again.'),
      });
      navigator.vibrate?.([60, 60, 60]);
    } finally {
      busy.current = false;
      setChecking(false);
      lastSeen.current = { code, at: Date.now() };
    }
  }, [user, doorEventId]);

  useEffect(() => { verifyRef.current = (code) => { void verify(code); }; }, [verify]);

  // Events still to happen (or started within the last few hours), soonest first.
  useEffect(() => eventController.subscribeToEvents((events) => {
    const cutoff = Date.now() - EVENT_PASSED_AFTER_HOURS * 3_600_000;
    const current = events
      .filter(ev => ev.status !== 'Draft' && (toDate(ev.date)?.getTime() ?? 0) > cutoff)
      .sort((a, b) => (toDate(a.date)?.getTime() ?? 0) - (toDate(b.date)?.getTime() ?? 0));
    setDoorEvents(current);
    setDoorEventId(id => (current.some(ev => ev.id === id) ? id : current[0]?.id || ''));
  }, false, () => setDoorEvents([])), []);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  // Bring each new result on screen: on a phone it sits above the camera or the keypad.
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!result) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    resultRef.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [result]);

  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => setResult(null), RESULT_CLEARS_AFTER_MS);
    return () => clearTimeout(timer);
  }, [result]);

  // The camera depends only on the mode (and Try again), never on sign-in refreshes.
  useEffect(() => {
    if (showManual) return;
    let cancelled = false;
    let scanner: Html5Qrcode | null = null;
    setCamera({ kind: 'starting' });

    const started = cameraQueue.current.then(async () => {
      if (cancelled) return;
      scanner = new Html5Qrcode('qr-reader', { verbose: false, formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] });
      try {
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 12,
            qrbox: (w, h) => { const side = Math.max(160, Math.floor(Math.min(w, h) * 0.7)); return { width: side, height: side }; },
            aspectRatio: 1,
          },
          (decoded) => verifyRef.current(decoded),
          () => { /* frames without a code are normal */ },
        );
        if (!cancelled) setCamera({ kind: 'running' });
      } catch (err) {
        logger.error('The camera could not start', err);
        if (!cancelled) setCamera({ kind: 'failed', message: cameraProblem(err) });
      }
    });

    // Stop the camera while the screen is off or another tab is in front.
    const onVisibility = () => {
      if (!scanner?.isScanning) return;
      try {
        if (document.hidden) scanner.pause(true);
        else scanner.resume();
      } catch { /* already in that state */ }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      // Grab the camera stream now, before anything is removed from the page.
      const stopStream = () => {
        const video = document.querySelector<HTMLVideoElement>('#qr-reader video');
        (video?.srcObject as MediaStream | null)?.getTracks().forEach(track => track.stop());
      };
      cameraQueue.current = started.then(async () => {
        if (!scanner) return;
        try {
          if (scanner.isScanning) await scanner.stop();
        } catch (err) {
          logger.error('Failed to stop the camera', err);
        }
        // Belt and braces: make sure no camera is left switched on.
        stopStream();
        try { scanner.clear(); } catch { /* already cleared */ }
      });
    };
  }, [showManual, cameraAttempt]);

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId.trim()) return;
    lastSeen.current = { code: '', at: 0 };
    void verify(manualId);
  };

  const modeButton = (active: boolean) =>
    `h-14 rounded-lg flex items-center justify-center gap-3 font-semibold border-2 transition-colors ${
      active ? 'bg-white text-bai-black border-white' : 'border-white/30 text-white/80 hover:border-white/60'
    }`;

  return (
    <div className={`min-h-screen text-white p-4 flex flex-col transition-colors duration-300 ${
      result?.kind === 'success' ? 'bg-green-950' : result?.kind === 'error' ? 'bg-red-950' : 'bg-bai-black'
    }`}>
      <div className="max-w-lg mx-auto w-full flex-grow flex flex-col">
        <div className="pt-8 pb-6 text-center">
          <h1 className="display text-2xl flex items-center justify-center gap-3">
            <TicketIcon size={22} className="text-bai-red-soft" aria-hidden="true" />
            Door scanner
          </h1>
          <p className="text-white/70 text-sm mt-2">Signed in as {userData?.displayName || user?.displayName || user?.email}</p>
        </div>

        {!online && (
          <p className="mb-4 p-4 rounded-2xl bg-amber-400 text-bai-black font-semibold flex items-center gap-3" role="alert">
            <WifiOff size={20} className="shrink-0" aria-hidden="true" />
            No connection. Tickets cannot be checked until the phone is back online.
          </p>
        )}

        <div className="mb-5">
          <label htmlFor="door-event" className="block text-sm font-bold text-white/80 mb-2">Event at the door</label>
          {doorEvents === null ? (
            <div className="h-12 rounded-lg bg-white/10 animate-pulse" role="status" aria-label="Loading events" />
          ) : doorEvents.length === 0 ? (
            <p className="text-white/75 text-sm">No upcoming events. Tickets are still checked, but not matched to a show.</p>
          ) : (
            <select
              id="door-event"
              value={doorEventId}
              onChange={(e) => { setDoorEventId(e.target.value); setResult(null); try { localStorage.setItem(DOOR_EVENT_KEY, e.target.value); } catch { /* not remembered */ } }}
              className="w-full min-h-[48px] rounded-lg bg-white/10 border-2 border-white/30 text-white px-3 font-semibold focus:border-white"
            >
              {doorEvents.map(ev => (
                <option key={ev.id} value={ev.id} className="text-bai-black">{ev.name}{formatDateTime(ev.date) ? ` · ${formatDateTime(ev.date)}` : ''}</option>
              ))}
            </select>
          )}
        </div>

        <div ref={resultRef} className="relative mb-6 min-h-[17.5rem] flex flex-col scroll-mt-24" aria-live="assertive">
          {result?.kind === 'success' ? (
            <div className="flex-grow bg-white text-bai-black rounded-2xl p-6 sm:p-8">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 bg-green-700 text-white rounded-2xl flex items-center justify-center shrink-0">
                  <CheckCircle size={32} aria-hidden="true" />
                </div>
                <div>
                  <p className="font-display font-bold text-2xl leading-none text-green-800">Admit</p>
                  <p className="num text-sm font-bold text-bai-black/70 mt-1">{result.ticket.id}</p>
                </div>
              </div>
              <p className="font-display font-bold text-xl leading-tight break-words">{result.eventName}</p>
              <dl className="mt-4 pt-4 border-t border-bai-black/10 space-y-2 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-bai-black/70">Ticket</dt><dd className="font-semibold text-right">{result.ticket.ticketType}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-bai-black/70">Booked by</dt><dd className="font-semibold text-right break-all">{result.ticket.buyerEmail || 'Unknown'}</dd></div>
                {result.eventDate && (
                  <div className="flex justify-between gap-4"><dt className="text-bai-black/70 flex items-center gap-2"><Calendar size={14} aria-hidden="true" />Event</dt><dd className="num font-semibold text-right">{result.eventDate}</dd></div>
                )}
              </dl>
            </div>
          ) : result?.kind === 'error' ? (
            <div className="flex-grow bg-bai-red text-white rounded-2xl p-8 text-center flex flex-col items-center justify-center">
              <XCircle size={56} className="mx-auto mb-4" aria-hidden="true" />
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-white/85">Do not admit</p>
              <p className="font-display font-bold text-3xl mt-1 mb-2">{result.title}</p>
              <p className="font-semibold break-words">{result.message}</p>
            </div>
          ) : (
            <div className="flex-grow flex items-center justify-center border-2 border-dashed border-white/25 rounded-2xl text-white/70 text-lg">
              {checking ? 'Checking ticket' : 'Ready for the next ticket'}
            </div>
          )}
          {checking && result && (
            <div className="absolute inset-0 rounded-2xl bg-bai-black/80 flex items-center justify-center text-lg font-semibold" role="status">Checking ticket</div>
          )}
        </div>

        <div className="flex-grow flex flex-col items-center">
          {/* The camera box stays on the page in both modes (hidden while typing),
              so the camera can always be switched off cleanly. */}
          <div className="w-full" hidden={showManual}>
              <div className="relative w-full aspect-square max-w-md mx-auto bg-white/5 rounded-2xl overflow-hidden">
                <div id="qr-reader" className="w-full h-full" />
                {camera.kind !== 'running' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center" role={camera.kind === 'failed' ? 'alert' : 'status'}>
                    {camera.kind === 'starting' ? (
                      <>
                        <span className="w-10 h-10 border-4 border-white/70 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                        <p className="text-white/80">Starting the camera</p>
                      </>
                    ) : (
                      <>
                        <Camera size={36} className="text-white/60" aria-hidden="true" />
                        <p className="text-white/90 max-w-xs">{camera.message}</p>
                        <button type="button" onClick={() => setCameraAttempt(n => n + 1)} className="btn btn-light">
                          <RefreshCw size={18} aria-hidden="true" />
                          <span>Try again</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          {showManual && (
            <form onSubmit={submitManual} className="w-full bg-white/5 rounded-2xl p-6 sm:p-8 space-y-5">
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
                  className="num w-full h-16 bg-white/10 border-2 border-white/30 text-white placeholder:text-white/50 rounded-lg px-5 focus:border-white font-mono text-lg"
                />
              </div>
              <button
                type="submit"
                disabled={checking || !manualId.trim()}
                className="btn btn-lg btn-light btn-block"
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

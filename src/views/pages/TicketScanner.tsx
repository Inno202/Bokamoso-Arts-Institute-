import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Check, ChevronDown, Keyboard, Calendar, WifiOff, X } from 'lucide-react';
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
/** How long the green and red results stay up before sliding away. Refusals stay longer so they can be read. */
const SUCCESS_SHOWS_MS = 3000;
const REFUSAL_SHOWS_MS = 5000;
const SHEET_EXIT_MS = 220;
/** The scan frame's side as a share of the camera area's shorter side (matches .scan-frame in index.css). */
const FRAME_SHARE = 0.7;

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
  const { user } = useAuth();
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

  // Each result shows briefly, then slides away by itself (tap to dismiss sooner).
  const [leaving, setLeaving] = useState(false);
  const dismiss = useCallback(() => setLeaving(true), []);
  useEffect(() => {
    if (!result) return;
    setLeaving(false);
    const timer = setTimeout(() => setLeaving(true), result.kind === 'success' ? SUCCESS_SHOWS_MS : REFUSAL_SHOWS_MS);
    return () => clearTimeout(timer);
  }, [result]);
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => { setResult(null); setLeaving(false); }, SHEET_EXIT_MS);
    return () => clearTimeout(timer);
  }, [leaving]);

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
            // The code is read inside the same square the scan frame draws on screen.
            qrbox: (w, h) => { const side = Math.max(160, Math.floor(Math.min(w, h) * FRAME_SHARE)); return { width: side, height: side }; },
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

  const switchMode = () => {
    setShowManual(m => !m);
    setResult(null);
  };

  const tone = result?.kind === 'success' ? 'admit' : result?.kind === 'error' ? 'refuse' : checking ? 'checking' : 'idle';

  return (
    // Exactly one screen below the site header: nothing on this page scrolls.
    <div className="scanner-screen bg-bai-black text-white flex flex-col overflow-hidden">
      <h1 className="sr-only">Door scanner</h1>

      <div className="shrink-0 w-full max-w-[480px] mx-auto px-4 pt-3 pb-3 flex items-center gap-2">
        <div className="relative flex-grow min-w-0">
          <label htmlFor="door-event" className="sr-only">Event at the door</label>
          {doorEvents === null ? (
            <div className="h-[48px] rounded-full bg-white/10 animate-pulse" role="status" aria-label="Loading events" />
          ) : doorEvents.length === 0 ? (
            <p className="h-[48px] rounded-full bg-white/10 px-4 flex items-center gap-2 text-sm text-white/80">
              <Calendar size={16} className="shrink-0" aria-hidden="true" />
              <span className="truncate">No upcoming events. Tickets are not matched to a show.</span>
            </p>
          ) : (
            <>
              <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none" aria-hidden="true" />
              <select
                id="door-event"
                value={doorEventId}
                onChange={(e) => { setDoorEventId(e.target.value); setResult(null); try { localStorage.setItem(DOOR_EVENT_KEY, e.target.value); } catch { /* not remembered */ } }}
                className="w-full h-[48px] appearance-none rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-white pl-10 pr-10 text-sm font-semibold truncate focus:border-white transition-colors"
              >
                {doorEvents.map(ev => (
                  <option key={ev.id} value={ev.id} className="text-bai-black">{ev.name}{formatDateTime(ev.date) ? ` · ${formatDateTime(ev.date)}` : ''}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none" aria-hidden="true" />
            </>
          )}
        </div>
        <button
          type="button"
          onClick={switchMode}
          aria-label={showManual ? 'Scan with the camera' : 'Type the ticket reference'}
          title={showManual ? 'Scan with the camera' : 'Type the ticket reference'}
          className="shrink-0 w-[48px] h-[48px] rounded-full bg-white/10 hover:bg-white/15 border border-white/15 flex items-center justify-center transition-colors"
        >
          {showManual ? <Camera size={20} aria-hidden="true" /> : <Keyboard size={20} aria-hidden="true" />}
        </button>
      </div>

      <div className="scanner-body flex-grow min-h-0 w-full max-w-[480px] mx-auto px-4 pb-4 flex flex-col items-center gap-4">
        <div className="scanner-stage relative shrink-0 aspect-square rounded-3xl overflow-hidden bg-white/[0.04]" data-tone={tone}>
          {/* The camera box stays on the page in both modes (hidden while typing),
              so the camera can always be switched off cleanly. */}
          <div className="absolute inset-0" hidden={showManual}>
            <div id="qr-reader" className="w-full h-full" />
            {camera.kind === 'running' && (
              <div className="scan-frame" aria-hidden="true"><span /><span /><span /><span /></div>
            )}
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
                      Try again
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {showManual && (
            <form onSubmit={submitManual} className="absolute inset-0 flex flex-col justify-center gap-4 p-6 sm:p-8">
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
                  className="num w-full h-14 bg-white/10 border-2 border-white/25 text-white placeholder:text-white/45 rounded-2xl px-5 focus:border-white font-mono text-lg"
                />
              </div>
              <button type="submit" disabled={checking || !manualId.trim()} className="btn btn-lg btn-light btn-block">
                {checking ? 'Checking' : 'Check ticket'}
              </button>
            </form>
          )}

          {!online && (
            <p className="absolute top-3 inset-x-3 mx-auto w-fit max-w-[calc(100%-1.5rem)] px-4 py-2 rounded-full bg-amber-400 text-bai-black text-sm font-semibold flex items-center gap-2 shadow-lg" role="alert">
              <WifiOff size={16} className="shrink-0" aria-hidden="true" />
              No connection. Tickets cannot be checked until the phone is back online.
            </p>
          )}

        </div>

        {/* Under the camera: what to do next, and the result card that rises in, then slides away by itself. */}
        <div className="relative w-full flex-grow min-h-0">
          {!result && (checking || showManual || camera.kind === 'running') && (
            <p className="absolute inset-0 flex items-center justify-center text-center text-white/70" role={checking ? 'status' : undefined}>
              {checking ? 'Checking ticket' : showManual ? 'Type the reference printed under the QR code' : 'Hold the QR code inside the frame'}
            </p>
          )}
          <div className="absolute inset-x-0 bottom-0" aria-live="assertive">
            {result && (
              <div
                onClick={dismiss}
                className={`result-sheet w-full text-left cursor-pointer rounded-2xl overflow-hidden shadow-[0_20px_40px_-12px_rgb(0_0_0/0.6)] ${leaving ? 'is-leaving' : ''} ${
                  result.kind === 'success' ? 'bg-white text-bai-black' : 'bg-bai-red-deep text-white'
                }`}
              >
                <span className="flex items-start gap-4 p-4 sm:p-5">
                  <span className={`result-badge shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${result.kind === 'success' ? 'bg-green-700 text-white' : 'bg-white text-bai-red-deep'}`}>
                    {result.kind === 'success' ? <Check size={26} strokeWidth={3} aria-hidden="true" /> : <X size={26} strokeWidth={3} aria-hidden="true" />}
                  </span>
                  {result.kind === 'success' ? (
                    <span className="min-w-0 flex-grow">
                      <span className="block font-display font-bold text-2xl leading-none text-green-800">Admit</span>
                      <span className="block font-semibold mt-1.5 truncate">{result.ticket.ticketType} · {result.eventName}</span>
                      <span className="block text-sm text-bai-black/70 truncate">{result.ticket.buyerEmail || 'Unknown'}</span>
                      <span className="num block text-xs text-bai-black/60 mt-0.5">{result.ticket.id}</span>
                    </span>
                  ) : (
                    <span className="min-w-0 flex-grow">
                      <span className="block text-xs font-bold uppercase tracking-[0.14em] text-white/85">Do not admit</span>
                      <span className="block font-display font-bold text-2xl leading-tight mt-0.5">{result.title}</span>
                      <span className="block text-sm font-semibold text-white/90 mt-1 break-words">{result.message}</span>
                    </span>
                  )}
                </span>
                <span
                  className={`result-timer block h-1 ${result.kind === 'success' ? 'bg-green-700/80' : 'bg-white/60'}`}
                  style={{ animationDuration: `${result.kind === 'success' ? SUCCESS_SHOWS_MS : REFUSAL_SHOWS_MS}ms` }}
                  aria-hidden="true"
                />
              </div>
            )}
          </div>

          {checking && result && (
            <div className="absolute inset-x-0 bottom-0 h-full max-h-40 rounded-2xl bg-bai-black/80 flex items-center justify-center text-lg font-semibold" role="status">Checking ticket</div>
          )}
        </div>
      </div>
    </div>
  );
}

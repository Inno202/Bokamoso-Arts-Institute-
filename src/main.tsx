import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { seedContent, SEED_ELEMENT_ID } from './content/store';
import { seedUpcoming } from './content/upcoming';
import { seedEvent } from './content/eventSeed';
import './index.css';
import { checkBotCheck, errorLog } from './controllers/errorLogController';
import { captureInstallOffer } from './services/installApp';

const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

// Clickjacking guard. A hostile page could load this site invisibly inside a frame
// and trick a signed-in person into clicking things. GitHub Pages cannot send the
// header that forbids framing, so the app itself refuses to start when framed.
// (Only in the published build, so previews that show the app in a frame keep working.)
const framed = import.meta.env.PROD && import.meta.env.VITE_ALLOW_FRAMING !== 'true' && (() => {
  try { return window.top !== window.self; } catch { return true; }
})();

// Links from the old site used "#/events"-style addresses. Send them to the real page.
if (window.location.hash.startsWith('#/')) {
  window.history.replaceState(null, '', `${basename}${window.location.hash.slice(1)}`);
}

function Root() {
  return (
    <StrictMode>
      <App router={({ children }) => <BrowserRouter basename={basename}>{children}</BrowserRouter>} />
    </StrictMode>
  );
}

// Keeps a copy of the site on the phone so tickets open without a signal at the door.
function registerOfflineCopy() {
  const allowed = import.meta.env.PROD || import.meta.env.MODE === 'emulator';
  if (!allowed || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL, updateViaCache: 'none' })
      .then((registration) => {
        // Check for a newer release whenever the site comes back into view (phones keep tabs for days).
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') registration.update().catch(() => undefined);
        });
      })
      .catch(() => undefined);
  });
}

// Problems no screen caught (a failed background task, a script error) go to the error log.
// Noise from browser extensions, other sites' scripts and resizing is ignored.
function reportUncaught() {
  const ignore = (text: string, file = '') => /ResizeObserver|Script error|extension:\/\/|Load failed|NetworkError|AbortError/i.test(text) || (file !== '' && !file.startsWith(location.origin));
  window.addEventListener('error', (e) => {
    if (!ignore(String(e.message || ''), e.filename || '')) errorLog.report('page', e.error || { name: 'Error', message: e.message });
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason as { message?: string; code?: string } | undefined;
    const text = String(r?.message || r || '');
    if (!ignore(text) && !/dynamically imported module|Importing a module script/i.test(text)) errorLog.report('page', r || { name: 'Error', message: text });
  });
  // Is the bot check passing on this device? If not, record Firebase's reason once per visit.
  window.addEventListener('load', () => {
    setTimeout(() => {
      void checkBotCheck().then(status => {
        if (status.state === 'failing') errorLog.report('botcheck', { code: 'appcheck', message: status.reason });
      });
    }, 4000);
  });
}

if (framed) {
  document.body.textContent = 'For your security, Bokamoso Arts Institute does not open inside another website. Open it in its own tab.';
} else {
  registerOfflineCopy();
  captureInstallOffer();
  reportUncaught();
  const root = document.getElementById('root')!;
  // Pages pre-rendered at build time carry the content they were built with;
  // start from exactly that so the first render matches the HTML, then go live.
  const seed = document.getElementById(SEED_ELEMENT_ID)?.textContent;
  if (seed) {
    try {
      const parsed = JSON.parse(seed);
      seedContent(parsed);
      seedUpcoming(parsed.upcomingEvents);
      if (parsed.event) seedEvent(parsed.event);
    } catch { /* fall back to built-in defaults */ }
  }
  // Hydrate only when this HTML was pre-rendered for this very address.
  const path = window.location.pathname.slice(basename.length).replace(/\/$/, '') || '/';
  if (root.hasChildNodes() && root.dataset.route === path) {
    hydrateRoot(root, <Root />);
  } else {
    root.textContent = '';
    createRoot(root).render(<Root />);
  }
}

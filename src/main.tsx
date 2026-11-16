import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { seedContent, SEED_ELEMENT_ID } from './content/store';
import { seedUpcoming } from './content/upcoming';
import './index.css';

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

if (framed) {
  document.body.textContent = 'For your security, Bokamoso Arts Institute does not open inside another website. Open it in its own tab.';
} else {
  const root = document.getElementById('root')!;
  // Pages pre-rendered at build time carry the content they were built with;
  // start from exactly that so the first render matches the HTML, then go live.
  const seed = document.getElementById(SEED_ELEMENT_ID)?.textContent;
  if (seed) {
    try {
      const parsed = JSON.parse(seed);
      seedContent(parsed);
      seedUpcoming(parsed.upcomingEvents);
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

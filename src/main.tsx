import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Clickjacking guard. A hostile page could load this site invisibly inside a frame
// and trick a signed-in person into clicking things. GitHub Pages cannot send the
// header that forbids framing, so the app itself refuses to start when framed.
// (Only in the published build, so previews that show the app in a frame keep working.)
const framed = import.meta.env.PROD && import.meta.env.VITE_ALLOW_FRAMING !== 'true' && (() => {
  try { return window.top !== window.self; } catch { return true; }
})();

if (framed) {
  document.body.textContent = 'For your security, Bokamoso Arts Institute does not open inside another website. Open it in its own tab.';
} else createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

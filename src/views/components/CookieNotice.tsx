import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '../../controllers/navigation';

export const COOKIE_NOTICE_KEY = 'bai-cookie-notice';

/**
 * A one-time NOTICE, not a consent choice: the site only stores what it needs to work
 * (sign-in, the bag, a few preferences) and has no advertising or analytics. Google's bot
 * check and Google sign-in set their own cookies for security.
 *
 * If anything optional is ever added (analytics, advertising, social embeds that track),
 * this must become a real opt-in: nothing optional loads until the visitor agrees, with
 * an equally easy way to refuse. Update the Cookie policy in the same change.
 *
 * Rendered only in the browser (never in the pre-rendered HTML), so it causes no layout shift.
 * It floats over the bottom of the screen until OK is pressed; meanwhile the page gets extra
 * space at the bottom (--notice-space), so everything can still be scrolled clear of it.
 */
export function CookieNotice() {
  const [pending, setPending] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // The door scanner is one full screen: the notice waits for any other page.
  const onScanner = useLocation().pathname === ROUTES.SCANNER;
  const show = pending && !onScanner;

  useEffect(() => {
    try { setPending(localStorage.getItem(COOKIE_NOTICE_KEY) !== 'ok'); } catch { setPending(true); }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (!show || !ref.current) { root.style.removeProperty('--notice-space'); return; }
    const el = ref.current;
    const measure = () => root.style.setProperty('--notice-space', `${el.offsetHeight}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => { observer.disconnect(); root.style.removeProperty('--notice-space'); };
  }, [show]);

  if (!show) return null;

  const close = () => {
    try { localStorage.setItem(COOKIE_NOTICE_KEY, 'ok'); } catch { /* shown again next visit */ }
    setPending(false);
  };

  return (
    <div ref={ref} role="region" aria-label="Cookies" className="cookie-notice no-print fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4 pointer-events-none">
      <div className="pointer-events-auto max-w-3xl mx-auto bg-bai-black text-white rounded-3xl shadow-[0_18px_50px_-20px_rgb(0_0_0/0.6)] py-3 pl-5 pr-3 sm:p-4 sm:pl-6 flex items-center gap-3 sm:gap-5">
        <p className="text-sm leading-snug flex-grow min-w-0">
          We only store what the site needs to work, like your sign-in and bag. No advertising or tracking.{' '}
          <Link to={ROUTES.COOKIES} className="font-semibold underline underline-offset-2 hover:text-bai-red whitespace-nowrap">Cookie policy</Link>
        </p>
        <button type="button" onClick={close} className="btn btn-light shrink-0 px-5 sm:min-w-[7rem]">OK</button>
      </div>
    </div>
  );
}

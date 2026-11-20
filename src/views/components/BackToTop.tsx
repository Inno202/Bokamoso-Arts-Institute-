import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import { ROUTES } from '../../controllers/navigation';

/** Pages that have their own bar at the bottom of the screen (or never scroll). */
const HIDDEN_ON = [ROUTES.SCANNER, ROUTES.ADMIN_CONTENT];

/** A small round button that appears once the visitor has scrolled down, and takes them back to the top. */
export function BackToTop() {
  const { pathname } = useLocation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 0.9);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  if (HIDDEN_ON.some(path => pathname === path || pathname.startsWith(`${path}/`))) return null;

  const toTop = () => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    document.getElementById('main')?.focus({ preventScroll: true });
  };

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Back to top"
      title="Back to top"
      tabIndex={show ? 0 : -1}
      aria-hidden={!show}
      className={`back-to-top no-print fixed right-4 bottom-4 sm:right-6 sm:bottom-6 z-40 w-[44px] h-[44px] rounded-full bg-bai-black text-white border border-white/40 flex items-center justify-center shadow-[0_8px_24px_-8px_rgb(0_0_0/0.5)] hover:bg-bai-red ${show ? 'is-shown' : ''}`}
    >
      <ArrowUp size={20} aria-hidden="true" />
    </button>
  );
}

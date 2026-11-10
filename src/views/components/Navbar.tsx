import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ROUTES } from '../../controllers/navigation';
import { useAuth } from './AuthProvider';
import { authController } from '../../controllers/authController';
import { useCart } from '../../hooks/useCart';
import { isAnyAdmin, isScanner } from '../../models/types';
import { toast } from '../../services/toast';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, role } = useAuth();
  const { totalItems } = useCart();

  const navLinks = [
    { name: 'Home', path: ROUTES.HOME },
    { name: 'About Us', path: ROUTES.ABOUT },
    { name: 'Our Work', path: ROUTES.PROGRAMS },
    { name: 'Events', path: ROUTES.EVENTS },
    { name: 'Traditions', path: ROUTES.TRADITIONS },
    { name: 'Donate', path: ROUTES.DONATE },
  ];

  if (user) {
    navLinks.push({ name: 'My Tickets', path: ROUTES.MY_TICKETS });
    if (isAnyAdmin(role)) navLinks.push({ name: 'Dashboard', path: ROUTES.DASHBOARD });
    if (isScanner(role)) navLinks.push({ name: 'Scanner', path: ROUTES.SCANNER });
  }

  // The menu closes whenever the page changes, and on Escape.
  useEffect(() => { setIsOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const handleSignOut = async () => {
    try {
      await authController.logout();
      toast.info('You are signed out.');
    } catch {
      toast.error('Could not sign you out. Check your connection and try again.');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-bai-bone/90 backdrop-blur-md border-b border-bai-black/10">
      <nav aria-label="Main" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center gap-4">
          <Link to={ROUTES.HOME} className="flex items-center gap-3 group shrink-0" aria-label="Bokamoso Arts Institute, home">
            <span className="relative w-12 h-12 flex items-center justify-center" aria-hidden="true">
              <span className="absolute inset-0 piano-key-pattern rounded-full opacity-20" />
              <span className="relative w-9 h-9 bg-bai-black flex items-center justify-center rounded-full border-2 border-white transition-transform duration-300 group-hover:scale-110">
                <span className="text-white font-display font-bold text-[11px]">BAI</span>
              </span>
            </span>
            <span className="hidden sm:flex flex-col">
              <span className="font-display font-bold text-base leading-tight tracking-tight">BOKAMOSO</span>
              <span className="text-[11px] uppercase tracking-[0.18em] font-semibold text-bai-red">Arts Institute</span>
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-x-5 xl:gap-x-7">
            {navLinks.map((link) => {
              const active = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  aria-current={active ? 'page' : undefined}
                  className={`font-display text-xs font-bold uppercase tracking-[0.14em] py-2 border-b-2 transition-colors hover:text-bai-red ${
                    active ? 'text-bai-red border-bai-red' : 'text-bai-black border-transparent'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-1 sm:gap-3">
            {user && (
              <Link
                to={ROUTES.CART}
                aria-label={totalItems > 0 ? `Your bag, ${totalItems} ${totalItems === 1 ? 'ticket' : 'tickets'}` : 'Your bag, empty'}
                className="relative w-11 h-11 flex items-center justify-center text-bai-black hover:text-bai-red transition-colors rounded-full"
              >
                <ShoppingCart size={20} strokeWidth={1.75} aria-hidden="true" />
                {totalItems > 0 && (
                  <span className="num absolute top-0.5 right-0 min-w-5 h-5 px-1 bg-bai-red text-white text-[11px] font-bold flex items-center justify-center rounded-full" aria-hidden="true">
                    {totalItems}
                  </span>
                )}
              </Link>
            )}

            <div className="hidden md:block">
              {user ? (
                <button onClick={handleSignOut} className="h-11 px-5 bg-bai-black text-white text-xs font-bold uppercase tracking-widest hover:bg-bai-red transition-colors">
                  Sign Out
                </button>
              ) : (
                <Link to={ROUTES.LOGIN} className="h-11 px-5 bg-bai-black text-white text-xs font-bold uppercase tracking-widest hover:bg-bai-red transition-colors flex items-center">
                  Sign In
                </Link>
              )}
            </div>

            <button
              onClick={() => setIsOpen(!isOpen)}
              aria-expanded={isOpen}
              aria-controls="mobile-menu"
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
              className="lg:hidden w-11 h-11 flex items-center justify-center text-bai-black rounded-full"
            >
              {isOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </nav>

      {isOpen && (
        <>
          <div onClick={() => setIsOpen(false)} className="fixed inset-x-0 top-20 bottom-0 z-40 bg-bai-black/40 lg:hidden" aria-hidden="true" />
          <div id="mobile-menu" className="lg:hidden absolute inset-x-0 top-20 z-50 bg-white border-b border-bai-black/10 shadow-[0_24px_40px_-24px_rgb(0_0_0/0.35)] max-h-[calc(100dvh-5rem)] overflow-y-auto">
            <div className="px-6 py-6">
              {navLinks.map((link) => {
                const active = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    aria-current={active ? 'page' : undefined}
                    className={`block py-3 font-display text-base font-bold uppercase tracking-widest hover:text-bai-red ${active ? 'text-bai-red' : 'text-bai-black'}`}
                  >
                    {link.name}
                  </Link>
                );
              })}
              <div className="pt-5 mt-3 border-t border-bai-black/10">
                {user ? (
                  <button onClick={handleSignOut} className="w-full py-4 bg-bai-black text-white font-display font-bold uppercase tracking-widest">
                    Sign Out
                  </button>
                ) : (
                  <Link to={ROUTES.LOGIN} className="block w-full py-4 bg-bai-black text-white text-center font-display font-bold uppercase tracking-widest">
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}

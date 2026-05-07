import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ROUTES } from '../../controllers/navigation';
import { useAuth } from './AuthProvider';
import { authController } from '../../controllers/authController';
import { useCart } from '../../hooks/useCart';

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
    
    if (role === 'SUPER_ADMIN' || role === 'CEO' || role === 'FINANCE_MANAGER' || role === 'PRO') {
      navLinks.push({ name: 'Dashboard', path: ROUTES.DASHBOARD });
    }
    if (role === 'SUPER_ADMIN' || role === 'TICKET_SCANNER' || role === 'PRO') {
      navLinks.push({ name: 'Scanner', path: ROUTES.SCANNER });
    }
  }

  const handleSignOut = async () => {
    await authController.logout();
  };

  return (
    <nav className="sticky top-0 z-50 bg-bai-bone/80 backdrop-blur-md border-b border-bai-black/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <Link to={ROUTES.HOME} className="flex items-center space-x-3 group">
            <div className="relative w-12 h-12 flex items-center justify-center">
               {/* 
                 LOGO PLACEMENT:
                 To use your own logo, save it as 'logo.png' in public/assets/
                 and replace the div below with:
                 <img src="/assets/logo.png" alt="Bokamoso Arts Institute" className="w-full h-full object-contain" />
               */}
               <div className="absolute inset-0 piano-key-pattern rounded-full opacity-20 group-hover:animate-spin-slow transition-all" />
               <div className="relative z-10 w-9 h-9 bg-bai-black flex items-center justify-center rounded-full border-2 border-white group-hover:scale-110 transition-transform">
                  <span className="text-white font-display font-black text-[10px]">BAI</span>
               </div>
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-display font-bold text-base leading-tight tracking-tighter">BOKAMOSO</span>
              <span className="text-[8px] uppercase tracking-[0.2em] font-medium text-bai-red">Arts Institute</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`font-display text-[11px] font-bold uppercase tracking-[0.2em] transition-all hover:text-bai-red relative ${
                  location.pathname === link.path ? 'text-bai-red' : 'text-bai-black'
                }`}
              >
                {link.name}
                {location.pathname === link.path && (
                   <motion.div 
                     layoutId="nav-underline"
                     className="absolute -bottom-1 left-0 right-0 h-0.5 bg-bai-red"
                   />
                )}
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-4">
             {user && (
               <Link to={ROUTES.CART} className="relative p-2 text-bai-black hover:text-bai-red transition-colors">
                  <ShoppingCart size={20} strokeWidth={1.5} />
                  {totalItems > 0 && (
                     <span className="absolute top-0 right-0 w-4 h-4 bg-bai-red text-white text-[8px] font-black flex items-center justify-center rounded-full animate-in zoom-in">
                        {totalItems}
                     </span>
                  )}
               </Link>
             )}

             <div className="hidden md:block">
                {user ? (
                  <button onClick={handleSignOut} className="h-9 px-5 bg-bai-black text-white text-[10px] font-bold uppercase tracking-widest hover:bg-bai-red transition-all">
                    Sign Out
                  </button>
                ) : (
                  <Link to={ROUTES.LOGIN} className="h-9 px-5 bg-bai-black text-white text-[10px] font-bold uppercase tracking-widest hover:bg-bai-red transition-all flex items-center">
                    Sign In
                  </Link>
                )}
             </div>

             <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden text-bai-black p-2">
               {isOpen ? <X size={20} /> : <Menu size={20} />}
             </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden h-[200vh]"
            />
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="lg:hidden bg-white border-b border-bai-black/10 overflow-hidden relative z-50"
            >
            <div className="px-6 py-8 space-y-6">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className="block font-display text-base font-black uppercase tracking-widest text-bai-black hover:text-bai-red"
                >
                  {link.name}
                </Link>
              ))}
              <div className="pt-4 border-t border-bai-black/5">
                {user ? (
                   <button
                    onClick={() => { handleSignOut(); setIsOpen(false); }}
                    className="w-full py-4 bg-bai-red text-white font-display font-bold uppercase tracking-widest"
                   >
                     Sign Out
                   </button>
                ) : (
                  <Link
                    to={ROUTES.LOGIN}
                    onClick={() => setIsOpen(false)}
                    className="block w-full py-4 bg-bai-black text-white text-center font-display font-bold uppercase tracking-widest"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </nav>
  );
}

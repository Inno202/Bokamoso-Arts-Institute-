import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Music2 } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ROUTES } from '../../controllers/navigation';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: ROUTES.HOME },
    { name: 'About Us', path: ROUTES.ABOUT },
    { name: 'Our Work', path: ROUTES.PROGRAMS },
    { name: 'On Tour', path: ROUTES.TOUR },
    { name: 'Traditions', path: ROUTES.TRADITIONS },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-bai-bone/80 backdrop-blur-md border-b border-bai-black/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <Link to={ROUTES.HOME} className="flex items-center space-x-3">
            <div className="relative w-12 h-12 flex items-center justify-center">
               <div className="absolute inset-0 piano-key-pattern rounded-full opacity-20 animate-spin-slow" />
               <div className="relative z-10 w-8 h-8 bg-bai-black flex items-center justify-center rounded-full border-2 border-white">
                  <span className="text-white font-display font-black text-[10px]">BAI</span>
               </div>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg leading-tight tracking-tighter">BOKAMOSO</span>
              <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-bai-red">Arts Institute</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`font-display text-sm font-medium uppercase tracking-widest transition-colors hover:text-bai-red ${
                  location.pathname === link.path ? 'text-bai-red border-b-2 border-bai-red' : 'text-bai-black'
                }`}
              >
                {link.name}
              </Link>
            ))}
            <Link to={ROUTES.DONATE} className="btn-primary py-2 px-6 text-xs bg-bai-red">
              Donate
            </Link>
          </div>

          {/* Mobile button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="text-bai-charcoal p-2">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-bai-bone border-b border-bai-charcoal/5 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className="block font-display text-lg font-bold uppercase tracking-widest text-bai-charcoal"
                >
                  {link.name}
                </Link>
              ))}
              <Link
                to={ROUTES.DONATE}
                onClick={() => setIsOpen(false)}
                className="block btn-primary text-center"
              >
                Donate
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

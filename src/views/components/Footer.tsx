import { Youtube, Facebook, Instagram, MessageCircle, ChevronUp, ChevronDown, Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ROUTES } from '../../controllers/navigation';

export default function Footer() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('footer_collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('footer_collapsed', String(isCollapsed));
  }, [isCollapsed]);

  const quickLinks = [
    { name: 'Home', path: ROUTES.HOME },
    { name: 'About Us', path: ROUTES.ABOUT },
    { name: 'Our Work', path: ROUTES.PROGRAMS },
    { name: 'Events', path: ROUTES.EVENTS },
    { name: 'Traditions', path: ROUTES.TRADITIONS },
    { name: 'Donate', path: ROUTES.DONATE },
  ];

  const socials = [
    { name: 'YouTube', icon: <Youtube size={18} strokeWidth={1.5} />, url: 'https://youtube.com/@bokamosoartsinstitute?si=KQ55EgXECEq4iSDR' },
    { name: 'Facebook', icon: <Facebook size={18} strokeWidth={1.5} />, url: 'https://www.facebook.com/share/1G9FqBQFUC/' },
    { name: 'Instagram', icon: <Instagram size={18} strokeWidth={1.5} />, url: 'https://www.instagram.com/bokamoso_arts_institute?igsh=dG9sdTQzYjU5aWtx' },
    { name: 'WhatsApp', icon: <MessageCircle size={18} strokeWidth={1.5} />, url: 'https://whatsapp.com/channel/0029VaRVyM3GufJ0VIXtp93n/145' },
  ];

  return (
    <footer className="bg-bai-black text-white relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-10 h-10 bg-bai-red text-white rounded-full flex items-center justify-center shadow-lg border-4 border-bai-black hover:scale-110 transition-transform"
        >
          {isCollapsed ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-12 sm:gap-16">
                <div className="col-span-1">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-8 h-8 bg-white flex items-center justify-center rounded-full border-2 border-bai-red">
                       <span className="text-bai-black font-display font-black text-[8px]">BAI</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-display font-bold text-lg leading-tight tracking-tighter">BOKAMOSO</span>
                      <span className="text-[8px] uppercase tracking-[0.2em] font-medium text-bai-red">Arts Institute</span>
                    </div>
                  </div>
                  <p className="text-white/40 text-xs leading-relaxed mb-8 font-light italic">
                    Bula Pelo — Open Your Heart. We nurture the voices of Mabopane to resonate across the globe.
                  </p>
                  <div className="flex items-center space-x-4">
                    {socials.map((social) => (
                      <a 
                        key={social.name}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/40 hover:text-bai-red transition-all transform hover:-translate-y-1"
                        title={social.name}
                      >
                        {social.icon}
                      </a>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-display font-bold uppercase tracking-[0.2em] text-[10px] mb-8 text-bai-blue">Exploration</h4>
                  <ul className="space-y-4">
                    {quickLinks.map((link) => (
                      <li key={link.name}>
                        <Link to={link.path} className="text-xs text-white/50 hover:text-bai-red transition-colors font-medium">
                          {link.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-display font-bold uppercase tracking-[0.2em] text-[10px] mb-8 text-bai-blue">Inquiry</h4>
                  <ul className="space-y-6">
                    <li className="flex items-start space-x-3 text-[11px] text-white/50 font-medium">
                      <MapPin size={16} className="text-bai-red shrink-0" />
                      <span>110 Industrial Park, Mabopane, Gauteng, 0190</span>
                    </li>
                    <li className="flex items-center space-x-3 text-[11px] text-white/50 font-medium">
                      <Phone size={16} className="text-bai-red shrink-0" />
                      <span>+27 12 702 4455</span>
                    </li>
                    <li className="flex items-center space-x-3 text-[11px] text-white/50 font-medium">
                      <Mail size={16} className="text-bai-red shrink-0" />
                      <span>info@bokamosoarts.org</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-display font-bold uppercase tracking-[0.2em] text-[10px] mb-8 text-bai-blue">Allies</h4>
                  <div className="space-y-3 text-[10px] font-bold uppercase tracking-widest text-white/20 italic">
                    <p>Entsika Foundation</p>
                    <p>Old Mutual ZA</p>
                    <p>Tshwane Heritage</p>
                    <p>Bokamoso Passenger</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-bai-bone/5 border-t border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center text-[9px] uppercase tracking-[0.3em] text-white/20 font-bold">
          <p>© 2026 BAI. Cultural Excellence from Mabopane.</p>
          <div className="flex space-x-8 mt-4 md:mt-0">
            <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-white cursor-pointer transition-colors">Terms</span>
            <span className="hover:text-white cursor-pointer transition-colors">Cookies</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

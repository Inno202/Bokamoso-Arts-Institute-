import { Youtube, Facebook, Instagram, MessageCircle, ChevronUp, ChevronDown, Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ROUTES } from '../../controllers/navigation';

const readCollapsed = () => {
  try { return localStorage.getItem('footer_collapsed') === 'true'; } catch { return false; }
};

export default function Footer() {
  const [isCollapsed, setIsCollapsed] = useState(readCollapsed);

  useEffect(() => {
    try { localStorage.setItem('footer_collapsed', String(isCollapsed)); } catch { /* preference simply is not remembered */ }
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
    { name: 'YouTube', icon: <Youtube size={20} strokeWidth={1.5} aria-hidden="true" />, url: 'https://youtube.com/@bokamosoartsinstitute?si=KQ55EgXECEq4iSDR' },
    { name: 'Facebook', icon: <Facebook size={20} strokeWidth={1.5} aria-hidden="true" />, url: 'https://www.facebook.com/share/1G9FqBQFUC/' },
    { name: 'Instagram', icon: <Instagram size={20} strokeWidth={1.5} aria-hidden="true" />, url: 'https://www.instagram.com/bokamoso_arts_institute?igsh=dG9sdTQzYjU5aWtx' },
    { name: 'WhatsApp', icon: <MessageCircle size={20} strokeWidth={1.5} aria-hidden="true" />, url: 'https://whatsapp.com/channel/0029VaRVyM3GufJ0VIXtp93n/145' },
  ];

  const heading = 'font-display font-bold uppercase tracking-[0.18em] text-xs mb-6 text-bai-blue-soft';

  return (
    <footer className="bg-bai-black text-white relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-expanded={!isCollapsed}
          aria-controls="footer-details"
          aria-label={isCollapsed ? 'Show contact details and links' : 'Hide contact details and links'}
          className="w-11 h-11 bg-bai-red text-white rounded-full flex items-center justify-center border-4 border-bai-black hover:scale-110 transition-transform"
        >
          {isCollapsed ? <ChevronUp size={20} aria-hidden="true" /> : <ChevronDown size={20} aria-hidden="true" />}
        </button>
      </div>

      {!isCollapsed && (
        <div id="footer-details" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="w-9 h-9 bg-white flex items-center justify-center rounded-full border-2 border-bai-red" aria-hidden="true">
                  <span className="text-bai-black font-display font-bold text-[11px]">BAI</span>
                </span>
                <span className="flex flex-col">
                  <span className="font-display font-bold text-lg leading-tight tracking-tight">BOKAMOSO</span>
                  <span className="text-[11px] uppercase tracking-[0.18em] font-semibold text-bai-red-soft">Arts Institute</span>
                </span>
              </div>
              <p className="text-white/70 text-sm leading-relaxed mb-6 font-light italic max-w-xs">
                Bula Pelo. Open your heart. We nurture the voices of Mabopane to resonate across the globe.
              </p>
              <div className="flex items-center -ml-3">
                {socials.map((social) => (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${social.name} (opens in a new tab)`}
                    className="w-11 h-11 flex items-center justify-center text-white/70 hover:text-bai-red-soft transition-colors rounded-full"
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>

            <nav aria-label="Footer">
              <h2 className={heading}>Explore</h2>
              <ul className="space-y-1">
                {quickLinks.map((link) => (
                  <li key={link.name}>
                    <Link to={link.path} className="inline-block py-1.5 text-sm text-white/70 hover:text-white transition-colors">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              <h2 className={heading}>Contact</h2>
              <ul className="space-y-4 text-sm text-white/70">
                <li className="flex items-start gap-3">
                  <MapPin size={16} className="text-bai-red-soft shrink-0 mt-0.5" aria-hidden="true" />
                  <span>110 Industrial Park, Mabopane, Gauteng, 0190</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone size={16} className="text-bai-red-soft shrink-0" aria-hidden="true" />
                  <a href="tel:+27127024455" className="hover:text-white transition-colors py-1">+27 12 702 4455</a>
                </li>
                <li className="flex items-center gap-3">
                  <Mail size={16} className="text-bai-red-soft shrink-0" aria-hidden="true" />
                  <a href="mailto:info@bokamosoarts.org" className="hover:text-white transition-colors py-1 break-all">info@bokamosoarts.org</a>
                </li>
              </ul>
            </div>

            <div>
              <h2 className={heading}>Partners</h2>
              <ul className="space-y-2 text-sm text-white/70">
                <li>Entsika Foundation</li>
                <li>Old Mutual ZA</li>
                <li>Tshwane Heritage</li>
                <li>Bokamoso Passenger</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-white/10 py-8">
        <p className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center md:text-left text-xs uppercase tracking-[0.18em] text-white/60 font-semibold">
          © {new Date().getFullYear()} Bokamoso Arts Institute. Cultural excellence from Mabopane.
        </p>
      </div>
    </footer>
  );
}

import { Youtube, Facebook, Instagram, MessageCircle, ChevronUp, ChevronDown, Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { ROUTES } from '../../controllers/navigation';
import { useContent } from '../../content/store';

const readCollapsed = () => {
  try { return localStorage.getItem('footer_collapsed') === 'true'; } catch { return false; }
};

const NETWORKS = {
  youtube: { name: 'YouTube', Icon: Youtube },
  facebook: { name: 'Facebook', Icon: Facebook },
  instagram: { name: 'Instagram', Icon: Instagram },
  whatsapp: { name: 'WhatsApp', Icon: MessageCircle },
} as const;

const quickLinks = [
  { name: 'Home', path: ROUTES.HOME },
  { name: 'About Us', path: ROUTES.ABOUT },
  { name: 'Our Work', path: ROUTES.PROGRAMS },
  { name: 'Events', path: ROUTES.EVENTS },
  { name: 'Traditions', path: ROUTES.TRADITIONS },
];

const legalLinks = [
  { name: 'Terms', path: ROUTES.TERMS },
  { name: 'Privacy', path: ROUTES.PRIVACY },
  { name: 'Cookies', path: ROUTES.COOKIES },
];

export default function Footer() {
  const { contact, footerBlurb, copyrightLine, socials, partners } = useContent('site');
  // Starts open (as the pre-rendered page does), then applies the visitor's saved choice.
  const [isCollapsed, setIsCollapsed] = useState(false);
  const restored = useRef(false);

  useEffect(() => {
    if (!restored.current) {
      restored.current = true;
      if (readCollapsed()) setIsCollapsed(true);
      return;
    }
    try { localStorage.setItem('footer_collapsed', String(isCollapsed)); } catch { /* preference simply is not remembered */ }
  }, [isCollapsed]);

  const heading = 'font-display font-bold uppercase tracking-wide text-sm mb-5 text-bai-blue-soft';
  const footerLink = 'inline-block py-2 text-white/75 hover:text-white transition-colors';

  return (
    <footer className="bg-bai-black text-white relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-expanded={!isCollapsed}
          aria-controls="footer-details"
          aria-label={isCollapsed ? 'Show contact details and links' : 'Hide contact details and links'}
          className="icon-btn bg-bai-red text-white border-4 border-bai-black"
        >
          {isCollapsed ? <ChevronUp size={20} aria-hidden="true" /> : <ChevronDown size={20} aria-hidden="true" />}
        </button>
      </div>

      {!isCollapsed && (
        <div id="footer-details" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="w-12 h-12 bg-white rounded-full flex items-center justify-center shrink-0" aria-hidden="true">
                  <img src={`${import.meta.env.BASE_URL}assets/brand/mark-96.png`} alt="" width={40} height={40} loading="lazy" decoding="async" className="w-10 h-10" />
                </span>
                <span className="flex flex-col">
                  <span className="font-serif font-semibold text-xl leading-none tracking-[0.06em]">BOKAMOSO</span>
                  <span className="text-xs uppercase tracking-[0.18em] font-semibold text-bai-red-soft">Arts Institute</span>
                </span>
              </div>
              {footerBlurb && <p className="text-white/75 leading-relaxed mb-6 max-w-xs">{footerBlurb}</p>}
              {socials.length > 0 && (
                <ul className="flex items-center -ml-3">
                  {socials.map((social) => {
                    const { name, Icon } = NETWORKS[social.network];
                    return (
                      <li key={social.url}>
                        <a href={social.url} target="_blank" rel="noopener noreferrer" aria-label={`${name} (opens in a new tab)`} className="icon-btn text-white/75 hover:text-bai-red-soft">
                          <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <nav aria-label="Footer">
              <h2 className={heading}>Explore</h2>
              <ul>
                {quickLinks.map((link) => (
                  <li key={link.name}><Link to={link.path} className={footerLink}>{link.name}</Link></li>
                ))}
              </ul>
            </nav>

            <div>
              <h2 className={heading}>Contact</h2>
              <ul className="space-y-3 text-white/75">
                <li className="flex items-start gap-3 py-1">
                  <MapPin size={18} className="text-bai-red-soft shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{contact.address}</span>
                </li>
                {contact.phone.trim() && (
                  <li className="flex items-center gap-3">
                    <Phone size={18} className="text-bai-red-soft shrink-0" aria-hidden="true" />
                    <a href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`} className={footerLink}>{contact.phone}</a>
                  </li>
                )}
                <li className="flex items-center gap-3">
                  <Mail size={18} className="text-bai-red-soft shrink-0" aria-hidden="true" />
                  <a href={`mailto:${contact.email}`} className={`${footerLink} break-all`}>{contact.email}</a>
                </li>
              </ul>
            </div>

            {partners.length > 0 && (
              <div>
                <h2 className={heading}>Partners</h2>
                <ul className="space-y-2 text-white/75">
                  {partners.map((partner) => <li key={partner.name}>{partner.name}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="border-t border-white/10 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-2 text-sm text-white/70 pr-16 sm:pr-20 lg:pr-20">
          <p>© {new Date().getFullYear()} Bokamoso Arts Institute. {copyrightLine}</p>
          <ul className="flex gap-6">
            {legalLinks.map((link) => (
              <li key={link.name}><Link to={link.path} className={footerLink}>{link.name}</Link></li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

import { Music2, Instagram, Facebook, Youtube, Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../controllers/navigation';

export default function Footer() {
  const quickLinks = [
    { name: 'Home', path: ROUTES.HOME },
    { name: 'About Us', path: ROUTES.ABOUT },
    { name: 'Our Work', path: ROUTES.PROGRAMS },
    { name: 'On Tour', path: ROUTES.TOUR },
    { name: 'Traditions', path: ROUTES.TRADITIONS },
  ];

  return (
    <footer className="bg-bai-black text-white pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1">
            <Link to={ROUTES.HOME} className="flex items-center space-x-2 mb-6">
              <div className="w-10 h-10 bg-bai-red flex items-center justify-center rounded-full">
                <Music2 className="text-white" size={24} />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-bold text-xl leading-tight tracking-tighter">BOKAMOSO</span>
                <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-bai-red">Arts Institute</span>
              </div>
            </Link>
            <p className="text-white/60 text-sm leading-relaxed mb-6 font-light">
              Nurturing African Excellence through choral music and holistic youth development since 2022. 
              <span className="bula-pelo-text block mt-2 text-white italic opacity-80 whitespace-nowrap !text-white">Bula Pelo — Open Your Heart</span>
            </p>
          </div>

          <div>
            <h4 className="font-display font-bold uppercase tracking-widest text-xs mb-6 text-bai-blue">Quick Links</h4>
            <ul className="space-y-4">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link to={link.path} className="text-sm text-white/50 hover:text-bai-red transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold uppercase tracking-widest text-xs mb-6 text-bai-blue">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3 text-sm text-white/50">
                <MapPin size={18} className="text-bai-red shrink-0" />
                <span>110 Mabopane Industrial, Mabopane, Gauteng, ZA</span>
              </li>
              <li className="flex items-center space-x-3 text-sm text-white/50">
                <Phone size={18} className="text-bai-red shrink-0" />
                <span>+27 (0) 12 345 6789</span>
              </li>
              <li className="flex items-center space-x-3 text-sm text-white/50">
                <Mail size={18} className="text-bai-red shrink-0" />
                <span>info@bokamosoarts.org.za</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold uppercase tracking-widest text-xs mb-6 text-bai-blue">Strategic Partners</h4>
            <div className="space-y-3 text-xs font-medium uppercase tracking-tighter text-white/40">
              <p>Entsika Foundation</p>
              <p>Dept. of Sport, Arts & Culture</p>
              <p>Bokamoso Passenger Services</p>
              <p>Old Mutual South Africa</p>
              <p>City of Tshwane</p>
            </div>
          </div>
        </div>

        <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-[10px] uppercase tracking-widest text-white/20">
          <p>© 2026 Bokamoso Arts Institute. All Rights Reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

import { useState, useEffect } from 'react';
import { Calendar, Ticket, MapPin, Search, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { eventController } from '../../controllers/eventController';
import { BAIEvent } from '../../models/types';
import { cloudinaryService } from '../../services/cloudinaryService';
import { ROUTES } from '../../controllers/navigation';
import { Link } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';

export default function Events() {
  const { addToCart } = useCart();
  const [events, setEvents] = useState<BAIEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    eventController.getAllEvents().then(data => {
      setEvents(data);
      setLoading(false);
    });
  }, []);

  const filteredEvents = events.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddToCart = (event: BAIEvent) => {
    addToCart({
      eventId: event.id,
      eventName: event.name,
      venue: event.venue,
      date: event.date,
      ticketType: 'General Admission',
      price: event.price,
      quantity: 1,
      ticketImageUrl: event.ticketImageUrl
    });
    // Optional: Toast or navigate to cart
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <section className="bg-bai-black text-white py-16 md:py-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0 piano-key-pattern opacity-10" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="max-w-3xl border-l-[6px] border-bai-red pl-6">
            <span className="font-display font-bold uppercase tracking-[0.4em] text-bai-red text-[10px] mb-4 block">Bokamoso Events</span>
            <h1 className="font-display font-extrabold text-5xl md:text-8xl tracking-tighter leading-none italic uppercase">
              LIVE <br /> <span className="text-white">STAGE.</span>
            </h1>
          </div>
          
          <div className="mt-12 max-w-xl relative">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
             <input 
                type="text" 
                placeholder="Find a city or event..."
                className="w-full h-14 pl-12 pr-6 bg-white/5 border border-white/10 text-white outline-none focus:border-bai-red transition-all rounded-lg text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="aspect-[4/5] bg-white animate-pulse rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((event) => (
              <motion.div 
                key={event.id}
                whileHover={{ y: -10 }}
                className="bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col group border-2 border-transparent hover:border-bai-black transition-all"
              >
                <div className="aspect-[16/10] bg-bai-black relative overflow-hidden">
                   <img 
                    src={cloudinaryService.getOptimizedUrl(event.bannerImageUrl || 'https://images.unsplash.com/photo-1514525253344-f81bad3b3fc2?w=800')} 
                    alt={event.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80"
                   />
                   <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
                      <span className="font-display font-black text-sm text-bai-black">R{event.price}</span>
                   </div>
                   <div className="absolute bottom-4 left-4">
                      <span className="bg-bai-red text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-sm">
                         {event.status}
                      </span>
                   </div>
                </div>

                <div className="p-8 flex-grow flex flex-col">
                   <div className="flex items-center space-x-3 text-bai-red text-[10px] font-black uppercase tracking-widest mb-4">
                      <Calendar size={14} />
                      <span>{new Date(event.date?.seconds * 1000 || event.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                   </div>
                   
                   <h3 className="font-display font-black text-2xl uppercase tracking-tighter mb-2 italic leading-tight">{event.name}</h3>
                   <div className="flex items-center space-x-2 text-bai-black/40 text-[10px] font-bold uppercase tracking-widest mb-6">
                      <MapPin size={12} className="shrink-0" />
                      <span>{event.venue} — {event.city}</span>
                   </div>

                   <p className="text-bai-black/60 text-sm line-clamp-2 mb-8 italic font-serif">
                      {event.description}
                   </p>

                   <div className="mt-auto pt-6 border-t border-bai-black/5 flex items-center justify-between">
                      <div className="text-[10px] font-black uppercase tracking-widest space-y-1">
                         <div className="text-bai-black/30">Remaining</div>
                         <div className="text-bai-red">{event.capacity - event.ticketsSold} Tickets</div>
                      </div>
                      <button 
                        onClick={() => handleAddToCart(event)}
                        className="h-12 px-8 bg-bai-black text-white font-display font-black uppercase tracking-widest text-[10px] hover:bg-bai-blue transition-all disabled:opacity-30 flex items-center space-x-3 rounded-lg"
                        disabled={event.ticketsSold >= event.capacity}
                      >
                        <span>Add to Cart</span>
                        <Ticket size={16} />
                      </button>
                   </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && filteredEvents.length === 0 && (
          <div className="py-32 text-center">
             <p className="font-display font-black text-4xl text-bai-black/10 uppercase tracking-tighter italic">No matching events found</p>
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
         <div className="bg-bai-red p-12 md:p-20 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between gap-12 overflow-hidden relative">
            <div className="absolute inset-0 piano-key-pattern opacity-10 pointer-events-none" />
            <div className="relative z-10 max-w-xl">
               <h2 className="font-display font-black text-4xl md:text-6xl uppercase tracking-tighter mb-6 italic leading-[0.9]">
                  Support our <br/> <span className="text-bai-black">Journey.</span>
               </h2>
               <p className="text-white/80 text-lg md:text-xl font-light italic mb-8">
                  Your donation helps us transport our voices to those who need them most.
               </p>
               <Link to={ROUTES.DONATE} className="h-14 px-10 bg-white text-bai-red font-display font-black uppercase tracking-widest inline-flex items-center space-x-3 rounded-xl hover:bg-bai-black hover:text-white transition-all shadow-2xl">
                  <span>Donate Now</span>
                  <ChevronRight size={20} />
               </Link>
            </div>
            <div className="relative z-10 w-full md:w-1/3 aspect-square bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20">
               <Music2 size={120} className="text-white opacity-20" />
            </div>
         </div>
      </section>
    </div>
  );
}

import { Music2 } from 'lucide-react';

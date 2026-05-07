import { useState, useEffect } from 'react';
import { Calendar, Ticket, MapPin, Search, CheckCircle2, Trash2, Edit2 } from 'lucide-react';
import { motion } from 'motion/react';
import { eventController } from '../../controllers/eventController';
import { BAIEvent } from '../../models/types';
import { cloudinaryService } from '../../services/cloudinaryService';
import { useCart } from '../../hooks/useCart';

import { useAuth } from '../components/AuthProvider';
import { NewEventModal } from '../components/NewEventModal';

export default function Events() {
  const { addToCart } = useCart();
  const { user, role } = useAuth();
  const [events, setEvents] = useState<BAIEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [editingEvent, setEditingEvent] = useState<BAIEvent | null>(null);

  useEffect(() => {
    const unsubscribe = eventController.subscribeToEvents((data) => {
      setEvents(data);
      setLoading(false);
    }, true);
    
    return () => unsubscribe();
  }, []);

   const canManage = role === 'SUPER_ADMIN' || role === 'PRO' || role === 'CEO';

  const handleDelete = async (eventId: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        await eventController.deleteEvent(eventId);
        alert('Event deleted successfully');
      } catch (err) {
        console.error(err);
        alert('Failed to delete event');
      }
    }
  };

  const filteredEvents = events.filter(e => 
    (e.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
    (e.city || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  const handleAddToCart = (event: BAIEvent) => {
    if (!user) {
      alert('Please log in to purchase tickets.');
      return;
    }
    addToCart({
      eventId: event.id,
      eventName: event.name,
      venue: event.venue,
      date: event.date,
      ticketType: 'General Admission',
      price: event.price,
      quantity: 1,
      ticketImageUrl: event.ticketImageUrl || event.bannerImageUrl
    });
    
    setAddedIds(prev => new Set([...Array.from(prev), event.id]));
    setTimeout(() => {
      setAddedIds(prev => {
        const next = new Set(prev);
        next.delete(event.id);
        return next;
      });
    }, 2000);
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
            {[1,2,3].map(i => <div key={`event-skeleton-${i}`} className="aspect-[4/5] bg-white animate-pulse rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((event) => (
              <motion.div 
                key={event.id}
                whileHover={{ y: -10 }}
                className="bg-white rounded-3xl overflow-hidden shadow-xl border border-bai-black/5 group flex flex-col h-full relative"
              >
                {/* Image Section */}
                <div className="w-full aspect-[3/4] relative overflow-hidden bg-bai-bone">
                   <img 
                    src={cloudinaryService.getOptimizedUrl(event.ticketImageUrl || event.bannerImageUrl || 'https://images.unsplash.com/photo-1514525253344-f81bad3b3fc2?w=800')} 
                    alt={event.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                   />
                   <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg z-10">
                      <span className="font-display font-black text-sm text-bai-black">R{event.price}</span>
                   </div>
                   <div className="absolute bottom-4 left-4 z-10">
                      <span className="bg-bai-red text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-sm">
                         {event.status}
                      </span>
                   </div>
                </div>

                {/* Details Section */}
                <div className="p-8 flex flex-col flex-grow relative">
                   {canManage && (
                     <div className="absolute top-4 right-4 flex flex-col space-y-2 z-20">
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           setEditingEvent(event);
                         }}
                         className="p-2 bg-bai-blue/10 text-bai-blue hover:bg-bai-blue hover:text-white rounded-full transition-all"
                         title="Edit Event"
                       >
                          <Edit2 size={14} />
                       </button>
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           handleDelete(event.id);
                         }}
                         className="absolute p-2 bg-bai-red/10 text-bai-red hover:bg-bai-red hover:text-white rounded-full transition-all"
                         title="Delete Event"
                       >
                          <Trash2 size={14} />
                       </button>
                     </div>
                   )}
                   <div className="mb-4">
                      <div className="flex items-center space-x-2 text-bai-red text-[10px] font-bold uppercase tracking-widest mb-2">
                         <Calendar size={12} />
                         <span>{new Date(event.date?.seconds * 1000 || event.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</span>
                      </div>
                      
                      <h3 className="font-display font-black text-2xl uppercase mb-2 leading-none group-hover:text-bai-blue transition-colors">{event.name}</h3>
                      
                      <div className="flex items-center space-x-1 text-bai-black/40 text-[10px] font-bold uppercase tracking-widest">
                         <MapPin size={10} className="shrink-0" />
                         <span className="truncate">{event.venue}</span>
                      </div>
                   </div>

                   {event.description && (
                      <p className="text-bai-black/60 text-sm leading-relaxed mb-6 line-clamp-3">
                         {event.description}
                      </p>
                   )}

                   <div className="mt-auto">
                      <button 
                        onClick={() => handleAddToCart(event)}
                        disabled={event.ticketsSold >= event.capacity || addedIds.has(event.id)}
                        className={`h-12 px-8 w-full font-display font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center space-x-2 rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] ${
                          addedIds.has(event.id) 
                            ? 'bg-green-600 text-white' 
                            : 'bg-bai-black text-white hover:bg-bai-blue disabled:opacity-30'
                        }`}
                      >
                         {addedIds.has(event.id) ? (
                            <>
                              <span>Added to Cart</span>
                              <CheckCircle2 size={16} />
                            </>
                          ) : (
                            <>
                              <span>Buy Ticket</span>
                              <Ticket size={16} />
                            </>
                          )}
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

      {editingEvent && (
        <NewEventModal 
          isOpen={!!editingEvent}
          onClose={() => setEditingEvent(null)}
          onCreated={() => {
            setEditingEvent(null);
          }}
          event={editingEvent}
        />
      )}
    </div>
  );
}

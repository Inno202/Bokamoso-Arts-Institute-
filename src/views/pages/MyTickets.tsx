import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Ticket, MapPin, Calendar, Clock, Download, ChevronRight, Share2 } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { ticketController } from '../../controllers/ticketController';
import { eventController } from '../../controllers/eventController';
import { BAIEvent, Ticket as TicketType } from '../../models/types';
import { cloudinaryService } from '../../services/cloudinaryService';

export default function MyTickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<(TicketType & { event?: BAIEvent })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<(TicketType & { event?: BAIEvent }) | null>(null);

  useEffect(() => {
    if (!user) return;

    // Use subscription for real-time updates
    const unsubscribe = ticketController.subscribeToUserTickets(user.uid, async (userTickets) => {
      try {
        if (!userTickets || userTickets.length === 0) {
          setTickets([]);
          setLoading(false);
          return;
        }

        const eventIds = Array.from(new Set(userTickets.map((t: any) => t.eventId).filter(id => id)));
        const eventsData = await Promise.all(eventIds.map(id => eventController.getEventById(id as string)));
        const eventsMap = Object.fromEntries(eventsData.map(e => [e?.id || '', e]).filter(([id]) => id));

        setTickets(userTickets.map((t: any) => ({
          ...t,
          event: eventsMap[t.eventId]
        })));
      } catch (err) {
        console.error("Error processing tickets:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bai-bone">
        <div className="w-12 h-12 border-4 border-bai-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-24 bg-bai-bone min-h-screen">
      <div className="bg-bai-black text-white py-12 px-4 mb-12 relative overflow-hidden">
        <div className="absolute inset-0 piano-key-pattern opacity-10" />
        <div className="max-w-7xl mx-auto relative z-10">
          <span className="font-display font-bold uppercase tracking-[0.4em] text-bai-red text-[10px] mb-2 block">My Collection</span>
          <h1 className="font-display font-black text-4xl md:text-6xl tracking-tighter uppercase italic leading-none">Your <span className="text-bai-red">Tickets.</span></h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {tickets.length === 0 ? (
          <div className="py-32 text-center">
            <Ticket size={64} className="mx-auto text-bai-black/10 mb-8" />
            <h2 className="font-display font-black text-2xl uppercase italic text-bai-black/40">No tickets found</h2>
            <p className="text-sm italic text-bai-black/30 mt-4 max-w-xs mx-auto">You haven't purchased any tickets yet. Join us for our next event!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tickets.map((ticket, idx) => (
              <motion.div 
                key={ticket.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => setSelectedTicket(ticket)}
                className="bg-white rounded-[2rem] overflow-hidden shadow-xl border border-bai-black/5 flex flex-col group cursor-pointer hover:shadow-2xl transition-all"
              >
                <div className="aspect-[16/9] relative overflow-hidden">
                   <img 
                    src={cloudinaryService.getOptimizedUrl(ticket.event?.bannerImageUrl || ticket.ticketImageUrl || 'https://images.unsplash.com/photo-1514525253344-f81bad3b3fc2?w=800')} 
                    alt={ticket.event?.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                   <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
                      <div>
                         <span className="bg-bai-red text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 mb-2 inline-block">Valid Ticket</span>
                         <h3 className="text-white font-display font-black text-xl leading-none uppercase italic">{ticket.event?.name}</h3>
                      </div>
                      <div className="w-12 h-12 bg-white rounded-lg p-1.5 shadow-xl">
                         <img src={ticket.qrCode} alt="QR Code" className="w-full h-full" />
                      </div>
                   </div>
                </div>
                
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                     <span className="text-[9px] font-black uppercase tracking-widest text-bai-black/30">Reference: </span>
                     <span className="text-[10px] font-black uppercase tracking-widest text-bai-red">{ticket.id}</span>
                  </div>

                  <div className="space-y-3">
                     <div className="flex items-center space-x-3 text-bai-black/60">
                        <Calendar size={14} className="text-bai-blue" />
                        <span className="text-xs font-bold uppercase tracking-tight">{ticket.event?.date?.seconds ? new Date(ticket.event.date.seconds * 1000).toLocaleDateString() : ticket.event?.date}</span>
                     </div>
                     <div className="flex items-center space-x-3 text-bai-black/60">
                        <MapPin size={14} className="text-bai-blue" />
                        <span className="text-xs font-bold uppercase tracking-tight line-clamp-1">{ticket.event?.venue}</span>
                     </div>
                  </div>

                  <button className="w-full mt-6 flex items-center justify-between p-4 bg-bai-bone rounded-xl group-hover:bg-bai-black group-hover:text-white transition-all">
                     <span className="text-[10px] font-black uppercase tracking-widest">View Ticket</span>
                     <ChevronRight size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Ticket Details Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTicket(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md" 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-white rounded-[2.5rem] overflow-hidden relative shadow-2xl"
            >
              <div className="bg-bai-black p-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 piano-key-pattern opacity-10" />
                <img 
                  src="/bai-logo.png" 
                  alt="BAI" 
                  className="h-12 mx-auto mb-6 relative z-10 brightness-0 invert"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                 />
                <h2 className="text-white font-display font-black text-2xl md:text-3xl uppercase italic leading-none tracking-tighter relative z-10">
                  {selectedTicket.event?.name}
                </h2>
              </div>

              {/* The "Physical" Ticket Card Style */}
              <div className="p-8 space-y-8">
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                  {/* QR Code Section */}
                  <div className="w-48 h-48 bg-bai-bone p-4 rounded-3xl border-4 border-bai-black flex items-center justify-center relative overflow-hidden group">
                    <img src={selectedTicket.qrCode} alt="QR Code" className="w-full h-full relative z-10" />
                    <div className="absolute inset-0 bg-bai-red/5 scale-0 group-hover:scale-100 transition-transform duration-500 rounded-full" />
                  </div>

                  <div className="flex-grow space-y-6 w-full">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-bai-black/30 mb-2 block">Ticket Holder</span>
                      <p className="font-display font-black text-xl uppercase italic">{user?.displayName}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-bai-black/30 mb-1 block">Reference</span>
                        <p className="font-bold text-sm tracking-tight text-bai-red">{selectedTicket.id}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-bai-black/30 mb-1 block">Type</span>
                        <p className="font-bold text-sm tracking-tight">{selectedTicket.ticketType}</p>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-bai-black/5">
                      <div className="flex items-center space-x-3">
                         <Calendar className="text-bai-blue" size={18} />
                         <span className="text-xs font-bold uppercase tracking-tight">{selectedTicket.event?.date?.seconds ? new Date(selectedTicket.event.date.seconds * 1000).toLocaleDateString() : selectedTicket.event?.date}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                         <Clock className="text-bai-blue" size={18} />
                         <span className="text-xs font-bold uppercase tracking-tight">18:00 (Gates Open)</span>
                      </div>
                      <div className="flex items-center space-x-3">
                         <MapPin className="text-bai-blue" size={18} />
                         <span className="text-xs font-bold uppercase tracking-tight">{selectedTicket.event?.venue}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex grid-cols-2 gap-4 mt-8 pt-8 border-t-2 border-dashed border-bai-black/10">
                   <button className="flex-1 h-14 bg-bai-black text-white rounded-xl font-display font-black uppercase tracking-widest flex items-center justify-center space-x-3 hover:bg-bai-red transition-all">
                      <Download size={20} />
                      <span>Download</span>
                   </button>
                   <button className="flex-1 h-14 border-2 border-bai-black text-bai-black rounded-xl font-display font-black uppercase tracking-widest flex items-center justify-center space-x-3 hover:bg-bai-bone transition-all">
                      <Share2 size={20} />
                      <span>Share</span>
                   </button>
                </div>

                <p className="text-[9px] font-bold text-center text-bai-black/30 uppercase tracking-[0.3em] mt-8">
                  Terms & Conditions Apply • This ticket is non-refundable
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

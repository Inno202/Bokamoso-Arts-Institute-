import { Calendar, Ticket, MapPin, Globe, X } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../components/AuthProvider';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../controllers/lib/firebase';
import QRCode from 'qrcode';

export default function Tour() {
  const { user } = useAuth();
  const [selectedTour, setSelectedTour] = useState<any>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [buyerEmail, setBuyerEmail] = useState('');
  const [purchaseStatus, setPurchaseStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email && !buyerEmail) {
      setBuyerEmail(user.email);
    }
  }, [user, buyerEmail]);

  const tourDates = [
    { id: 't1', date: 'MAY 29, 2026', venue: 'Maitisong Theatre', city: 'Gaborone, Botswana', event: 'Botswana: It\'s Your Turn', status: 'On Sale' },
    { id: 't2', date: 'MAY 30, 2026', venue: 'Maitisong Theatre', city: 'Gaborone, Botswana', event: 'Global Harmony Tour', status: 'On Sale' },
    { id: 't3', date: 'JUN 15, 2026', venue: 'State Theatre', city: 'Pretoria', event: 'Homecoming Showcase', status: 'Coming Soon' },
    { id: 't4', date: 'AUG 10, 2026', venue: 'Joburg Theatre', city: 'Johannesburg', event: 'Voices of Africa', status: 'Coming Soon' },
  ];

  const handleBuyClick = (tour: any) => {
    if (tour.status.includes('Soon')) return;
    setSelectedTour(tour);
    setPurchaseStatus('idle');
    setQrCodeDataUrl(null);
    setCreatedTicketId(null);
    setBuyerEmail(user?.email || '');
    setIsPaymentModalOpen(true);
  };

  const handleMockOzowPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPurchaseStatus('processing');

    try {
      if (!user) {
         alert("Please sign in to buy a ticket.");
         setPurchaseStatus('error');
         return;
      }

      // Simulate an Ozow Secure Payment Flow redirect & callback
      // OZOW Integration Hook:
      // window.location.href = `https://pay.ozow.com/?siteCode=...&amount=150.00&reference=${buyerEmail}`;
      // For this implementation, we will simulate a successful callback after a short delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      const newTicketId = crypto.randomUUID();
      
      // QR Code structure (e.g. ticket:uuid) 
      const qrData = `ticket:${newTicketId}`;
      const qrDataUrl = await QRCode.toDataURL(qrData, { width: 300, margin: 1 });

      // Write the ticket to Firestore as the authenticated user.
      // This allows the backend/scanner to verify validity and prevent double-entry.
      await setDoc(doc(db, 'tickets', newTicketId), {
         tourId: selectedTour.id,
         ticketType: 'General Admission',
         buyerEmail: buyerEmail,
         buyerId: user.uid,
         status: 'VALID',
         createdAt: serverTimestamp()
      });

      setCreatedTicketId(newTicketId);
      setQrCodeDataUrl(qrDataUrl);
      setPurchaseStatus('success');

    } catch (err) {
      console.error(err);
      setPurchaseStatus('error');
    }
  };

  return (
    <div className="pb-24 relative">
      {/* Header */}
      <section className="bg-bai-black text-white py-16 md:py-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0 piano-key-pattern opacity-10" />
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-end gap-8">
          <div className="max-w-3xl border-l-[6px] border-bai-red pl-4 md:border-none md:pl-0">
            <span className="font-display font-bold uppercase tracking-[0.4em] text-bai-red text-xs mb-4 block">Bokamoso On Tour</span>
            <h1 className="font-display font-extrabold text-4xl sm:text-5xl md:text-7xl tracking-tighter leading-[1] italic uppercase">
              ON <br /> <span className="text-bai-red">TOUR</span>
            </h1>
          </div>
          <p className="text-white/40 font-display font-bold uppercase tracking-widest text-[10px] max-w-xs border-l border-white/20 pl-6">
            Transported by Bokamoso Passenger Services. Showcasing the grit and grace of Mabopane to the global family.
          </p>
        </div>
      </section>

      {/* Tour Highlight: Botswana */}
      <section className="py-12 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border-2 border-bai-black rounded-[2rem] overflow-hidden flex flex-col lg:flex-row">
           <div className="w-full lg:w-1/2 p-6 md:p-12 lg:p-20">
              <div className="flex items-center space-x-3 mb-6">
                 <div className="w-12 h-8 bg-bai-blue flex flex-col">
                    <div className="flex-grow bg-[#41ADDF]" /> {/* Botswana Blueish */}
                    <div className="h-1 bg-white" />
                    <div className="h-1 bg-bai-black" />
                    <div className="h-1 bg-white" />
                    <div className="flex-grow bg-[#41ADDF]" />
                 </div>
                 <span className="font-display font-bold uppercase tracking-widest text-xs">Featured: Botswana its your turn</span>
              </div>
              <h2 className="font-display font-black text-3xl sm:text-4xl md:text-6xl tracking-tighter mb-4 md:mb-6 leading-none italic uppercase">
                TOUR <br /> HIGHLIGHT.
              </h2>
              <p className="text-bai-black/60 text-lg mb-10 leading-relaxed">
                We are crossing borders to share the Bula Pelo spirit with the people of Botswana. 
                Experience a masterclass in choral excellence at the iconic Maitisong Theatre.
              </p>
              <div className="flex flex-wrap gap-4">
                 <button className="btn-primary bg-bai-blue">Book At Maitisong</button>
              </div>
           </div>
           <div className="w-full lg:w-1/2 bg-bai-black relative group overflow-hidden min-h-[300px]">
              <img 
                src="https://images.unsplash.com/photo-1514525253344-f81bad3b3fc2?auto=format&fit=crop&q=80&w=800" 
                alt="Choir on stage" 
                className="w-full h-full object-cover grayscale brightness-50 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 piano-key-pattern opacity-20 pointer-events-none" />
           </div>
        </div>
      </section>

      {/* Technical Feature: Webtickets Integration Mock */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="mb-12 md:mb-16 flex items-center justify-between border-b-4 border-bai-black pb-8">
           <div>
              <h2 className="font-display font-black text-3xl md:text-4xl mb-2 tracking-tighter uppercase">Tour Schedule</h2>
              <p className="text-bai-red font-bold uppercase tracking-widest text-[10px]">Secure your seat via Webtickets</p>
           </div>
           <div className="hidden md:flex items-center space-x-2 text-bai-black/20 font-black text-6xl">
              2026
           </div>
        </div>

        <div className="space-y-6">
           {tourDates.map((tour, idx) => (
             <div key={idx} className="group bg-white p-6 md:p-8 border-2 border-bai-black/5 hover:border-bai-black hover:bg-bai-bone flex flex-col md:flex-row items-center md:justify-between gap-6 md:gap-8 transition-all">
                <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-8 text-center md:text-left">
                   <div className="flex flex-col items-center justify-center p-6 bg-bai-black text-white min-w-[120px] rounded-sm">
                      <span className="text-[10px] uppercase font-bold text-bai-red tracking-widest mb-1">{tour.date.split(',')[0].split(' ')[0]}</span>
                      <span className="text-3xl font-black font-display leading-none">{tour.date.split(',')[0].split(' ')[1]}</span>
                   </div>
                   <div>
                      <h3 className="font-display font-bold text-2xl mb-1 italic uppercase tracking-tight">{tour.event}</h3>
                      <div className="flex items-center space-x-3 text-bai-black/40 text-[10px] font-bold uppercase tracking-widest">
                         <MapPin size={12} className="text-bai-red" />
                         <span>{tour.venue} — {tour.city}</span>
                      </div>
                   </div>
                </div>

                <div className="flex flex-col md:flex-row items-center w-full md:w-auto gap-4 md:space-x-6">
                   <span className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 border-2 ${
                      tour.status === 'On Sale' ? 'border-green-500 text-green-600' :
                      tour.status === 'Selling Fast' ? 'border-bai-red text-bai-red' :
                      'border-bai-black/10 text-bai-black/20'
                   }`}>
                      {tour.status}
                   </span>
                   <button 
                      onClick={() => handleBuyClick(tour)}
                      className={`w-full md:w-auto px-10 py-4 font-display font-bold uppercase tracking-widest text-xs transition-all ${
                      tour.status.includes('Soon') ? 'bg-bai-bone text-bai-black/20 cursor-not-allowed border-2 border-bai-black/10' : 'bg-bai-black text-white hover:bg-bai-red'
                   }`}>
                      Tickets
                   </button>
                </div>
             </div>
           ))}
        </div>
      </section>

      {/* Payment Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && selectedTour && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <motion.div 
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 className="bg-white rounded-3xl p-8 md:p-12 max-w-lg w-full relative shadow-2xl border-4 border-bai-black"
              >
                 <button 
                   onClick={() => setIsPaymentModalOpen(false)}
                   className="absolute top-6 right-6 text-bai-black/40 hover:text-bai-red"
                 >
                    <X size={24} />
                 </button>

                 <h3 className="font-display font-black text-3xl tracking-tighter uppercase mb-2">
                    Checkout
                 </h3>
                 <div className="mb-8 p-4 bg-bai-bone border-l-4 border-bai-blue">
                    <p className="font-bold">{selectedTour.event}</p>
                    <p className="text-sm text-bai-black/60">{selectedTour.city} - {selectedTour.date}</p>
                 </div>

                 {purchaseStatus === 'idle' && (
                    <form onSubmit={handleMockOzowPayment}>
                       <div className="mb-6">
                          <label className="block text-xs font-bold uppercase tracking-widest mb-2">Email Address for Tickets</label>
                          <input 
                             type="email" 
                             required
                             value={buyerEmail}
                             onChange={(e) => setBuyerEmail(e.target.value)}
                             className="w-full bg-white border-2 border-bai-black/20 p-4 font-bold outline-none focus:border-bai-blue transition-colors"
                             placeholder="you@example.com"
                          />
                       </div>

                       {/* Mock Ozow Gateway Description */}
                       <div className="mb-6 p-4 border border-dashed border-bai-black/20 flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center font-bold text-xs">OZOW</div>
                          <div className="text-sm">
                             <p className="font-bold">Ozow Secure Payment</p>
                             <p className="text-black/50 text-xs">A redirect to Ozow will occur in production</p>
                          </div>
                       </div>

                       <button 
                          type="submit"
                          className="w-full py-4 bg-bai-black hover:bg-bai-blue text-white font-display font-bold tracking-widest uppercase transition-colors"
                       >
                          Pay R150.00 Now
                       </button>
                    </form>
                 )}

                 {purchaseStatus === 'processing' && (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                       <div className="w-12 h-12 border-4 border-bai-blue border-t-transparent rounded-full animate-spin mb-4" />
                       <p className="font-bold uppercase tracking-wider">Processing Ozow Payment...</p>
                    </div>
                 )}

                 {purchaseStatus === 'success' && qrCodeDataUrl && (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                       <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                          <Ticket size={32} />
                       </div>
                       <h4 className="font-display font-bold text-2xl mb-2">Payment Successful!</h4>
                       <p className="text-bai-black/60 mb-8 max-w-sm">
                          Your ticket has been generated. Use the QR code below for entry. A copy has been sent to {buyerEmail}.
                       </p>
                       <div className="p-4 bg-white border-4 border-bai-black inline-block shadow-lg mb-4">
                          <img src={qrCodeDataUrl} alt="Ticket QR Code" className="w-48 h-48" />
                       </div>
                       <p className="font-mono text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded">Ticket ID: {createdTicketId}</p>
                    </div>
                 )}

                 {purchaseStatus === 'error' && (
                    <div className="py-10 text-center text-red-500">
                       <p className="font-bold">Payment failed or was cancelled.</p>
                       <button onClick={() => setPurchaseStatus('idle')} className="mt-4 border-b border-red-500">Try Again</button>
                    </div>
                 )}
              </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
}

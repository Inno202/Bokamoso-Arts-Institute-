import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { CreditCard, ShieldCheck, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../components/AuthProvider';
import { ROUTES } from '../../controllers/navigation';
import { ticketController } from '../../controllers/ticketController';
import QRCode from 'qrcode';

export default function Checkout() {
  const { items, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(ROUTES.LOGIN, { state: { from: ROUTES.CHECKOUT } });
    }
  }, [user, authLoading, navigate]);

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const fee = items.length > 0 ? 15.00 : 0;
  const total = subtotal + fee;

  const generateTicketRef = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = 'BAI-';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || items.length === 0) return;

    setLoading(true);
    try {
      // Simulate payment delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('Generating tickets for', items.length, 'items');

      // Generate tickets for each item in cart
      for (const item of items) {
        console.log('Processing item:', item.eventName, 'quantity:', item.quantity);
        for (let i = 0; i < item.quantity; i++) {
          const ticketRef = generateTicketRef();
          let qrCodeDataUrl = '';
          
          try {
            qrCodeDataUrl = await QRCode.toDataURL(ticketRef);
          } catch (qrErr) {
            console.error('QR Code generation failed:', qrErr);
            // Continue without QR code if needed, or use placeholder
            qrCodeDataUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + ticketRef;
          }

          const ticketResult = await ticketController.createTicket({
            eventId: item.eventId || '',
            eventName: item.eventName || 'Event',
            ticketType: item.ticketType || 'General Admission',
            buyerId: user.uid,
            buyerEmail: user.email || 'customer@example.com',
            price: item.price || 0,
            quantity: 1,
            qrCode: qrCodeDataUrl,
            status: 'VALID' as const,
            id: ticketRef,
            ticketImageUrl: item.ticketImageUrl || ''
          });
          console.log('Ticket created successfully:', ticketResult.id);
        }
      }

      setSuccess(true);
      clearCart();
      setTimeout(() => {
        navigate(ROUTES.MY_TICKETS);
      }, 3000);
    } catch (err: any) {
      console.error('Payment/Ticket generation failed:', err);
      alert('Internal error during ticket generation: ' + (err.message || 'Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0 && !success) {
    navigate(ROUTES.EVENTS);
    return null;
  }

  if (success) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-8"
        >
          <CheckCircle size={48} />
        </motion.div>
        <h1 className="font-display font-black text-4xl md:text-6xl uppercase tracking-tighter italic mb-4">Payment <span className="text-bai-red">Successful!</span></h1>
        <p className="text-bai-black/40 max-w-md italic mb-8">Your tickets have been generated. We're redirecting you to your ticket dashboard...</p>
        <div className="w-12 h-1 border-t-2 border-bai-red animate-pulse mx-auto" />
      </div>
    );
  }

  return (
    <div className="pb-24 bg-bai-bone min-h-screen">
      <div className="bg-bai-black text-white py-12 px-4 mb-12">
        <div className="max-w-7xl mx-auto">
          <span className="font-display font-bold uppercase tracking-[0.4em] text-bai-red text-[10px] mb-2 block">Step 2 of 2</span>
          <h1 className="font-display font-black text-4xl md:text-6xl tracking-tighter uppercase italic leading-none">Checkout <br /> <span className="text-bai-red">Complete.</span></h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Payment Form */}
          <div className="order-2 md:order-1">
            <h2 className="font-display font-black text-2xl uppercase italic mb-8">Payment Details</h2>
            <form onSubmit={handlePay} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-bai-black/40 mb-2">Card Holder</label>
                  <input required type="text" className="w-full h-12 px-4 bg-white border border-bai-black/5 rounded-xl outline-none focus:border-bai-red transition-all font-medium" placeholder="Full Name" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-bai-black/40 mb-2">Card Number</label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-bai-black/20" size={18} />
                    <input required type="text" className="w-full h-12 pl-12 pr-4 bg-white border border-bai-black/5 rounded-xl outline-none focus:border-bai-red transition-all font-medium" placeholder="0000 0000 0000 0000" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-bai-black/40 mb-2">Expiry</label>
                    <input required type="text" className="w-full h-12 px-4 bg-white border border-bai-black/5 rounded-xl outline-none focus:border-bai-red transition-all font-medium" placeholder="MM/YY" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-bai-black/40 mb-2">CVV</label>
                    <input required type="text" className="w-full h-12 px-4 bg-white border border-bai-black/5 rounded-xl outline-none focus:border-bai-red transition-all font-medium" placeholder="123" />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 text-bai-blue rounded-xl flex items-start space-x-3">
                <ShieldCheck size={20} className="shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold leading-relaxed uppercase tracking-tight">Your payment is secured with industry-standard encryption. No card details are stored on our servers.</p>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full h-16 bg-bai-black text-white font-display font-black uppercase tracking-widest rounded-xl hover:bg-bai-red transition-all flex items-center justify-center space-x-4 shadow-xl disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Pay R{total.toFixed(2)}</span>
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="order-1 md:order-2">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-bai-black/5">
              <h2 className="font-display font-black text-xl uppercase italic mb-6">Order Summary</h2>
              <div className="space-y-4 mb-8">
                {items.map(item => (
                  <div key={item.eventId} className="flex justify-between items-center text-sm">
                    <div className="flex-grow">
                      <p className="font-bold uppercase tracking-tight">{item.eventName}</p>
                      <p className="text-[10px] text-bai-black/40 font-bold uppercase tracking-widest">{item.quantity}x {item.ticketType}</p>
                    </div>
                    <span className="font-display font-bold">R{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3 pt-6 border-t border-bai-black/5">
                <div className="flex justify-between text-xs text-bai-black/40 font-bold uppercase tracking-widest">
                  <span>Subtotal</span>
                  <span>R{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-bai-black/40 font-bold uppercase tracking-widest">
                  <span>Ticketing Fee</span>
                  <span>R{fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-bai-black/5 mt-4">
                  <span className="font-display font-black uppercase tracking-widest text-xs">Total</span>
                  <span className="font-display font-black text-3xl text-bai-red">R{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

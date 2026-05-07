import { useState } from 'react';
import { Minus, Plus, Trash2, ShoppingBag, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../components/AuthProvider';
import { ROUTES } from '../../controllers/navigation';
import { Link, useNavigate } from 'react-router-dom';
import { cloudinaryService } from '../../services/cloudinaryService';

export default function Cart() {
  const { items, updateQuantity, removeFromCart, clearCart, totalItems } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const fee = items.length > 0 ? 15.00 : 0;
  const total = subtotal + fee;

  const handleCheckout = () => {
    if (!user) {
      navigate(ROUTES.LOGIN, { state: { from: ROUTES.CART } });
    } else {
      navigate(ROUTES.CHECKOUT);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="w-24 h-24 bg-bai-bone rounded-full flex items-center justify-center mb-6 text-bai-black/10">
           <ShoppingBag size={48} />
        </div>
        <h2 className="font-display font-black text-3xl uppercase tracking-tighter italic mb-4">Your cart is empty</h2>
        <p className="text-bai-black/40 text-center max-w-xs mb-8 italic">Looks like you haven't added any tickets yet. Explore our upcoming events to get started.</p>
        <Link to={ROUTES.EVENTS} className="h-14 px-10 bg-bai-black text-white font-display font-black uppercase tracking-widest rounded-xl hover:bg-bai-red transition-all flex items-center">
           Explore Events
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-24 bg-bai-bone min-h-screen">
      <div className="bg-bai-black text-white py-12 px-4 mb-12">
         <div className="max-w-7xl mx-auto flex items-end justify-between">
            <div>
               <span className="font-display font-bold uppercase tracking-[0.4em] text-bai-red text-[10px] mb-2 block">Checkout Journey</span>
               <h1 className="font-display font-black text-4xl md:text-6xl tracking-tighter uppercase italic leading-none">Your <span className="text-bai-red">Bag.</span></h1>
            </div>
            <div className="hidden md:block text-right">
               <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">Items Summary</p>
               <p className="font-display font-black text-2xl">{totalItems} Tickets</p>
            </div>
         </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Items List */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {items.map((item) => (
                <motion.div 
                  key={`${item.eventId}-${item.ticketType}`}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-bai-black/5 flex items-center gap-6 group hover:border-bai-red transition-all"
                >
                  <div className="w-24 h-16 md:w-40 md:h-24 bg-bai-black rounded-lg overflow-hidden shrink-0 shadow-inner">
                     <img 
                        src={cloudinaryService.getOptimizedUrl(item.ticketImageUrl || 'https://images.unsplash.com/photo-1514525253344-f81bad3b3fc2?w=800')} 
                        alt={item.eventName}
                        className="w-full h-full object-cover"
                     />
                  </div>

                  <div className="flex-grow">
                     <div className="flex justify-between items-start mb-2">
                        <div>
                           <h3 className="font-display font-black text-base md:text-xl uppercase tracking-tighter italic leading-tight">{item.eventName}</h3>
                           <p className="text-bai-black/30 text-[9px] font-bold uppercase tracking-widest">{item.venue} — {item.date?.seconds ? new Date(item.date.seconds * 1000).toLocaleDateString() : item.date}</p>
                        </div>
                        <button 
                          onClick={() => removeFromCart(item.eventId, item.ticketType)}
                          className="p-2 text-bai-black/20 hover:text-bai-red transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                     </div>

                     <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center bg-bai-bone rounded-lg p-1 border border-bai-black/5">
                           <button 
                             onClick={() => updateQuantity(item.eventId, item.ticketType, -1)}
                             className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-md transition-colors"
                           >
                             <Minus size={14} />
                           </button>
                           <span className="w-10 text-center font-display font-black text-sm">{item.quantity}</span>
                           <button 
                             onClick={() => updateQuantity(item.eventId, item.ticketType, 1)}
                             className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-md transition-colors"
                           >
                             <Plus size={14} />
                           </button>
                        </div>
                        <div className="text-right">
                           <p className="text-[9px] font-bold uppercase text-bai-black/30 mb-1">R{item.price} each</p>
                           <p className="font-display font-black text-lg text-bai-red">R{(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                     </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <div className="pt-8 flex justify-between items-center">
               <button 
                 onClick={() => setIsConfirmClearOpen(true)}
                 className="text-[10px] font-bold uppercase tracking-[0.2em] text-bai-black/30 hover:text-bai-red transition-all"
               >
                 Clear Entire Bag
               </button>
               <Link to={ROUTES.EVENTS} className="text-[10px] font-bold uppercase tracking-[0.2em] text-bai-blue flex items-center space-x-2">
                  <span>Add More Events</span>
                  <Plus size={14} />
               </Link>
            </div>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
             <div className="bg-white rounded-[2rem] p-8 shadow-2xl border-t-8 border-bai-black sticky top-28">
                <h2 className="font-display font-black text-2xl uppercase tracking-tighter italic mb-8">Summary</h2>
                
                <div className="space-y-4 mb-8">
                   <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-bai-black/40 uppercase tracking-widest text-[10px]">Subtotal</span>
                      <span className="font-display font-bold">R{subtotal.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-bai-black/40 uppercase tracking-widest text-[10px]">Ticketing Fee</span>
                      <span className="font-display font-bold">R{fee.toFixed(2)}</span>
                   </div>
                   <div className="pt-4 border-t border-bai-black/5 flex justify-between items-center">
                      <span className="font-display font-black uppercase tracking-widest text-xs">Grand Total</span>
                      <span className="font-display font-black text-3xl text-bai-red">R{total.toFixed(2)}</span>
                   </div>
                </div>

                <div className="space-y-4">
                   <button 
                     onClick={handleCheckout}
                     className="w-full h-16 bg-bai-black text-white font-display font-black uppercase tracking-widest hover:bg-bai-red transition-all flex items-center justify-center space-x-4 rounded-xl shadow-xl active:scale-95"
                   >
                     <span>Secure Checkout</span>
                     <CreditCard size={20} />
                   </button>
                   
                   <div className="flex items-center justify-center space-x-4 opacity-30 grayscale pt-4">
                      <div className="font-black text-[12px]">OZOW</div>
                      <div className="font-black text-[12px]">VISA</div>
                      <div className="font-black text-[12px]">MASTER</div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <AnimatePresence>
        {isConfirmClearOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl w-full max-w-xs overflow-hidden border-t-8 border-bai-red shadow-2xl"
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                   <Trash2 size={32} />
                </div>
                <h3 className="font-display font-black text-xl uppercase tracking-tighter mb-2">Clear Bag?</h3>
                <p className="text-bai-black/40 text-xs italic mb-8">This will remove all items from your shopping bag. You can't undo this.</p>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setIsConfirmClearOpen(false)}
                    className="h-12 border-2 border-bai-black/10 text-bai-black font-bold uppercase tracking-widest text-[10px] rounded-lg hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => { clearCart(); setIsConfirmClearOpen(false); }}
                    className="h-12 bg-bai-red text-white font-bold uppercase tracking-widest text-[10px] rounded-lg shadow-lg shadow-bai-red/20 hover:brightness-110 transition-all"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

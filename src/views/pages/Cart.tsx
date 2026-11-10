import { useEffect, useState } from 'react';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart, TICKETING_FEE } from '../../hooks/useCart';
import { useAuth } from '../components/AuthProvider';
import { ROUTES } from '../../controllers/navigation';
import { Link, useNavigate } from 'react-router-dom';
import { cloudinaryService } from '../../services/cloudinaryService';
import { eventController } from '../../controllers/eventController';
import { MAX_PER_EVENT } from '../../controllers/cartController';
import { formatCurrency, formatDate } from '../../controllers/lib/utils';
import { FALLBACK_EVENT_IMAGE, PAYMENTS_LIVE } from '../../config';

export default function Cart() {
  const { items, updateQuantity, removeFromCart, clearCart, totalItems, subtotal, loading } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [images, setImages] = useState<Record<string, string>>({});

  // Artwork is looked up from the event (cached) rather than copied into every cart line.
  const eventIds = items.map(i => i.eventId).join(',');
  useEffect(() => {
    let active = true;
    Promise.all(eventIds.split(',').filter(Boolean).map(id => eventController.getEventById(id).catch(() => null))).then(events => {
      if (!active) return;
      setImages(Object.fromEntries(events.filter(e => !!e).map(e => [e!.id, cloudinaryService.getOptimizedUrl(e!.ticketImageUrl || e!.bannerImageUrl, 400)])));
    });
    return () => { active = false; };
  }, [eventIds]);

  const fee = items.length > 0 && PAYMENTS_LIVE ? TICKETING_FEE : 0;
  const total = subtotal + fee;

  const handleCheckout = () => {
    if (!user) navigate(ROUTES.LOGIN, { state: { from: ROUTES.CHECKOUT } });
    else navigate(ROUTES.CHECKOUT);
  };

  const handleClear = () => {
    if (window.confirm('Remove every ticket from your bag?')) clearCart();
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" role="status" aria-label="Loading your bag">
        <div className="w-10 h-10 border-4 border-bai-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 text-center">
        <ShoppingBag size={56} className="text-bai-black/25 mb-6" aria-hidden="true" />
        <h1 className="display text-3xl  mb-4">Your bag is empty</h1>
        <p className="text-bai-black/70 max-w-xs mb-8">Pick a performance and your tickets will wait here until you check out.</p>
        <Link to={ROUTES.EVENTS} className="btn btn-lg btn-primary">
          See upcoming events
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-24 bg-bai-bone min-h-screen">
      <div className="bg-bai-black text-white py-12 px-4 mb-12">
        <div className="max-w-7xl mx-auto sm:px-2 lg:px-4 flex items-end justify-between gap-6">
          <h1 className="display text-4xl md:text-6xl ">Your <span className="text-bai-red-soft">bag.</span></h1>
          <p className="num font-display font-bold text-xl md:text-2xl">{totalItems} {totalItems === 1 ? 'ticket' : 'tickets'}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2">
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={`${item.eventId}-${item.ticketType}`} className="bg-white rounded-2xl p-4 md:p-6 border border-bai-black/10 flex items-center gap-4 md:gap-6">
                  <div className="w-20 h-20 md:w-36 md:h-24 bg-bai-black rounded-lg overflow-hidden shrink-0">
                    <img src={images[item.eventId] || FALLBACK_EVENT_IMAGE} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <h2 className="font-display font-bold text-base md:text-xl uppercase tracking-tight italic leading-tight break-words">{item.eventName}</h2>
                        <p className="text-bai-black/70 text-sm mt-1">{[item.venue, formatDate(item.date)].filter(Boolean).join(' · ')}</p>
                      </div>
                      <button onClick={() => removeFromCart(item.eventId, item.ticketType)} aria-label={`Remove ${item.eventName} from your bag`} className="w-11 h-11 -mt-2 -mr-2 shrink-0 flex items-center justify-center text-bai-black/60 hover:text-bai-red transition-colors rounded-full">
                        <Trash2 size={18} aria-hidden="true" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-3 gap-4">
                      <div className="flex items-center bg-bai-bone rounded-lg border border-bai-black/10" role="group" aria-label={`Quantity for ${item.eventName}`}>
                        <button onClick={() => updateQuantity(item.eventId, item.ticketType, -1)} disabled={item.quantity <= 1} aria-label="One ticket fewer" className="w-11 h-11 flex items-center justify-center hover:bg-white rounded-md transition-colors disabled:opacity-40">
                          <Minus size={16} aria-hidden="true" />
                        </button>
                        <span className="num w-8 text-center font-display font-bold" aria-live="polite">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.eventId, item.ticketType, 1)} disabled={item.quantity >= MAX_PER_EVENT} aria-label="One ticket more" className="w-11 h-11 flex items-center justify-center hover:bg-white rounded-md transition-colors disabled:opacity-40">
                          <Plus size={16} aria-hidden="true" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="num text-xs text-bai-black/70">{formatCurrency(item.price)} each</p>
                        <p className="num font-display font-bold text-lg text-bai-red">{formatCurrency(item.price * item.quantity)}</p>
                      </div>
                    </div>
                    {item.quantity >= MAX_PER_EVENT && <p className="text-xs text-bai-black/70 mt-2">{MAX_PER_EVENT} tickets is the most one order can hold for an event.</p>}
                  </div>
                </li>
              ))}
            </ul>

            <div className="pt-6 flex justify-between items-center gap-4">
              <button onClick={handleClear} className="text-sm font-semibold text-bai-black/70 hover:text-bai-red transition-colors py-2 underline">
                Empty bag
              </button>
              <Link to={ROUTES.EVENTS} className="text-sm font-bold text-bai-blue flex items-center gap-2 py-2">
                <span>Add more events</span>
                <Plus size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <aside className="lg:col-span-1" aria-labelledby="bag-summary">
            <div className="bg-white rounded-2xl p-6 sm:p-8 border-t-8 border-bai-black shadow-[0_24px_60px_-28px_rgb(0_0_0/0.4)] sticky top-28">
              <h2 id="bag-summary" className="display text-2xl  mb-6">Summary</h2>
              <dl className="space-y-3 mb-8 text-sm">
                <div className="flex justify-between">
                  <dt className="text-bai-black/70">Subtotal</dt>
                  <dd className="num font-display font-bold">{formatCurrency(subtotal)}</dd>
                </div>
                {fee > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-bai-black/70">Ticketing fee</dt>
                    <dd className="num font-display font-bold">{formatCurrency(fee)}</dd>
                  </div>
                )}
                <div className="pt-4 border-t border-bai-black/10 flex justify-between items-baseline">
                  <dt className="font-display font-bold uppercase tracking-widest text-xs">Total</dt>
                  <dd className="num font-display font-bold text-3xl text-bai-red">{formatCurrency(total)}</dd>
                </div>
              </dl>
              <button onClick={handleCheckout} className="btn btn-lg btn-primary btn-block">
                <span>{user ? 'Checkout' : 'Sign in to checkout'}</span>
                <ArrowRight size={20} aria-hidden="true" />
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

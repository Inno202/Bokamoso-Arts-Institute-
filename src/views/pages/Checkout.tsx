import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Loader2, CheckCircle, Info } from 'lucide-react';
import { useCart, TICKETING_FEE } from '../../hooks/useCart';
import { useAuth } from '../components/AuthProvider';
import { ROUTES } from '../../controllers/navigation';
import { ticketController } from '../../controllers/ticketController';
import { formatCurrency, friendlyError } from '../../controllers/lib/utils';
import { logger } from '../../services/loggerService';
import { PAYMENTS_LIVE } from '../../config';

export default function Checkout() {
  const { items, subtotal, clearCart, loading: cartLoading } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [issued, setIssued] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fee = items.length > 0 && PAYMENTS_LIVE ? TICKETING_FEE : 0;
  const total = subtotal + fee;

  useEffect(() => {
    if (!issued) return;
    const timer = setTimeout(() => navigate(ROUTES.MY_TICKETS, { replace: true }), 2500);
    return () => clearTimeout(timer);
  }, [issued, navigate]);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || items.length === 0 || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const ids = await ticketController.purchase(user, items);
      setIssued(ids.length);
      clearCart();
    } catch (err) {
      logger.error('Checkout failed', err);
      setError(friendlyError(err, 'Your tickets could not be issued. Nothing was charged. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (issued > 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center" role="status">
        <div className="w-24 h-24 bg-green-100 text-green-700 rounded-full flex items-center justify-center mb-8">
          <CheckCircle size={48} aria-hidden="true" />
        </div>
        <h1 className="font-display font-bold text-4xl md:text-6xl uppercase tracking-tighter italic mb-4">
          {issued === 1 ? 'Your ticket is' : 'Your tickets are'} <span className="text-bai-red">ready.</span>
        </h1>
        <p className="text-bai-black/70 max-w-md mb-8">Taking you to your tickets now.</p>
        <Link to={ROUTES.MY_TICKETS} className="text-sm font-bold text-bai-blue underline">Go to my tickets</Link>
      </div>
    );
  }

  if (cartLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" role="status" aria-label="Loading your bag">
        <div className="w-10 h-10 border-4 border-bai-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) return <Navigate to={ROUTES.EVENTS} replace />;

  return (
    <div className="pb-24 bg-bai-bone min-h-screen">
      <div className="bg-bai-black text-white py-12 px-4 mb-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-display font-bold text-4xl md:text-6xl tracking-tighter uppercase italic leading-none">
            Confirm your <span className="text-bai-red-soft">order.</span>
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          <section className="md:col-span-3" aria-labelledby="summary-heading">
            <h2 id="summary-heading" className="font-display font-bold text-xl uppercase italic mb-6">Order summary</h2>
            <ul className="divide-y divide-bai-black/10 border-y border-bai-black/10">
              {items.map(item => (
                <li key={`${item.eventId}-${item.ticketType}`} className="py-4 flex justify-between items-start gap-4">
                  <div>
                    <p className="font-bold uppercase tracking-tight">{item.eventName}</p>
                    <p className="text-sm text-bai-black/70">{item.quantity} × {item.ticketType}</p>
                  </div>
                  <span className="num font-display font-bold whitespace-nowrap">{formatCurrency(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between text-bai-black/70">
                <dt>Subtotal</dt>
                <dd className="num">{formatCurrency(subtotal)}</dd>
              </div>
              {fee > 0 && (
                <div className="flex justify-between text-bai-black/70">
                  <dt>Ticketing fee</dt>
                  <dd className="num">{formatCurrency(fee)}</dd>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-4 mt-2 border-t border-bai-black/10">
                <dt className="font-display font-bold uppercase tracking-widest text-xs">Total</dt>
                <dd className="num font-display font-bold text-3xl text-bai-red">{formatCurrency(total)}</dd>
              </div>
            </dl>
          </section>

          <form onSubmit={handleConfirm} className="md:col-span-2 space-y-5">
            {!PAYMENTS_LIVE && (
              <div className="p-4 bg-blue-50 text-blue-950 rounded-xl flex items-start gap-3">
                <Info size={20} className="shrink-0 mt-0.5 text-bai-blue" aria-hidden="true" />
                <p className="text-sm leading-relaxed">
                  <strong>Card payments are not live yet.</strong> Confirming issues your tickets now and does not charge you. We never ask for card details on this page.
                </p>
              </div>
            )}

            <p className="text-sm text-bai-black/70">
              Tickets will be issued to <strong className="text-bai-black break-all">{user?.email}</strong> and appear under My Tickets.
            </p>

            {error && (
              <p role="alert" className="p-4 bg-red-50 text-red-800 text-sm rounded-xl">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-16 bg-bai-black text-white font-display font-bold uppercase tracking-widest rounded-xl hover:bg-bai-red transition-colors flex items-center justify-center gap-4 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={20} aria-hidden="true" />
                  <span>Issuing tickets</span>
                </>
              ) : (
                <>
                  <span>Confirm order</span>
                  <ArrowRight size={20} aria-hidden="true" />
                </>
              )}
            </button>
            <Link to={ROUTES.CART} className="block text-center text-sm font-bold text-bai-blue underline py-2">Back to your bag</Link>
          </form>
        </div>
      </div>
    </div>
  );
}

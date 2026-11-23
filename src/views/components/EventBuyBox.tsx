import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, ExternalLink, Ticket } from 'lucide-react';
import { currencyOf, sellsElsewhere } from '../../models/currency';
import { ticketTypesOf, type EventTicketType } from '../../models/ticketTypes';
import type { BAIEvent } from '../../models/types';
import { useCart } from '../../hooks/useCart';
import { useAuth } from './AuthProvider';
import { ROUTES } from '../../controllers/navigation';
import { formatCurrency } from '../../controllers/lib/utils';
import { toast } from '../../services/toast';
import { WaitlistButton } from './WaitlistButton';

/** Seats left for the whole event and each ticket type, and whether it is sold out. */
export function availability(event: BAIEvent) {
  const elsewhere = sellsElsewhere(event);
  const types = ticketTypesOf(event);
  const eventLeft = Math.max(0, (event.capacity || 0) - (event.ticketsSold || 0));
  // Seats for shows sold elsewhere are counted by that seller, not here.
  const soldOut = !elsewhere && (eventLeft === 0 || types.every(t => t.remaining === 0));
  return { elsewhere, types, eventLeft, soldOut };
}

/**
 * Choosing a ticket type and adding it to the bag (or the outside seller's link),
 * shared by the event cards and the event's own page.
 */
export function EventBuyBox({ event, idPrefix = 'card' }: { event: BAIEvent; idPrefix?: string }) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [chosen, setChosen] = useState<string>('');
  const [added, setAdded] = useState(false);
  const { elsewhere, types, eventLeft, soldOut } = availability(event);
  const multi = types.length > 1;
  const type = types.find(t => t.id === chosen) || types.find(t => t.remaining > 0) || types[0];
  const remaining = Math.min(type.remaining, eventLeft);

  const add = (t: EventTicketType) => {
    if (!user) {
      toast.info('Sign in to book tickets.');
      navigate(ROUTES.LOGIN, { state: { from: location.pathname } });
      return;
    }
    addToCart({
      eventId: event.id,
      eventName: event.name,
      venue: event.venue,
      date: event.date,
      ticketType: t.name,
      ticketTypeId: t.id,
      price: t.price,
      currency: currencyOf(event.currency),
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (elsewhere) {
    return (
      <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer" className="btn btn-block btn-primary">
        <span>Buy tickets on {event.ticketProvider || 'the seller\'s site'}</span>
        <ExternalLink size={18} aria-hidden="true" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    );
  }

  return (
    <>
      {multi && !soldOut && (
        <fieldset className="mb-4">
          <legend className="text-sm font-semibold mb-2">Ticket type</legend>
          <div className="space-y-2">
            {types.map(t => {
              const out = t.remaining === 0;
              return (
                <label key={t.id} className={`flex items-center gap-3 min-h-[44px] px-3 rounded-xl border transition-colors ${out ? 'opacity-50 cursor-not-allowed border-bai-black/10' : type.id === t.id ? 'border-bai-black bg-bai-sand/60' : 'border-bai-black/15 hover:border-bai-black/40 cursor-pointer'}`}>
                  <input
                    type="radio"
                    name={`${idPrefix}-type-${event.id}`}
                    value={t.id}
                    checked={type.id === t.id}
                    disabled={out}
                    onChange={() => setChosen(t.id)}
                    className="accent-bai-red w-4 h-4 shrink-0"
                  />
                  <span className="flex-grow min-w-0 truncate font-medium">{t.name}</span>
                  <span className="num text-sm font-semibold shrink-0">{out ? 'Sold out' : t.price > 0 ? formatCurrency(t.price, event.currency) : 'Free'}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
      {!soldOut && remaining <= 20 && (
        <p className="num text-sm font-semibold text-bai-red-deep mb-3">Only {remaining} {remaining === 1 ? 'seat' : 'seats'} left</p>
      )}
      {soldOut ? (
        <WaitlistButton event={event} />
      ) : (
        <button onClick={() => add(type)} disabled={added} className={`btn btn-block ${added ? 'bg-green-700 text-white' : 'btn-primary'}`}>
          {added
            ? <><CheckCircle2 size={18} aria-hidden="true" /><span>Added to your bag</span></>
            : <><span>Add ticket to bag</span><Ticket size={18} className="btn-arrow" aria-hidden="true" /></>}
        </button>
      )}
    </>
  );
}

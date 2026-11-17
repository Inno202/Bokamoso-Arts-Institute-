import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Ticket, MapPin, Search, CheckCircle2, ExternalLink } from 'lucide-react';
import { currencyOf, sellsElsewhere } from '../../models/currency';
import { priceRange, ticketTypesOf, type EventTicketType } from '../../models/ticketTypes';
import { eventController } from '../../controllers/eventController';
import { BAIEvent } from '../../models/types';
import { cloudinaryService } from '../../services/cloudinaryService';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../components/AuthProvider';
import { useContent } from '../../content/store';
import { PageHero } from '../components/PageHero';
import { ROUTES } from '../../controllers/navigation';
import { eventHasEnded, formatCurrency, formatDate, formatTime } from '../../controllers/lib/utils';
import { FALLBACK_EVENT_IMAGE } from '../../config';
import { ZoomablePhoto } from '../components/ZoomablePhoto';
import { toast } from '../../services/toast';

export default function Events() {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { eventsHeroImage } = useContent('site');
  const navigate = useNavigate();
  const [events, setEvents] = useState<BAIEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => eventController.subscribeToEvents((data) => {
    setEvents(data);
    setFailed(false);
    setLoading(false);
  }, true, () => {
    setFailed(true);
    setLoading(false);
  }), []);

  const term = searchTerm.trim().toLowerCase();
  // Shows that are over drop off the list by themselves, even if nobody closes them.
  const current = events.filter(e => !eventHasEnded(e.date));
  const filteredEvents = term
    ? current.filter(e => [e.name, e.city, e.venue].some(v => (v || '').toLowerCase().includes(term)))
    : current;

  // The ticket type chosen on each card (cards with one type need no choice).
  const [chosenType, setChosenType] = useState<Record<string, string>>({});

  const handleAddToCart = (event: BAIEvent, type: EventTicketType) => {
    if (!user) {
      toast.info('Sign in to book tickets.');
      navigate(ROUTES.LOGIN, { state: { from: ROUTES.EVENTS } });
      return;
    }
    addToCart({
      eventId: event.id,
      eventName: event.name,
      venue: event.venue,
      date: event.date,
      ticketType: type.name,
      ticketTypeId: type.id,
      price: type.price,
      currency: currencyOf(event.currency),
      quantity: 1,
    });
    setAddedIds(prev => new Set(prev).add(event.id));
    setTimeout(() => setAddedIds(prev => {
      const next = new Set(prev);
      next.delete(event.id);
      return next;
    }), 2000);
  };

  return (
    <div className="pb-24">
      <PageHero title="Live" accent="stage" image={eventsHeroImage} />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 md:pt-14" aria-label="Events" aria-busy={loading}>
        <div className="mb-10 max-w-md relative">
          <label htmlFor="event-search" className="sr-only">Search events by name, city or venue</label>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-bai-ink-soft" size={20} aria-hidden="true" />
          <input
            id="event-search"
            type="search"
            placeholder="Search by event, city or venue"
            className="field pl-12 rounded-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="status" aria-label="Loading events">
            {[1, 2, 3].map(i => <div key={i} className="h-[30rem] bg-bai-sand animate-pulse rounded-3xl" />)}
          </div>
        ) : failed ? (
          <div className="panel py-20 px-6 text-center" role="alert">
            <h2 className="display text-3xl">Events could not be loaded</h2>
            <p className="text-bai-ink-soft mt-3">Check your connection and reload the page.</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="panel py-20 px-6 text-center">
            <h2 className="display text-3xl">
              {term ? 'No events match your search' : 'No events on sale right now'}
            </h2>
            <p className="text-bai-ink-soft mt-3">
              {term ? 'Try a different name or city.' : 'New performances are announced here first. Check back soon.'}
            </p>
            {term && <button onClick={() => setSearchTerm('')} className="btn btn-outline mt-6">Clear search</button>}
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => {
              const elsewhere = sellsElsewhere(event);
              const types = ticketTypesOf(event);
              const multi = types.length > 1;
              const type = types.find(t => t.id === chosenType[event.id]) || types.find(t => t.remaining > 0) || types[0];
              const eventLeft = Math.max(0, (event.capacity || 0) - (event.ticketsSold || 0));
              const remaining = Math.min(type.remaining, eventLeft);
              const range = priceRange(event);
              // Seats for shows sold elsewhere are counted by that seller, not here.
              const soldOut = !elsewhere && (eventLeft === 0 || types.every(t => t.remaining === 0));
              const added = addedIds.has(event.id);
              const when = formatDate(event.date, { weekday: 'short', day: 'numeric', month: 'short' });
              return (
                <li key={event.id} className="group lift panel overflow-hidden flex flex-col">
                  {/* Every picture is cropped to the same frame, whatever shape was uploaded. */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-bai-sand">
                    <ZoomablePhoto
                      src={cloudinaryService.getOptimizedUrl(event.bannerImageUrl || event.ticketImageUrl) || FALLBACK_EVENT_IMAGE}
                      largeSrc={cloudinaryService.getOptimizedUrl(event.bannerImageUrl || event.ticketImageUrl, 2000) || FALLBACK_EVENT_IMAGE}
                      alt={`Poster for ${event.name}`}
                      className={`w-full h-full object-cover photo-zoom ${soldOut ? 'grayscale' : ''}`}
                      iconCorner="bottom-right"
                      imgProps={{ onError: (e) => { if (!e.currentTarget.dataset.fallback) { e.currentTarget.dataset.fallback = '1'; e.currentTarget.src = FALLBACK_EVENT_IMAGE; } } }}
                    />
                    <span className="num pointer-events-none absolute top-4 right-4 bg-white px-3.5 py-1.5 rounded-full font-semibold text-sm">
                      {range.max === 0 ? 'Free' : multi && range.min !== range.max ? `From ${range.min > 0 ? formatCurrency(range.min, event.currency) : 'Free'}` : formatCurrency(range.max, event.currency)}
                    </span>
                    {soldOut && <span className="pointer-events-none absolute top-4 left-4 bg-bai-black text-white text-sm font-semibold px-3.5 py-1.5 rounded-full">Sold out</span>}
                  </div>

                  <div className="p-6 flex flex-col flex-grow">
                    <p className="num flex items-center gap-2 text-bai-red-deep font-semibold">
                      <Calendar size={16} aria-hidden="true" />
                      <span>{when}{formatTime(event.date) ? ` · ${formatTime(event.date)}` : ''}</span>
                    </p>
                    <h2 className="font-serif font-semibold text-3xl leading-tight mt-2 line-clamp-2 break-words">{event.name}</h2>
                    <p className="flex items-center gap-1.5 text-bai-ink-soft mt-2">
                      <MapPin size={16} className="shrink-0" aria-hidden="true" />
                      <span className="truncate">{[event.venue, event.city].filter(Boolean).join(', ')}</span>
                    </p>
                    {event.description && <p className="text-bai-ink-soft leading-relaxed mt-3 line-clamp-2">{event.description}</p>}

                    <div className="mt-auto pt-6">
                      {elsewhere ? (
                        <a
                          href={event.ticketUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-block btn-primary"
                        >
                          <span>Buy tickets on {event.ticketProvider || 'the seller\'s site'}</span>
                          <ExternalLink size={18} aria-hidden="true" />
                          <span className="sr-only">(opens in a new tab)</span>
                        </a>
                      ) : (<>
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
                                    name={`type-${event.id}`}
                                    value={t.id}
                                    checked={type.id === t.id}
                                    disabled={out}
                                    onChange={() => setChosenType(c => ({ ...c, [event.id]: t.id }))}
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
                      <button
                        onClick={() => handleAddToCart(event, type)}
                        disabled={soldOut || added}
                        className={`btn btn-block ${added ? 'bg-green-700 text-white' : 'btn-primary'}`}
                      >
                        {added ? (
                          <><CheckCircle2 size={18} aria-hidden="true" /><span>Added to your bag</span></>
                        ) : soldOut ? (
                          <span>Sold out</span>
                        ) : (
                          <><span>Add ticket to bag</span><Ticket size={18} className="btn-arrow" aria-hidden="true" /></>
                        )}
                      </button>
                      </>)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

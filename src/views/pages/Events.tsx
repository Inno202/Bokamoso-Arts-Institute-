import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Ticket, MapPin, Search, CheckCircle2 } from 'lucide-react';
import { eventController } from '../../controllers/eventController';
import { BAIEvent } from '../../models/types';
import { cloudinaryService } from '../../services/cloudinaryService';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../components/AuthProvider';
import { useContent } from '../../content/store';
import { PageHero } from '../components/PageHero';
import { ROUTES } from '../../controllers/navigation';
import { formatCurrency, formatDate, formatTime } from '../../controllers/lib/utils';
import { FALLBACK_EVENT_IMAGE } from '../../config';
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
  const filteredEvents = term
    ? events.filter(e => [e.name, e.city, e.venue].some(v => (v || '').toLowerCase().includes(term)))
    : events;

  const handleAddToCart = (event: BAIEvent) => {
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
      ticketType: 'General Admission',
      price: event.price,
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
              const remaining = Math.max(0, (event.capacity || 0) - (event.ticketsSold || 0));
              const soldOut = remaining === 0;
              const added = addedIds.has(event.id);
              const when = formatDate(event.date, { weekday: 'short', day: 'numeric', month: 'short' });
              return (
                <li key={event.id} className="group lift panel overflow-hidden flex flex-col">
                  {/* Every picture is cropped to the same frame, whatever shape was uploaded. */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-bai-sand">
                    <img
                      src={cloudinaryService.getOptimizedUrl(event.bannerImageUrl || event.ticketImageUrl) || FALLBACK_EVENT_IMAGE}
                      alt=""
                      onError={(e) => { if (!e.currentTarget.dataset.fallback) { e.currentTarget.dataset.fallback = '1'; e.currentTarget.src = FALLBACK_EVENT_IMAGE; } }}
                      loading="lazy"
                      decoding="async"
                      className={`w-full h-full object-cover photo-zoom ${soldOut ? 'grayscale' : ''}`}
                    />
                    <span className="num absolute top-4 right-4 bg-white px-3.5 py-1.5 rounded-full font-semibold text-sm">
                      {event.price > 0 ? formatCurrency(event.price) : 'Free'}
                    </span>
                    {soldOut && <span className="absolute top-4 left-4 bg-bai-black text-white text-sm font-semibold px-3.5 py-1.5 rounded-full">Sold out</span>}
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
                      {!soldOut && remaining <= 20 && (
                        <p className="num text-sm font-semibold text-bai-red-deep mb-3">Only {remaining} {remaining === 1 ? 'seat' : 'seats'} left</p>
                      )}
                      <button
                        onClick={() => handleAddToCart(event)}
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

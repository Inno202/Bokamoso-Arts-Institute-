import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Ticket, MapPin, Search, CheckCircle2 } from 'lucide-react';
import { eventController } from '../../controllers/eventController';
import { BAIEvent } from '../../models/types';
import { cloudinaryService } from '../../services/cloudinaryService';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../components/AuthProvider';
import { PageHero } from '../components/PageHero';
import { ROUTES } from '../../controllers/navigation';
import { formatCurrency, formatDate, formatTime } from '../../controllers/lib/utils';
import { FALLBACK_EVENT_IMAGE } from '../../config';
import { toast } from '../../services/toast';

export default function Events() {
  const { addToCart } = useCart();
  const { user } = useAuth();
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
      <PageHero line1="Live" line2="stage." overlap>
        <p className="text-white/85 text-lg mt-6 max-w-xl">Upcoming performances by the Bokamoso choir. Book your seat here.</p>
        <div className="mt-8 max-w-xl relative">
          <label htmlFor="event-search" className="sr-only">Search events by name, city or venue</label>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70" size={20} aria-hidden="true" />
          <input
            id="event-search"
            type="search"
            placeholder="Search by event, city or venue"
            className="w-full h-14 pl-12 pr-6 bg-white/10 border-2 border-white/30 text-white placeholder:text-white/70 focus:border-white transition-colors rounded-lg text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </PageHero>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 md:-mt-20 relative z-20" aria-label="Events" aria-busy={loading}>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" role="status" aria-label="Loading events">
            {[1, 2, 3].map(i => <div key={i} className="aspect-[4/5] bg-white animate-pulse rounded-2xl" />)}
          </div>
        ) : failed ? (
          <div className="bg-white rounded-2xl py-20 px-6 text-center" role="alert">
            <h2 className="font-display font-bold text-2xl uppercase italic">Events could not be loaded</h2>
            <p className="text-bai-black/70 mt-3">Check your connection and reload the page.</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white rounded-2xl py-20 px-6 text-center">
            <h2 className="font-display font-bold text-2xl uppercase italic">
              {term ? 'No events match your search' : 'No events on sale right now'}
            </h2>
            <p className="text-bai-black/70 mt-3">
              {term ? 'Try a different name or city.' : 'New performances are announced here first. Check back soon.'}
            </p>
            {term && <button onClick={() => setSearchTerm('')} className="mt-6 link">Clear search</button>}
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((event) => {
              const remaining = Math.max(0, (event.capacity || 0) - (event.ticketsSold || 0));
              const soldOut = remaining === 0;
              const added = addedIds.has(event.id);
              return (
                <li key={event.id} className="bg-white rounded-2xl overflow-hidden border border-bai-black/10 shadow-[0_12px_32px_-16px_rgb(0_0_0/0.3)] group flex flex-col h-full transition-transform duration-200 hover:-translate-y-0.5">
                  <div className="w-full aspect-[3/4] relative overflow-hidden bg-bai-bone">
                    <img
                      src={cloudinaryService.getOptimizedUrl(event.ticketImageUrl || event.bannerImageUrl) || FALLBACK_EVENT_IMAGE}
                      alt=""
                      onError={(e) => { if (!e.currentTarget.dataset.fallback) { e.currentTarget.dataset.fallback = '1'; e.currentTarget.src = FALLBACK_EVENT_IMAGE; } }}
                      loading="lazy"
                      decoding="async"
                      className={`w-full h-full object-cover photo-zoom ${soldOut ? 'grayscale' : ''}`}
                    />
                    <span className="num absolute top-4 right-4 bg-white px-4 py-2 rounded-full font-display font-bold text-sm text-bai-black">
                      {event.price > 0 ? formatCurrency(event.price) : 'Free'}
                    </span>
                    <span className={`absolute bottom-4 left-4 text-white text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-sm ${soldOut ? 'bg-bai-black' : 'bg-bai-red'}`}>
                      {soldOut ? 'Sold out' : event.status}
                    </span>
                  </div>

                  <div className="p-6 sm:p-8 flex flex-col flex-grow">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <p className="num flex items-center gap-2 text-bai-red text-xs font-bold uppercase tracking-widest pt-1">
                        <Calendar size={14} aria-hidden="true" />
                        <span>{formatDate(event.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}{formatTime(event.date) ? `, ${formatTime(event.date)}` : ''}</span>
                      </p>
                    </div>

                    <h2 className="font-display font-bold text-2xl uppercase mb-2 leading-none break-words">{event.name}</h2>
                    <p className="flex items-center gap-1.5 text-bai-black/70 text-sm mb-4">
                      <MapPin size={14} className="shrink-0" aria-hidden="true" />
                      <span className="truncate">{[event.venue, event.city].filter(Boolean).join(', ')}</span>
                    </p>

                    {event.description && (
                      <p className="text-bai-black/70 text-sm leading-relaxed mb-6 line-clamp-3">{event.description}</p>
                    )}

                    <div className="mt-auto">
                      {!soldOut && remaining <= 20 && (
                        <p className="num text-sm font-bold text-bai-red mb-3">Only {remaining} {remaining === 1 ? 'seat' : 'seats'} left</p>
                      )}
                      <button
                        onClick={() => handleAddToCart(event)}
                        disabled={soldOut || added}
                        className={`btn btn-block ${added ? 'bg-green-700 text-white' : 'btn-primary'}`}
                      >
                        {added ? (
                          <><span>Added to bag</span><CheckCircle2 size={16} aria-hidden="true" /></>
                        ) : soldOut ? (
                          <span>Sold out</span>
                        ) : (
                          <><span>Add ticket to bag</span><Ticket size={16} aria-hidden="true" /></>
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

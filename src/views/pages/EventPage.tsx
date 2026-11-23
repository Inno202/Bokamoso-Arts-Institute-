import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin } from 'lucide-react';
import { eventController } from '../../controllers/eventController';
import { seededEvent } from '../../content/eventSeed';
import type { BAIEvent } from '../../models/types';
import { ROUTES } from '../../controllers/navigation';
import { eventHasEnded, formatCurrency, formatDate, formatTime } from '../../controllers/lib/utils';
import { priceRange, ticketTypesOf } from '../../models/ticketTypes';
import { cloudinaryService } from '../../services/cloudinaryService';
import { FALLBACK_EVENT_IMAGE } from '../../config';
import { ZoomablePhoto } from '../components/ZoomablePhoto';
import { EventBuyBox, availability } from '../components/EventBuyBox';
import { AddToCalendar, ShareEvent, eventPageUrl } from '../components/EventActions';

type Tab = 'info' | 'lineup' | 'venue';
const mapsLink = (e: BAIEvent) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([e.venue, e.city].filter(Boolean).join(', '))}`;

/** One event's own page: poster, when and where, tickets, add to calendar, share, and details. */
export default function EventPage() {
  const { eventId = '' } = useParams();
  const [event, setEvent] = useState<BAIEvent | null | undefined>(() => seededEvent(eventId) ?? undefined);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<Tab>('info');

  useEffect(() => eventController.subscribeToEvent(eventId, (e) => { setEvent(e); setFailed(false); }, () => setFailed(true)), [eventId]);

  // The browser tab shows the event's name.
  useEffect(() => {
    if (event?.name) document.title = `${event.name} | Bokamoso Arts Institute`;
  }, [event?.name]);

  if (event === undefined && !failed) {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-8 pb-24 space-y-6" role="status" aria-label="Loading the event">
        <div className="aspect-[4/3] rounded-3xl bg-bai-sand animate-pulse" />
        <div className="h-40 rounded-3xl bg-bai-sand animate-pulse" />
      </div>
    );
  }

  const hidden = !event || event.status === 'Draft';
  if (failed || hidden) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <h1 className="display text-4xl">{failed ? 'This event could not be loaded' : 'This event is not available'}</h1>
        <p className="text-bai-ink-soft mt-3">{failed ? 'Check your connection and reload the page.' : 'It may have been removed, or the link is not quite right.'}</p>
        <Link to={ROUTES.EVENTS} className="btn btn-primary mt-8">See all events</Link>
      </div>
    );
  }

  const ended = eventHasEnded(event.date);
  const cancelled = event.status === 'Cancelled';
  const closed = event.status === 'Closed';
  const { soldOut, elsewhere } = availability(event);
  const range = priceRange(event);
  const multi = ticketTypesOf(event).length > 1;
  const image = event.bannerImageUrl || event.ticketImageUrl;
  const lineup = (event.lineup || []).filter(Boolean);
  const tabs: Array<[Tab, string]> = [['info', 'Info'], ...(lineup.length ? [['lineup', 'Line-up'] as [Tab, string]] : []), ['venue', 'Venue']];
  const calendarEvent = { id: event.id, name: event.name, date: event.date, venue: event.venue, city: event.city, description: event.description, url: eventPageUrl(event.id) };
  const price = range.max === 0 ? 'Free' : multi && range.min !== range.max ? `From ${range.min > 0 ? formatCurrency(range.min, event.currency) : 'Free'}` : formatCurrency(range.max, event.currency);

  return (
    <div className="pb-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 md:pt-8">
        <Link to={ROUTES.EVENTS} className="inline-flex items-center gap-2 min-h-[44px] font-semibold mb-3 hover:text-bai-red">
          <ArrowLeft size={18} aria-hidden="true" /><span>All events</span>
        </Link>

        <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-bai-sand">
          <ZoomablePhoto
            src={cloudinaryService.getOptimizedUrl(image, 1400) || FALLBACK_EVENT_IMAGE}
            largeSrc={cloudinaryService.getOptimizedUrl(image, 2000) || FALLBACK_EVENT_IMAGE}
            alt={`Poster for ${event.name}`}
            className={`w-full h-full object-cover ${soldOut || ended || cancelled ? 'grayscale' : ''}`}
            iconCorner="bottom-right"
          />
        </div>

        <div className="panel relative -mt-10 mx-3 sm:mx-10 px-6 py-6 text-center">
          <h1 className="display text-3xl md:text-4xl break-words">{event.name}</h1>
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            {!elsewhere && !ended && !cancelled && <span className="num text-sm font-semibold px-3 py-1 rounded-full border border-bai-black/20">{price}</span>}
            {cancelled && <span className="text-sm font-semibold px-3 py-1 rounded-full bg-red-100 text-red-900">Cancelled</span>}
            {!cancelled && ended && <span className="text-sm font-semibold px-3 py-1 rounded-full bg-bai-black/10">Has taken place</span>}
            {!cancelled && !ended && soldOut && <span className="text-sm font-semibold px-3 py-1 rounded-full bg-bai-black text-white">Sold out</span>}
            {elsewhere && <span className="text-sm font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-900">Sold by {event.ticketProvider || 'an outside seller'}</span>}
          </div>
        </div>

        <section className="panel mt-6 p-6" aria-label="When, where and tickets">
          <dl className="space-y-5">
            <div className="flex gap-4">
              <dt className="shrink-0 w-10 h-10 rounded-full bg-bai-sand flex items-center justify-center"><Calendar size={18} aria-hidden="true" /><span className="sr-only">When</span></dt>
              <dd className="min-w-0">
                <p className="font-semibold">{formatDate(event.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                {formatTime(event.date) && <p className="num text-bai-red-deep font-semibold">{formatTime(event.date)}</p>}
              </dd>
            </div>
            <div className="flex gap-4">
              <dt className="shrink-0 w-10 h-10 rounded-full bg-bai-sand flex items-center justify-center"><MapPin size={18} aria-hidden="true" /><span className="sr-only">Where</span></dt>
              <dd className="min-w-0">
                <p className="font-semibold break-words">{event.venue || 'Venue to be confirmed'}</p>
                {event.city && <p className="text-bai-ink-soft break-words">{event.city}</p>}
              </dd>
            </div>
          </dl>

          <div className="mt-6">
            {cancelled ? (
              <p className="p-4 rounded-xl bg-red-50 text-red-900 font-semibold text-center">This event was cancelled. Tickets for it are not valid.</p>
            ) : ended ? (
              <p className="p-4 rounded-xl bg-bai-sand font-semibold text-center">This event has taken place.</p>
            ) : closed ? (
              <p className="p-4 rounded-xl bg-bai-sand font-semibold text-center">Ticket sales for this event have closed.</p>
            ) : (
              <EventBuyBox event={event} idPrefix="page" />
            )}
          </div>

          <div className="even-cols mt-3">
            {!ended && !cancelled && <AddToCalendar event={calendarEvent} />}
            <ShareEvent id={event.id} name={event.name} />
          </div>
        </section>

        <section className="panel mt-6 overflow-hidden" aria-label="Event details">
          <div role="tablist" aria-label="Event details" className="even-cols border-b border-bai-black/10 px-2 pt-2">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                id={`tab-${key}`}
                role="tab"
                type="button"
                aria-selected={tab === key}
                aria-controls={`panel-${key}`}
                onClick={() => setTab(key)}
                className={`min-h-[48px] font-semibold border-b-2 -mb-px transition-colors ${tab === key ? 'border-bai-red text-bai-black' : 'border-transparent text-bai-ink-soft hover:text-bai-black'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="p-6">
            {tab === 'info' && (
              event.description
                ? <p className="leading-relaxed whitespace-pre-line break-words">{event.description}</p>
                : <p className="text-bai-ink-soft">More details will be announced soon.</p>
            )}
            {tab === 'lineup' && (
              <ol className="divide-y divide-bai-black/10">
                {lineup.map((name, i) => (
                  <li key={`${i}-${name}`} className="py-3 flex items-center gap-4">
                    <span className="num w-9 h-9 rounded-full bg-bai-sand flex items-center justify-center text-sm font-semibold shrink-0" aria-hidden="true">{i + 1}</span>
                    <span className="font-semibold break-words">{name}</span>
                  </li>
                ))}
              </ol>
            )}
            {tab === 'venue' && (
              <div>
                <p className="font-semibold break-words">{event.venue || 'Venue to be confirmed'}</p>
                {event.city && <p className="text-bai-ink-soft">{event.city}</p>}
                {event.venue && (
                  <a href={mapsLink(event)} target="_blank" rel="noopener noreferrer" className="btn btn-outline mt-5">
                    Open in Google Maps<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

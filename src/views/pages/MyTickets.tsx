import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ticket as TicketIcon, MapPin, Calendar, Clock, Download, ChevronRight, Share2, X } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import { ticketController } from '../../controllers/ticketController';
import { eventController } from '../../controllers/eventController';
import { BAIEvent, Ticket, TicketStatus } from '../../models/types';
import { cloudinaryService } from '../../services/cloudinaryService';
import { formatDate, formatTime } from '../../controllers/lib/utils';
import { TicketQR, ticketQrDataUrl } from '../components/TicketQR';
import { ROUTES } from '../../controllers/navigation';
import { FALLBACK_EVENT_IMAGE } from '../../config';
import { toast } from '../../services/toast';
import { logger } from '../../services/loggerService';

type TicketWithEvent = Ticket & { event?: BAIEvent | null };

const STATUS: Record<TicketStatus, { label: string; className: string }> = {
  VALID: { label: 'Valid', className: 'bg-green-700 text-white' },
  SCANNED: { label: 'Used', className: 'bg-bai-black text-white' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-700 text-white' },
};

export default function MyTickets() {
  const { user, userData } = useAuth();
  const [tickets, setTickets] = useState<TicketWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<TicketWithEvent | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;

    const unsubscribe = ticketController.subscribeToUserTickets(user.uid, async (userTickets) => {
      try {
        const eventIds = Array.from(new Set(userTickets.map(t => t.eventId).filter(Boolean)));
        const events = await Promise.all(eventIds.map(id => eventController.getEventById(id).catch(() => null)));
        const byId = new Map(events.filter((e): e is BAIEvent => !!e).map(e => [e.id, e]));
        if (!active) return;
        setTickets(userTickets.map(t => ({ ...t, event: byId.get(t.eventId) })));
        setFailed(false);
      } catch (err) {
        logger.error('Could not load ticket details', err);
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    }, () => {
      if (!active) return;
      setFailed(true);
      setLoading(false);
    });

    return () => { active = false; unsubscribe(); };
  }, [user]);

  // Modal: Escape closes, focus moves in, the page behind does not scroll.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [selected]);

  const eventName = (t: TicketWithEvent) => t.event?.name || t.eventName || 'Event';

  const handleDownload = async (t: TicketWithEvent) => {
    try {
      const link = document.createElement('a');
      link.href = await ticketQrDataUrl(t.id);
      link.download = `${t.id}.png`;
      link.click();
    } catch {
      toast.error('The QR code could not be saved. Take a screenshot of this ticket instead.');
    }
  };

  const handleShare = async (t: TicketWithEvent) => {
    const text = `Ticket ${t.id} for ${eventName(t)}${t.event?.date ? `, ${formatDate(t.event.date)}` : ''}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: eventName(t), text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success('Ticket reference copied.');
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') toast.error('The ticket could not be shared from this browser.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bai-bone" role="status" aria-label="Loading your tickets">
        <div className="w-12 h-12 border-4 border-bai-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-24 bg-bai-bone min-h-screen">
      <div className="bg-bai-black text-white py-12 px-4 mb-12 relative overflow-hidden">
        <div className="absolute inset-0 piano-key-pattern opacity-10" aria-hidden="true" />
        <div className="max-w-7xl mx-auto relative z-10 sm:px-2 lg:px-4">
          <h1 className="display text-4xl md:text-6xl ">Your <span className="text-bai-red-soft">tickets.</span></h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {failed ? (
          <div className="py-24 text-center" role="alert">
            <h2 className="font-display font-bold text-2xl uppercase italic">Your tickets could not be loaded</h2>
            <p className="text-bai-black/70 mt-4 max-w-sm mx-auto">Check your connection and reload the page. Your tickets are safe.</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-24 text-center">
            <TicketIcon size={56} className="mx-auto text-bai-black/25 mb-6" aria-hidden="true" />
            <h2 className="font-display font-bold text-2xl uppercase italic">No tickets yet</h2>
            <p className="text-bai-black/70 mt-4 mb-8 max-w-xs mx-auto">Tickets you book appear here, ready to show at the door.</p>
            <Link to={ROUTES.EVENTS} className="btn btn-primary">See upcoming events</Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tickets.map((ticket) => {
              const status = STATUS[ticket.status] || STATUS.VALID;
              return (
                <li key={ticket.id}>
                  <button
                    onClick={() => setSelected(ticket)}
                    className="w-full text-left bg-white rounded-2xl overflow-hidden border border-bai-black/10 shadow-[0_8px_24px_-12px_rgb(0_0_0/0.25)] flex flex-col group hover:shadow-[0_16px_40px_-16px_rgb(0_0_0/0.4)] transition-shadow"
                  >
                    <div className="aspect-[16/9] relative overflow-hidden w-full">
                      <img
                        src={cloudinaryService.getOptimizedUrl(ticket.event?.bannerImageUrl || ticket.event?.ticketImageUrl) || FALLBACK_EVENT_IMAGE}
                        alt=""
                        onError={(e) => { if (!e.currentTarget.dataset.fallback) { e.currentTarget.dataset.fallback = '1'; e.currentTarget.src = FALLBACK_EVENT_IMAGE; } }}
                        loading="lazy"
                        decoding="async"
                        className={`w-full h-full object-cover photo-zoom ${ticket.status === 'VALID' ? '' : 'grayscale'}`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                      <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-3">
                        <div>
                          <span className={`${status.className} text-[11px] font-bold uppercase tracking-widest px-2 py-1 mb-2 inline-block`}>{status.label}</span>
                          <h3 className="text-white font-display font-bold text-xl leading-none uppercase italic">{eventName(ticket)}</h3>
                        </div>
                        <TicketQR value={ticket.id} size={96} className="w-12 h-12 bg-white rounded-lg p-1 shrink-0" />
                      </div>
                    </div>

                    <div className="p-6 w-full">
                      <p className="num text-xs font-bold uppercase tracking-widest text-bai-red mb-4">{ticket.id}</p>
                      <div className="space-y-2 text-sm text-bai-black/80">
                        <p className="flex items-center gap-3">
                          <Calendar size={14} className="text-bai-blue shrink-0" aria-hidden="true" />
                          <span>{formatDate(ticket.event?.date) || 'Date to be confirmed'}</span>
                        </p>
                        <p className="flex items-center gap-3">
                          <MapPin size={14} className="text-bai-blue shrink-0" aria-hidden="true" />
                          <span className="line-clamp-1">{ticket.event?.venue || 'Venue to be confirmed'}</span>
                        </p>
                      </div>
                      <span className="w-full mt-6 flex items-center justify-between p-4 bg-bai-bone rounded-lg group-hover:bg-bai-black group-hover:text-white transition-colors">
                        <span className="text-xs font-bold uppercase tracking-widest">View ticket</span>
                        <ChevronRight size={16} aria-hidden="true" />
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="ticket-title">
          <div onClick={() => setSelected(null)} className="absolute inset-0 bg-black/85" aria-hidden="true" />

          <div className="w-full max-w-lg max-h-[92dvh] overflow-y-auto bg-white rounded-2xl relative shadow-[0_32px_80px_-24px_rgb(0_0_0/0.6)]">
            <div className="bg-bai-black px-8 pt-10 pb-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 piano-key-pattern opacity-10" aria-hidden="true" />
              <button
                ref={closeRef}
                onClick={() => setSelected(null)}
                aria-label="Close ticket"
                className="no-print absolute top-3 right-3 w-11 h-11 flex items-center justify-center text-white/80 hover:text-white rounded-full z-10"
              >
                <X size={22} aria-hidden="true" />
              </button>
              <h2 id="ticket-title" className="text-white font-display font-bold text-2xl md:text-3xl uppercase italic leading-none tracking-tighter relative z-10">
                {eventName(selected)}
              </h2>
            </div>

            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-center sm:items-start">
                <div className="shrink-0 text-center">
                  <TicketQR value={selected.id} size={400} className={`w-48 h-48 rounded-2xl border-4 border-bai-black p-2 bg-white ${selected.status === 'VALID' ? '' : 'opacity-40'}`} />
                  {selected.status !== 'VALID' && (
                    <p className="mt-2 text-sm font-bold text-red-700">{selected.status === 'SCANNED' ? 'Already used at the door' : 'This ticket was cancelled'}</p>
                  )}
                </div>

                <dl className="flex-grow space-y-5 w-full">
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-widest text-bai-black/60 mb-1">Ticket holder</dt>
                    <dd className="font-display font-bold text-xl uppercase italic break-words">{userData?.displayName || user?.displayName || user?.email}</dd>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-widest text-bai-black/60 mb-1">Reference</dt>
                      <dd className="num font-bold text-sm text-bai-red break-all">{selected.id}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-widest text-bai-black/60 mb-1">Type</dt>
                      <dd className="font-bold text-sm">{selected.ticketType}</dd>
                    </div>
                  </div>
                  <div className="space-y-3 pt-4 border-t border-bai-black/10 text-sm font-semibold">
                    <p className="flex items-center gap-3">
                      <Calendar className="text-bai-blue shrink-0" size={18} aria-hidden="true" />
                      <span>{formatDate(selected.event?.date) || 'Date to be confirmed'}</span>
                    </p>
                    {formatTime(selected.event?.date) && (
                      <p className="flex items-center gap-3">
                        <Clock className="text-bai-blue shrink-0" size={18} aria-hidden="true" />
                        <span className="num">{formatTime(selected.event?.date)}</span>
                      </p>
                    )}
                    <p className="flex items-center gap-3">
                      <MapPin className="text-bai-blue shrink-0" size={18} aria-hidden="true" />
                      <span>{[selected.event?.venue, selected.event?.city].filter(Boolean).join(', ') || 'Venue to be confirmed'}</span>
                    </p>
                  </div>
                </dl>
              </div>

              <div className="no-print grid grid-cols-2 gap-4 mt-8 pt-8 border-t-2 border-dashed border-bai-black/15">
                <button onClick={() => handleDownload(selected)} className="btn btn-lg btn-primary">
                  <Download size={18} aria-hidden="true" />
                  <span>Save QR</span>
                </button>
                <button onClick={() => handleShare(selected)} className="btn btn-lg btn-outline">
                  <Share2 size={18} aria-hidden="true" />
                  <span>Share</span>
                </button>
              </div>

              <p className="text-xs text-center text-bai-black/60 mt-6">
                Show this code at the door. Each ticket admits one person, once.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

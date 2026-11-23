import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ticket as TicketIcon, MapPin, Calendar, ChevronRight, Share2, X, Loader2, WifiOff } from 'lucide-react';
import { PageHero } from '../components/PageHero';
import { useAuth } from '../components/AuthProvider';
import { ticketController } from '../../controllers/ticketController';
import { eventController } from '../../controllers/eventController';
import { BAIEvent, Ticket, TicketStatus } from '../../models/types';
import { cloudinaryService } from '../../services/cloudinaryService';
import { formatCurrency, formatDate, formatTime, toDate, friendlyError } from '../../controllers/lib/utils';
import { TicketQR } from '../components/TicketQR';
import { ROUTES } from '../../controllers/navigation';
import { FALLBACK_EVENT_IMAGE } from '../../config';
import { toast } from '../../services/toast';
import { logger } from '../../services/loggerService';
import { useBackToClose } from '../components/useBackToClose';
import { AddToCalendar, eventPageUrl } from '../components/EventActions';
import { confirmAction } from '../../services/confirm';
import { VerifyEmailNotice } from '../components/VerifyEmailNotice';

type TicketWithEvent = Ticket & { event?: BAIEvent | null };

const STATUS: Record<TicketStatus | 'EVENT_CANCELLED', { label: string; className: string }> = {
  VALID: { label: 'Valid', className: 'bg-green-100 text-green-900' },
  SCANNED: { label: 'Used', className: 'bg-bai-black/10 text-bai-black' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-900' },
  EVENT_CANCELLED: { label: 'Event cancelled', className: 'bg-red-100 text-red-900' },
};

/** A valid ticket for a cancelled show reads as "Event cancelled". */
const statusOf = (t: { status: TicketStatus; event?: { status?: string } | null }): TicketStatus | 'EVENT_CANCELLED' =>
  t.status === 'VALID' && t.event?.status === 'Cancelled' ? 'EVENT_CANCELLED' : t.status;

export default function MyTickets() {
  const { user, userData } = useAuth();
  const [tickets, setTickets] = useState<TicketWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<TicketWithEvent | null>(null);
  useBackToClose(!!selected, () => setSelected(null));
  // The open ticket follows live changes (a transfer offered or accepted, a cancellation);
  // if it has left this account, it closes.
  useEffect(() => {
    setSelected(current => (current ? tickets.find(t => t.id === current.id) || null : current));
  }, [tickets]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

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

  const [downloading, setDownloading] = useState(false);
  const handleDownload = async (t: TicketWithEvent) => {
    if (downloading) return;
    setDownloading(true);
    try {
      const { downloadTicket } = await import('../../services/ticketDownload');
      await downloadTicket({
        id: t.id,
        eventName: eventName(t),
        dateText: formatDate(t.event?.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) || 'Date to be confirmed',
        timeText: formatTime(t.event?.date) || '',
        venueText: [t.event?.venue, t.event?.city].filter(Boolean).join(', ') || 'Venue to be confirmed',
        ticketType: t.ticketType || 'General Admission',
        priceText: t.price > 0 ? formatCurrency(t.price, t.currency) : 'Free',
        holderName: userData?.displayName || user?.displayName || t.buyerEmail || '',
        holderEmail: t.buyerEmail || user?.email || '',
        issuedText: formatDate(t.createdAt, { day: 'numeric', month: 'short', year: 'numeric' }),
        imageUrl: cloudinaryService.getOptimizedUrl(t.event?.ticketImageUrl || t.event?.bannerImageUrl, 1000),
        fallbackImageUrl: FALLBACK_EVENT_IMAGE,
        logoUrl: `${import.meta.env.BASE_URL}assets/brand/mark-192.png`,
      });
      toast.success('Ticket downloaded.');
    } catch (err) {
      logger.error('Ticket download failed', err);
      toast.error('The ticket could not be downloaded. Take a screenshot of this ticket instead.');
    } finally {
      setDownloading(false);
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

  const image = (t: TicketWithEvent) => cloudinaryService.getOptimizedUrl(t.event?.ticketImageUrl || t.event?.bannerImageUrl, 600) || FALLBACK_EVENT_IMAGE;
  const fallback = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (!e.currentTarget.dataset.fallback) { e.currentTarget.dataset.fallback = '1'; e.currentTarget.src = FALLBACK_EVENT_IMAGE; }
  };
  const when = (t: TicketWithEvent) =>
    [formatDate(t.event?.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }), formatTime(t.event?.date)].filter(Boolean).join(' · ') || 'Date to be confirmed';

  return (
    <div className="pb-24 min-h-screen">
      <PageHero title="Your" accent="tickets" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {!online && (
          <p className="mb-6 p-4 rounded-2xl bg-amber-50 text-amber-950 flex items-center gap-3" role="status">
            <WifiOff size={20} className="shrink-0" aria-hidden="true" />
            You are offline. These are the tickets saved on this device; their QR codes still work at the door.
          </p>
        )}
        <IncomingTransfers />
        {failed ? (
          <div className="panel py-20 px-6 text-center" role="alert">
            <h2 className="display text-3xl">Your tickets could not be loaded</h2>
            <p className="text-bai-ink-soft mt-3 max-w-sm mx-auto">Check your connection and reload the page. Your tickets are safe.</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="panel py-20 px-6 text-center">
            <TicketIcon size={48} className="mx-auto text-bai-red-deep mb-5" strokeWidth={1.5} aria-hidden="true" />
            <h2 className="display text-3xl">No tickets yet</h2>
            <p className="text-bai-ink-soft mt-3 mb-8 max-w-xs mx-auto">Tickets you book appear here, ready to show at the door.</p>
            <Link to={ROUTES.EVENTS} className="btn btn-primary">See upcoming events</Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {tickets.map((ticket) => {
              const status = STATUS[statusOf(ticket)] || STATUS.VALID;
              const used = statusOf(ticket) !== 'VALID';
              return (
                <li key={ticket.id}>
                  {/* One fixed size for every ticket: long names are clipped, never stretch the card. */}
                  <button
                    onClick={() => setSelected(ticket)}
                    aria-label={`${eventName(ticket)}, ${status.label} ticket ${ticket.id}. Open ticket.`}
                    className="group lift w-full h-40 sm:h-44 text-left flex rounded-3xl bg-white border border-bai-black/[0.07] overflow-hidden"
                  >
                    <div className="hidden min-[400px]:block w-24 sm:w-32 shrink-0 bg-bai-sand">
                      <img src={image(ticket)} alt="" onError={fallback} loading="lazy" decoding="async" className={`w-full h-full object-cover ${used ? 'grayscale opacity-70' : ''}`} />
                    </div>

                    <div className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col">
                      <span className={`self-start text-xs font-semibold px-2.5 py-0.5 rounded-full ${status.className}`}>{status.label}</span>
                      <h3 className="font-serif font-semibold text-2xl leading-tight mt-2 line-clamp-1">{eventName(ticket)}</h3>
                      <p className="num text-sm text-bai-ink-soft mt-1 truncate">{when(ticket)}</p>
                      <p className="text-sm text-bai-ink-soft truncate">{ticket.event?.venue || 'Venue to be confirmed'}</p>
                      <p className="num text-xs font-semibold text-bai-red-deep mt-auto truncate">{ticket.id}</p>
                    </div>

                    {/* Perforation, with the two half-circle notches of a paper ticket */}
                    <div className="relative w-0 border-l-2 border-dashed border-bai-black/15 my-3" aria-hidden="true">
                      <span className="absolute -top-6 -left-[11px] w-5 h-5 rounded-full bg-bai-bone border border-bai-black/[0.07]" />
                      <span className="absolute -bottom-6 -left-[11px] w-5 h-5 rounded-full bg-bai-bone border border-bai-black/[0.07]" />
                    </div>

                    <div className="w-24 sm:w-28 shrink-0 flex flex-col items-center justify-center gap-2 p-3">
                      <TicketQR value={ticket.id} size={160} className={`w-16 h-16 sm:w-20 sm:h-20 ${used ? 'opacity-30' : ''}`} />
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-bai-black/80 group-hover:text-bai-red transition-colors">
                        Open <ChevronRight size={16} aria-hidden="true" />
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
          <div onClick={() => setSelected(null)} className="absolute inset-0 bg-bai-black/80" aria-hidden="true" />

          {/* The ticket itself: the same width as an event card, and everything inside fits it. */}
          <div className="ticket-in relative w-full max-w-[24rem] max-h-[94dvh] overflow-y-auto rounded-[1.75rem] bg-white shadow-[0_32px_80px_-24px_rgb(0_0_0/0.6)]">
            <div className="relative h-24 bg-bai-black">
              <img src={image(selected)} alt="" onError={fallback} className="w-full h-full object-cover opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/10" aria-hidden="true" />
              <button
                ref={closeRef}
                onClick={() => setSelected(null)}
                aria-label="Close ticket"
                className="no-print icon-btn absolute top-2 right-2 bg-black/30 text-white hover:bg-black/50"
              >
                <X size={20} aria-hidden="true" />
              </button>
              <span className={`absolute top-3 left-4 text-xs font-bold px-2.5 py-1 rounded-full ${(STATUS[statusOf(selected)] || STATUS.VALID).className}`}>
                {(STATUS[statusOf(selected)] || STATUS.VALID).label}
              </span>
              <h2 id="ticket-title" className="absolute bottom-3 left-5 right-14 font-serif font-semibold text-2xl leading-tight text-white line-clamp-2">
                {eventName(selected)}
              </h2>
            </div>

            <dl className="px-5 pt-3 pb-3.5 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              <div className="min-w-0">
                <dt className="text-bai-ink-soft">Ticket holder</dt>
                <dd className="font-semibold truncate">{userData?.displayName || user?.displayName || user?.email}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-bai-ink-soft">Ticket</dt>
                <dd className="font-semibold truncate">{selected.ticketType}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-bai-ink-soft flex items-center gap-1.5"><Calendar size={14} aria-hidden="true" />When</dt>
                <dd className="num font-semibold">{when(selected)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-bai-ink-soft flex items-center gap-1.5"><MapPin size={14} aria-hidden="true" />Where</dt>
                <dd className="font-semibold line-clamp-2 break-words">{[selected.event?.venue, selected.event?.city].filter(Boolean).join(', ') || 'Venue to be confirmed'}</dd>
              </div>
            </dl>

            {/* Perforation */}
            <div className="relative mx-5 border-t-2 border-dashed border-bai-black/15" aria-hidden="true">
              <span className="absolute -left-8 -top-[11px] w-5 h-5 rounded-full bg-bai-black/80" />
              <span className="absolute -right-8 -top-[11px] w-5 h-5 rounded-full bg-bai-black/80" />
            </div>

            <div className="px-5 pt-3.5 pb-5 flex flex-col items-center">
              <TicketQR value={selected.id} size={400} className={`w-36 h-36 ${statusOf(selected) === 'VALID' ? '' : 'opacity-30'}`} />
              <p className="num font-semibold text-bai-red-deep mt-1.5">{selected.id}</p>
              {statusOf(selected) !== 'VALID' && (
                <p className="mt-1 text-sm font-semibold text-red-700">{selected.status === 'SCANNED' ? 'Already used at the door' : statusOf(selected) === 'EVENT_CANCELLED' ? 'This event was cancelled' : 'This ticket was cancelled'}</p>
              )}
              {/* The main action gets the room; Add to calendar and Share are round icon buttons beside it.
                  Only a ticket that can still be used can be downloaded. */}
              {statusOf(selected) === 'VALID' && (
              <div className="no-print flex gap-3 w-full mt-3.5">
                <button onClick={() => handleDownload(selected)} disabled={downloading} className="btn btn-primary flex-1 whitespace-nowrap">
                  {downloading && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
                  <span>{downloading ? 'Preparing ticket' : 'Download ticket'}</span>
                </button>
                {selected.event?.date && (
                  <AddToCalendar round event={{ id: selected.eventId, name: eventName(selected), date: selected.event.date, venue: selected.event.venue, city: selected.event.city, description: `Ticket ${selected.id} (${selected.ticketType})`, url: eventPageUrl(selected.eventId) }} />
                )}
                <button onClick={() => handleShare(selected)} aria-label="Share ticket" title="Share ticket" className="btn btn-outline shrink-0 w-[48px] px-0">
                  <Share2 size={18} aria-hidden="true" />
                </button>
              </div>
              )}
              {statusOf(selected) === 'VALID' && <TransferControls ticket={selected} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** On an open ticket: offer it to a friend's email address, or take the offer back. */
function TransferControls({ ticket }: { ticket: TicketWithEvent }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const started = (toDate(ticket.event?.date)?.getTime() ?? 0) <= Date.now();
  if (started) return null;

  const offer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!await confirmAction({
      title: `Transfer this ticket to ${email.trim()}?`,
      message: 'They see it under My tickets when they sign in with that email address, and it becomes theirs when they accept. You can take the offer back until then.',
      confirmLabel: 'Transfer ticket',
      cancelLabel: 'Keep it',
    })) return;
    setBusy(true);
    try {
      await ticketController.offerTransfer(ticket.id, email);
      toast.success(`Offered to ${email.trim()}. Ask them to sign in with that email to accept it.`);
      setOpen(false);
      setEmail('');
    } catch (err) {
      logger.error('Ticket transfer failed', err);
      toast.error(friendlyError(err, 'The ticket could not be transferred. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const takeBack = async () => {
    setBusy(true);
    try {
      await ticketController.cancelTransfer(ticket.id);
      toast.success('The offer is cancelled. The ticket stays yours.');
    } catch (err) {
      logger.error('Cancelling a transfer failed', err);
      toast.error(friendlyError(err, 'That did not work. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  if (ticket.transferTo) {
    return (
      <div className="no-print w-full mt-3 p-3 rounded-xl bg-bai-sand text-sm text-center">
        <p>Offered to <strong className="break-all">{ticket.transferTo}</strong>. It stays yours until they accept.</p>
        <button type="button" onClick={takeBack} disabled={busy} className="link min-h-[44px]">Cancel the transfer</button>
      </div>
    );
  }
  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="no-print link min-h-[44px] mt-1 text-sm">Transfer to a friend</button>;
  }
  return (
    <form onSubmit={offer} className="no-print w-full mt-3 space-y-2">
      <label htmlFor={`transfer-${ticket.id}`} className="block text-sm font-semibold text-left">Your friend's email address</label>
      <input id={`transfer-${ticket.id}`} type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="off" className="field" placeholder="friend@example.com" />
      <div className="even-cols">
        <button type="button" onClick={() => setOpen(false)} className="btn btn-outline">Cancel</button>
        <button type="submit" disabled={busy || !email.trim()} className="btn btn-primary">Transfer</button>
      </div>
    </form>
  );
}

/** Tickets friends have offered to the signed-in person's email address. */
function IncomingTransfers() {
  const { user, emailVerified } = useAuth();
  const [offers, setOffers] = useState<Ticket[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.email) return;
    return ticketController.subscribeToIncomingTransfers(user.email, setOffers);
  }, [user?.email]);

  if (!user || offers.length === 0) return null;

  const accept = async (t: Ticket) => {
    setBusy(t.id);
    try {
      await ticketController.acceptTransfer(t, user);
      toast.success('The ticket is yours. It is now in your tickets below.');
    } catch (err) {
      logger.error('Accepting a ticket failed', err);
      toast.error(friendlyError(err, 'The ticket could not be accepted. Please try again.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="panel p-5 sm:p-6 mb-8" aria-labelledby="incoming-heading">
      <h2 id="incoming-heading" className="display text-2xl mb-1">Tickets waiting for you</h2>
      <p className="text-bai-ink-soft mb-4">{offers.length === 1 ? 'A friend has passed you a ticket.' : `Friends have passed you ${offers.length} tickets.`}</p>
      {!emailVerified && (
        <div className="mb-4"><VerifyEmailNotice title="Confirm your email to accept tickets" /></div>
      )}
      <ul className="divide-y divide-bai-black/10 border-t border-bai-black/10">
        {offers.map(t => (
          <li key={t.id} className="py-4 flex flex-wrap items-center gap-x-4 gap-y-3">
            <div className="min-w-0 flex-grow">
              <p className="font-semibold break-words">{t.eventName || 'Event'}</p>
              <p className="text-sm text-bai-ink-soft break-all">{t.ticketType} · from {t.buyerEmail || 'a friend'}</p>
            </div>
            <button type="button" onClick={() => accept(t)} disabled={busy === t.id || !emailVerified} className="btn btn-primary w-full sm:w-auto">
              {busy === t.id ? 'Accepting' : 'Accept ticket'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

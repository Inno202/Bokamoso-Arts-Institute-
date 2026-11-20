import { useCallback, useEffect, useState } from 'react';
import { Ban, BarChart3, Copy, Edit2, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../controllers/navigation';
import { AdminShell } from './AdminShell';
import { EventFormDialog } from './EventFormDialog';
import { eventController } from '../../controllers/eventController';
import { BAIEvent } from '../../models/types';
import { formatCurrency, formatDateTime, friendlyError } from '../../controllers/lib/utils';
import { toast } from '../../services/toast';
import { sellsElsewhere } from '../../models/currency';
import { hasTicketTypes, priceRange, ticketTypesOf } from '../../models/ticketTypes';
import { eventHasEnded } from '../../controllers/lib/utils';
import { confirmAction } from '../../services/confirm';
import { useActivity } from '../components/useActivity';
import { logger } from '../../services/loggerService';

const STATUS_STYLE: Record<string, string> = {
  'On Sale': 'bg-green-100 text-green-900',
  Draft: 'bg-amber-100 text-amber-900',
  Closed: 'bg-bai-black/10 text-bai-black',
  Cancelled: 'bg-red-100 text-red-900',
};

export default function AdminEvents() {
  const record = useActivity();
  const [copying, setCopying] = useState<BAIEvent | null>(null);
  const [events, setEvents] = useState<BAIEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<BAIEvent | 'new' | null>(null);
  const closeDialog = useCallback(() => setEditing(null), []);

  // Every event, including drafts and closed ones (the public page lists only those on sale).
  useEffect(() => eventController.subscribeToEvents((data) => {
    setEvents(data);
    setFailed(false);
    setLoading(false);
  }, false, () => {
    setFailed(true);
    setLoading(false);
  }), []);

  const handleCancel = async (event: BAIEvent) => {
    const issued = event.ticketsSold || 0;
    if (!await confirmAction({
      title: `Cancel "${event.name}"?`,
      message: `It leaves sale${issued ? `, its ${issued} ticket${issued === 1 ? '' : 's'} show as cancelled in My Tickets` : ''} and no ticket for it is accepted at the door. Download the attendee list from its report to contact ticket holders.`,
      confirmLabel: 'Cancel event',
      cancelLabel: 'Keep it',
      tone: 'danger',
    })) return;
    try {
      await eventController.cancelEvent(event.id);
      toast.success('Event cancelled.');
      void record('event.cancelled', `Cancelled the event "${event.name}"${issued ? ` (${issued} tickets had been issued)` : ''}.`, event.id);
    } catch (err) {
      logger.error('Failed to cancel event', err);
      toast.error(friendlyError(err, 'The event could not be cancelled.'));
    }
  };

  const handleDelete = async (event: BAIEvent) => {
    const sold = event.ticketsSold > 0
      ? `${event.ticketsSold} ticket${event.ticketsSold === 1 ? ' has' : 's have'} already been issued for it, and those ticket holders will lose the event details. `
      : '';
    if (!await confirmAction({ title: `Delete "${event.name}"?`, message: `${sold}This cannot be undone.`, confirmLabel: 'Delete event', tone: 'danger' })) return;
    try {
      await eventController.deleteEvent(event.id);
      toast.success('Event deleted.');
      void record('event.deleted', `Deleted the event "${event.name}"${event.ticketsSold ? ` (${event.ticketsSold} tickets had been issued)` : ''}.`, event.id);
    } catch (err) {
      logger.error('Failed to delete event', err);
      toast.error(friendlyError(err, 'The event could not be deleted.'));
    }
  };

  return (
    <AdminShell title="Events">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <p className="text-bai-black/75 max-w-xl">Events marked On sale appear on the public Events page. Drafts and closed events stay hidden.</p>
        <button onClick={() => setEditing('new')} className="btn btn-primary"><Plus size={16} className="hidden md:block" aria-hidden="true" /><span>New event</span></button>
      </div>

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading events">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white animate-pulse rounded-lg" />)}
        </div>
      ) : failed ? (
        <p role="alert" className="p-5 bg-red-50 text-red-900 rounded-lg">The events could not be loaded. Check your connection and reload the page.</p>
      ) : events.length === 0 ? (
        <div className="py-16 text-center border-y border-bai-black/15">
          <h2 className="display text-2xl">No events yet</h2>
          <p className="text-bai-black/75 mt-3 mb-6">Create the first one and it appears on the Events page straight away.</p>
          <button onClick={() => setEditing('new')} className="btn btn-primary"><Plus size={16} className="hidden md:block" aria-hidden="true" /><span>New event</span></button>
        </div>
      ) : (
        <ul className="border-t border-bai-black/15">
          {events.map(event => (
            <li key={event.id} className="py-5 border-b border-bai-black/15 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
              <div className="min-w-0 flex-grow">
                {/* Phones: status pills on the right of the name. Larger screens: right after the name, as before. */}
                <div className="flex items-start justify-between md:justify-start md:flex-wrap md:items-center gap-3">
                  <h2 className="font-semibold text-lg break-words min-w-0">{event.name}</h2>
                  <div className="flex flex-wrap justify-end gap-2 shrink-0 md:shrink">
                  <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${STATUS_STYLE[event.status] || STATUS_STYLE.Closed}`}>{event.status}</span>
                  {eventHasEnded(event.date) && <span className="text-sm font-bold px-2.5 py-0.5 rounded-full bg-bai-black/10 text-bai-black">Ended</span>}
                  </div>
                </div>
                {sellsElsewhere(event) && <span className="inline-block mt-2 text-sm font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-900">Sold by {event.ticketProvider || 'outside seller'}</span>}
                <p className="num text-bai-black/75 mt-1">{formatDateTime(event.date) || 'No date'} · {[event.venue, event.city].filter(Boolean).join(', ')}</p>
                {hasTicketTypes(event) && (
                  <ul className="num flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-bai-black/75">
                    {ticketTypesOf(event).map(t => (
                      <li key={t.id}><span className="font-semibold text-bai-black">{t.name}</span> {t.price > 0 ? formatCurrency(t.price, event.currency) : 'Free'} · {t.sold} of {t.capacity}</li>
                    ))}
                  </ul>
                )}
              </div>
              <dl className="num flex gap-8 shrink-0">
                <div>
                  <dt className="text-sm text-bai-black/70">Price</dt>
                  <dd className="font-bold">{(() => { const r = priceRange(event); const f = (n: number) => (n > 0 ? formatCurrency(n, event.currency) : 'Free'); return r.min === r.max ? f(r.max) : `${f(r.min)} to ${f(r.max)}`; })()}</dd>
                </div>
                <div>
                  <dt className="text-sm text-bai-black/70">Issued</dt>
                  <dd className="font-bold">{event.ticketsSold || 0} of {event.capacity}</dd>
                </div>
              </dl>
              {/* Phones: Report / Edit / Duplicate share one row; Cancel and Delete each take the full width below. */}
              <div className="md:hidden w-full space-y-2">
                <div className="even-cols">
                  <Link to={`${ROUTES.ADMIN_EVENTS}/${event.id}/report`} className="btn btn-outline">Report</Link>
                  <button onClick={() => setEditing(event)} className="btn btn-outline">Edit</button>
                  <button onClick={() => setCopying(event)} className="btn btn-outline" aria-label={`Duplicate ${event.name}`}>Duplicate</button>
                </div>
                {event.status !== 'Cancelled' && (
                  <button onClick={() => handleCancel(event)} className="btn btn-danger btn-block" aria-label={`Cancel event ${event.name}`}>Cancel event</button>
                )}
                <button onClick={() => handleDelete(event)} className="btn btn-danger btn-block" aria-label={`Delete ${event.name}`}>Delete</button>
              </div>
              {/* Larger screens: the original row of buttons, with icons. */}
              <div className="hidden md:flex flex-wrap gap-2 shrink-0">
                <Link to={`${ROUTES.ADMIN_EVENTS}/${event.id}/report`} className="btn btn-outline">
                  <BarChart3 size={16} aria-hidden="true" /><span>Report</span>
                </Link>
                {event.status !== 'Cancelled' && (
                  <button onClick={() => handleCancel(event)} className="btn btn-danger" aria-label={`Cancel event ${event.name}`}>
                    <Ban size={16} aria-hidden="true" /><span>Cancel event</span>
                  </button>
                )}
                <button onClick={() => setEditing(event)} className="btn btn-outline">
                  <Edit2 size={16} aria-hidden="true" /><span>Edit</span>
                </button>
                <button onClick={() => setCopying(event)} className="btn btn-outline" aria-label={`Duplicate ${event.name}`}>
                  <Copy size={16} aria-hidden="true" /><span>Duplicate</span>
                </button>
                <button onClick={() => handleDelete(event)} className="btn btn-danger" aria-label={`Delete ${event.name}`}>
                  <Trash2 size={16} aria-hidden="true" /><span>Delete</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && <EventFormDialog event={editing === 'new' ? null : editing} onClose={closeDialog} />}
      {copying && <EventFormDialog copyFrom={copying} onClose={() => setCopying(null)} />}
    </AdminShell>
  );
}

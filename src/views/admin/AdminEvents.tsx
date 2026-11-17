import { useCallback, useEffect, useState } from 'react';
import { Ban, BarChart3, Edit2, Plus, Trash2 } from 'lucide-react';
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
        <button onClick={() => setEditing('new')} className="btn btn-primary">
          <Plus size={16} aria-hidden="true" />
          <span>New event</span>
        </button>
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
          <button onClick={() => setEditing('new')} className="btn btn-primary"><Plus size={16} aria-hidden="true" /><span>New event</span></button>
        </div>
      ) : (
        <ul className="border-t border-bai-black/15">
          {events.map(event => (
            <li key={event.id} className="py-5 border-b border-bai-black/15 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
              <div className="min-w-0 flex-grow">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-semibold text-lg break-words">{event.name}</h2>
                  <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${STATUS_STYLE[event.status] || STATUS_STYLE.Closed}`}>{event.status}</span>
                  {eventHasEnded(event.date) && <span className="text-sm font-bold px-2.5 py-0.5 rounded-full bg-bai-black/10 text-bai-black">Ended</span>}
                  {sellsElsewhere(event) && <span className="text-sm font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-900">Sold by {event.ticketProvider || 'outside seller'}</span>}
                </div>
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
              <div className="flex flex-wrap gap-2 shrink-0">
                <Link to={`${ROUTES.ADMIN_EVENTS}/${event.id}/report`} className="btn btn-outline">
                  <BarChart3 size={16} aria-hidden="true" /><span>Report</span>
                </Link>
                {event.status !== 'Cancelled' && (
                  <button onClick={() => handleCancel(event)} className="btn btn-danger" aria-label={`Cancel ${event.name}`}>
                    <Ban size={16} aria-hidden="true" /><span>Cancel event</span>
                  </button>
                )}
                <button onClick={() => setEditing(event)} className="btn btn-outline">
                  <Edit2 size={16} aria-hidden="true" /><span>Edit</span>
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
    </AdminShell>
  );
}

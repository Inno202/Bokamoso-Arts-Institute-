import { useCallback, useEffect, useState } from 'react';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { AdminShell } from './AdminShell';
import { EventFormDialog } from './EventFormDialog';
import { eventController } from '../../controllers/eventController';
import { BAIEvent } from '../../models/types';
import { formatCurrency, formatDateTime, friendlyError } from '../../controllers/lib/utils';
import { toast } from '../../services/toast';
import { logger } from '../../services/loggerService';

const STATUS_STYLE: Record<string, string> = {
  'On Sale': 'bg-green-100 text-green-900',
  Draft: 'bg-amber-100 text-amber-900',
  Closed: 'bg-bai-black/10 text-bai-black',
};

export default function AdminEvents() {
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

  const handleDelete = async (event: BAIEvent) => {
    const sold = event.ticketsSold > 0
      ? ` ${event.ticketsSold} ticket${event.ticketsSold === 1 ? ' has' : 's have'} already been issued for it, and those ticket holders will lose the event details.`
      : '';
    if (!window.confirm(`Delete "${event.name}"?${sold} This cannot be undone.`)) return;
    try {
      await eventController.deleteEvent(event.id);
      toast.success('Event deleted.');
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
                  <h2 className="font-bold text-lg break-words">{event.name}</h2>
                  <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${STATUS_STYLE[event.status] || STATUS_STYLE.Closed}`}>{event.status}</span>
                </div>
                <p className="num text-bai-black/75 mt-1">{formatDateTime(event.date) || 'No date'} · {[event.venue, event.city].filter(Boolean).join(', ')}</p>
              </div>
              <dl className="num flex gap-8 shrink-0">
                <div>
                  <dt className="text-sm text-bai-black/70">Price</dt>
                  <dd className="font-bold">{event.price > 0 ? formatCurrency(event.price) : 'Free'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-bai-black/70">Issued</dt>
                  <dd className="font-bold">{event.ticketsSold || 0} of {event.capacity}</dd>
                </div>
              </dl>
              <div className="flex gap-2 shrink-0">
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

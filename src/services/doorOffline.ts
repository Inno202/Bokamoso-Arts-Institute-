/**
 * Door scanning without signal.
 *
 * While the scanner phone is online it keeps a copy of the chosen event's ticket list
 * (reference, status, type, email). When the signal drops, tickets are checked against
 * that copy: a valid ticket is admitted on this phone and queued; a used, cancelled or
 * unknown one is refused. When the signal returns, queued admissions are recorded in the
 * database one by one, exactly as an online scan would be. If another phone admitted the
 * same ticket in the meantime, that is reported so staff know.
 *
 * Kept in this browser's storage on the staff phone only; lists for events that are over
 * are cleared.
 */
import { EVENT_OVER_AFTER_HOURS, toDate } from '../controllers/lib/utils';
import type { BAIEvent, Ticket } from '../models/types';

const LIST_KEY = (eventId: string) => `bai-door-list:${eventId}`;
const QUEUE_KEY = 'bai-door-queue';

type Row = [status: Ticket['status'], ticketType: string, buyerEmail: string];

export interface DoorList {
  eventId: string;
  eventName: string;
  eventDate: string;
  savedAt: number;
  tickets: Record<string, Row>;
}

export interface QueuedScan { ticketId: string; eventId: string; at: number }

export type OfflineCheck =
  | { kind: 'admit'; ticket: { id: string; ticketType: string; buyerEmail: string }; eventName: string }
  | { kind: 'refuse'; reason: 'used' | 'cancelled' | 'unknown' | 'no-list'; message: string };

const read = <T,>(key: string): T | null => {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : null; } catch { return null; }
};
const write = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
};

export const doorOffline = {
  /** Saves the event's tickets on this phone (replacing the earlier copy). */
  saveList(event: Pick<BAIEvent, 'id' | 'name' | 'date'>, tickets: Ticket[]) {
    const queuedHere = new Set(this.queue().filter(q => q.eventId === event.id).map(q => q.ticketId));
    const list: DoorList = {
      eventId: event.id,
      eventName: event.name,
      eventDate: toDate(event.date)?.toISOString() || '',
      savedAt: Date.now(),
      tickets: Object.fromEntries(tickets.map(t => [t.id, [
        // A ticket admitted on this phone but not yet synced stays "used" in the copy.
        queuedHere.has(t.id) ? 'SCANNED' : t.status,
        t.ticketType || '',
        t.buyerEmail || '',
      ] as Row])),
    };
    return write(LIST_KEY(event.id), list) ? list : null;
  },

  list(eventId: string) {
    return read<DoorList>(LIST_KEY(eventId));
  },

  /** Removes copies for events that are over. */
  clearOld(now = Date.now()) {
    try {
      for (const key of Object.keys(localStorage)) {
        if (!key.startsWith('bai-door-list:')) continue;
        const list = read<DoorList>(key);
        const when = list?.eventDate ? new Date(list.eventDate).getTime() : 0;
        if (!list || when + EVENT_OVER_AFTER_HOURS * 3600e3 < now) localStorage.removeItem(key);
      }
    } catch { /* storage unavailable */ }
  },

  /** Checks a ticket against the saved copy and, if valid, admits it on this phone. */
  check(ticketId: string, eventId: string): OfflineCheck {
    const list = this.list(eventId);
    if (!list) return { kind: 'refuse', reason: 'no-list', message: 'No ticket list is saved on this phone for this event, so tickets cannot be checked without signal. Connect to the internet to check this ticket.' };
    const row = list.tickets[ticketId];
    if (!row) return { kind: 'refuse', reason: 'unknown', message: `This ticket is not on the list for ${list.eventName}. It may be for another event.` };
    const [status, ticketType, buyerEmail] = row;
    if (status === 'SCANNED') return { kind: 'refuse', reason: 'used', message: 'This ticket has already been admitted.' };
    if (status !== 'VALID') return { kind: 'refuse', reason: 'cancelled', message: 'This ticket has been cancelled.' };
    list.tickets[ticketId] = ['SCANNED', ticketType, buyerEmail];
    write(LIST_KEY(eventId), list);
    write(QUEUE_KEY, [...this.queue(), { ticketId, eventId, at: Date.now() }]);
    return { kind: 'admit', ticket: { id: ticketId, ticketType, buyerEmail }, eventName: list.eventName };
  },

  queue(): QueuedScan[] {
    return read<QueuedScan[]>(QUEUE_KEY) || [];
  },

  /**
   * Records queued admissions in the database. `admit` is the normal online admission.
   * Returns the ones another phone had already admitted (or that were otherwise refused).
   */
  async sync(admit: (ticketId: string, eventId: string) => Promise<unknown>) {
    const conflicts: Array<QueuedScan & { message: string }> = [];
    for (const item of this.queue()) {
      try {
        await admit(item.ticketId, item.eventId);
      } catch (err) {
        const e = err as { kind?: string; code?: string; message?: string };
        // No signal after all: stop and try again later, keeping this and the rest queued.
        if (e?.code === 'unavailable' || (typeof navigator !== 'undefined' && navigator.onLine === false)) break;
        if (e?.kind) conflicts.push({ ...item, message: e.message || 'Could not be recorded.' });
        else break; // an unexpected error: keep it queued and retry later
      }
      write(QUEUE_KEY, this.queue().filter(q => q.ticketId !== item.ticketId));
    }
    return conflicts;
  },
};

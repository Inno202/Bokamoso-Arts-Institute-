import {
  collection,
  getDocs,
  doc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  runTransaction,
  getAggregateFromServer,
  count,
  sum,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from './lib/firebase';
import { BAIEvent, CartItem, Ticket, TicketScan } from '../models/types';
import { AppError, toDate } from './lib/utils';
import { MAX_PER_EVENT } from './cartController';
import { cacheService } from '../services/cacheService';
import { logger } from '../services/loggerService';

const TICKETS = 'tickets';
const SCANS = 'ticket_scanned';
const EVENTS = 'events';
const ORDERS = 'orders';
const HOLDINGS = 'ticket_holdings';

export interface PurchaseResult {
  /** References of every ticket issued. */
  ticketIds: string[];
  /** Events whose tickets were issued (their lines can leave the bag). */
  purchasedEventIds: string[];
  /** Set when an event in the bag could not be booked. */
  error?: unknown;
}

// No 0/O/1/I, so a reference can be read aloud at the door without mistakes.
const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Unguessable ticket reference: 12 characters from a cryptographic source (~60 bits). */
export function generateTicketId() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  let id = 'BAI-';
  for (const b of bytes) id += ID_ALPHABET[b % ID_ALPHABET.length];
  return id;
}

/** Accepts a scanned or typed reference in any case, with or without the prefix. */
export function normalizeTicketId(input: string) {
  const cleaned = input.trim().toUpperCase().replace(/\s+/g, '');
  return cleaned.startsWith('BAI-') ? cleaned : `BAI-${cleaned.replace(/^BAI/, '')}`;
}

const byNewest = (a: Ticket, b: Ticket) =>
  (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0);

export const ticketController = {
  /**
   * Checks out the bag, one event at a time. For each event a single transaction
   * records the order, issues one ticket per seat, moves the event's sold counter
   * and updates how many tickets this account holds, so two buyers can never take
   * the last seat between them and no account can exceed the per-event limit.
   * firestore.rules refuses the write unless all four agree.
   * Prices come from the event record, never from the bag.
   */
  async purchase(user: User, items: CartItem[]): Promise<PurchaseResult> {
    if (items.length === 0) throw new AppError('Your bag is empty.');

    const wanted = new Map<string, number>();
    for (const item of items) wanted.set(item.eventId, (wanted.get(item.eventId) || 0) + item.quantity);

    const result: PurchaseResult = { ticketIds: [], purchasedEventIds: [] };
    for (const [eventId, quantity] of wanted) {
      try {
        const ids = await runTransaction(db, async (tx) => {
          const eventRef = doc(db, EVENTS, eventId);
          const holdingRef = doc(db, HOLDINGS, `${user.uid}_${eventId}`);
          const [eventSnap, holdingSnap] = [await tx.get(eventRef), await tx.get(holdingRef)];

          if (!eventSnap.exists()) throw new AppError('One of the events in your bag is no longer available. Remove it and try again.');
          const event = { id: eventSnap.id, ...eventSnap.data() } as BAIEvent;
          if (event.status !== 'On Sale') throw new AppError(`Tickets for ${event.name} are no longer on sale.`);

          const remaining = (event.capacity || 0) - (event.ticketsSold || 0);
          if (quantity > remaining) {
            throw new AppError(remaining > 0
              ? `Only ${remaining} ${remaining === 1 ? 'ticket is' : 'tickets are'} left for ${event.name}. Lower the quantity and try again.`
              : `${event.name} is sold out.`);
          }

          const held = holdingSnap.exists() ? Number(holdingSnap.data().count) || 0 : 0;
          if (held + quantity > MAX_PER_EVENT) {
            const room = MAX_PER_EVENT - held;
            throw new AppError(room > 0
              ? `You already have ${held} ${held === 1 ? 'ticket' : 'tickets'} for ${event.name}. One account can hold ${MAX_PER_EVENT}, so you can add ${room} more.`
              : `You already have ${MAX_PER_EVENT} tickets for ${event.name}, which is the most one account can hold.`);
          }

          const ticketIds = Array.from({ length: quantity }, generateTicketId);
          const orderId = `${user.uid}_${eventId}_${held + quantity}`;
          const buyerEmail = user.email || '';

          tx.set(doc(db, ORDERS, orderId), {
            buyerId: user.uid,
            buyerEmail,
            eventId,
            eventName: event.name,
            unitPrice: event.price,
            quantity,
            ticketIds,
            createdAt: serverTimestamp(),
          });
          for (const id of ticketIds) {
            tx.set(doc(db, TICKETS, id), {
              orderId,
              eventId,
              eventName: event.name,
              ticketType: 'General Admission',
              buyerId: user.uid,
              buyerEmail,
              price: event.price,
              quantity: 1,
              status: 'VALID',
              createdAt: serverTimestamp(),
            });
          }
          tx.update(eventRef, { ticketsSold: (event.ticketsSold || 0) + quantity });
          tx.set(holdingRef, { buyerId: user.uid, eventId, count: held + quantity, updatedAt: serverTimestamp() });
          return ticketIds;
        });
        result.ticketIds.push(...ids);
        result.purchasedEventIds.push(eventId);
      } catch (error) {
        // Earlier events in the bag are already booked; report those along with the problem.
        result.error = error;
        break;
      }
    }

    cacheService.invalidate(EVENTS);
    return result;
  },

  subscribeToUserTickets(userId: string, callback: (tickets: Ticket[]) => void, onError?: (error: unknown) => void) {
    const q = query(collection(db, TICKETS), where('buyerId', '==', userId));
    return onSnapshot(q, (snapshot) => {
      const tickets = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Ticket[];
      callback(tickets.sort(byNewest));
    }, (error) => {
      logger.error('Could not load tickets', error);
      onError?.(error);
    });
  },

  /**
   * Admits a ticket at the door. The check and the status change happen in one
   * transaction, and the scan record is keyed by the ticket id, so a ticket can
   * be admitted once only, even with two scanners on the same code.
   */
  async admit(rawTicketId: string, scannerId: string) {
    const ticketId = normalizeTicketId(rawTicketId);
    if (!/^BAI-[A-Z0-9]{6,20}$/.test(ticketId)) throw new AppError('That is not a Bokamoso ticket reference.');

    const ticketRef = doc(db, TICKETS, ticketId);
    const ticket = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ticketRef);
      if (!snap.exists()) throw new AppError('No ticket matches that reference.');
      const data = { id: snap.id, ...snap.data() } as Ticket;

      if (data.status === 'SCANNED') {
        const when = toDate(data.scannedAt);
        throw new AppError(when ? `Already admitted at ${when.toLocaleString('en-ZA')}.` : 'This ticket has already been admitted.');
      }
      if (data.status !== 'VALID') throw new AppError('This ticket has been cancelled.');

      tx.set(doc(db, SCANS, ticketId), {
        ticketId,
        eventId: data.eventId,
        buyerEmail: data.buyerEmail || '',
        scannedAt: serverTimestamp(),
        scannedBy: scannerId,
      });
      tx.update(ticketRef, { status: 'SCANNED', scannedAt: serverTimestamp(), scannedBy: scannerId });
      return data;
    });

    return ticket;
  },

  async getRecentScans(max = 10) {
    const q = query(collection(db, SCANS), orderBy('scannedAt', 'desc'), limit(max));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as TicketScan[];
  },

  /** Server-side totals: one aggregation read instead of downloading every ticket. */
  async getSalesTotals() {
    const snap = await getAggregateFromServer(collection(db, TICKETS), {
      totalTickets: count(),
      revenue: sum('price'),
    });
    return { totalTickets: snap.data().totalTickets, revenue: snap.data().revenue || 0 };
  },
};

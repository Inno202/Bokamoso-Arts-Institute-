import {
  collection,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './lib/firebase';
import { BAIEvent } from '../models/types';
import { cacheService } from '../services/cacheService';
import { toDate } from './lib/utils';
import { logger } from '../services/loggerService';
import { preferServer } from './lib/preferServer';

const COLLECTION = 'events';
const MAX_LISTED = 100;

export type EventInput = Pick<BAIEvent, 'name' | 'venue' | 'city' | 'price' | 'capacity' | 'description' | 'status' | 'createdBy' | 'currency' | 'ticketUrl' | 'ticketProvider' | 'ticketTypes' | 'typeSold'> & {
  date: Date;
  bannerImageUrl?: string;
  ticketImageUrl?: string;
};

/**
 * Lists the most recently added event first. Events saved before creation times
 * were recorded go after those, by performance date.
 */
export function sortNewestFirst<T extends Pick<BAIEvent, 'createdAt' | 'date'>>(events: T[]): T[] {
  const added = (e: T) => toDate(e.createdAt)?.getTime() ?? -Infinity;
  const when = (e: T) => toDate(e.date)?.getTime() ?? Infinity;
  return [...events].sort((x, y) => (added(y) - added(x)) || (when(x) - when(y)));
}

export const eventController = {
  subscribeToEvents(
    callback: (events: BAIEvent[]) => void,
    activeOnly = true,
    onError?: (error: unknown) => void,
  ) {
    const constraints = activeOnly
      ? [where('status', '==', 'On Sale'), orderBy('date', 'asc'), limit(MAX_LISTED)]
      : [orderBy('date', 'asc'), limit(MAX_LISTED)];

    // preferServer: show the server's events (current photos and prices) rather than a flash
    // of the copy saved on this device from the last visit.
    return onSnapshot(query(collection(db, COLLECTION), ...constraints), { includeMetadataChanges: true }, preferServer((snapshot) => {
      // 'estimate' gives a just-created event its local time straight away, so it
      // jumps to the top at once instead of waiting for the server's timestamp.
      const events = sortNewestFirst(snapshot.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) })) as BAIEvent[]);
      events.forEach(e => cacheService.set(`${COLLECTION}:${e.id}`, e));
      callback(events);
    }), (error) => {
      logger.error('Could not load events', error);
      onError?.(error);
    });
  },

  async getEventById(eventId: string): Promise<BAIEvent | null> {
    if (!eventId) return null;
    const cacheKey = `${COLLECTION}:${eventId}`;
    const cached = cacheService.get(cacheKey);
    if (cached) return cached;

    const snap = await getDoc(doc(db, COLLECTION, eventId));
    if (!snap.exists()) return null;
    const event = { id: snap.id, ...snap.data() } as BAIEvent;
    cacheService.set(cacheKey, event);
    return event;
  },

  async createEvent(data: EventInput) {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      ticketsSold: 0,
      createdAt: serverTimestamp(),
    });
    cacheService.invalidate(COLLECTION);
    return docRef.id;
  },

  async updateEvent(eventId: string, data: Partial<EventInput>) {
    await updateDoc(doc(db, COLLECTION, eventId), { ...data, updatedAt: serverTimestamp() });
    cacheService.invalidate(COLLECTION);
  },

  /** Cancels a show: it leaves sale, its tickets show as cancelled and are refused at the door. */
  async cancelEvent(eventId: string) {
    await updateDoc(doc(db, COLLECTION, eventId), { status: 'Cancelled', updatedAt: serverTimestamp() });
    cacheService.invalidate(COLLECTION);
  },

  async deleteEvent(eventId: string) {
    await deleteDoc(doc(db, COLLECTION, eventId));
    cacheService.invalidate(COLLECTION);
  },
};

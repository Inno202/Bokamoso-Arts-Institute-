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
import { logger } from '../services/loggerService';

const COLLECTION = 'events';
const MAX_LISTED = 100;

export type EventInput = Pick<BAIEvent, 'name' | 'venue' | 'city' | 'price' | 'capacity' | 'description' | 'status' | 'createdBy'> & {
  date: Date;
  bannerImageUrl?: string;
  ticketImageUrl?: string;
};

export const eventController = {
  subscribeToEvents(
    callback: (events: BAIEvent[]) => void,
    activeOnly = true,
    onError?: (error: unknown) => void,
  ) {
    const constraints = activeOnly
      ? [where('status', '==', 'On Sale'), orderBy('date', 'asc'), limit(MAX_LISTED)]
      : [orderBy('date', 'asc'), limit(MAX_LISTED)];

    return onSnapshot(query(collection(db, COLLECTION), ...constraints), (snapshot) => {
      const events = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as BAIEvent[];
      events.forEach(e => cacheService.set(`${COLLECTION}:${e.id}`, e));
      callback(events);
    }, (error) => {
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

  async deleteEvent(eventId: string) {
    await deleteDoc(doc(db, COLLECTION, eventId));
    cacheService.invalidate(COLLECTION);
  },
};

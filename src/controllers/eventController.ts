import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './lib/firebase';
import { BAIEvent } from '../models/types';
import { cacheService } from '../services/cacheService';

const COLLECTION = 'events';

export const eventController = {
  async getAllEvents(activeOnly = true) {
    const cacheKey = `${COLLECTION}:all:${activeOnly}`;
    const cached = cacheService.get(cacheKey);
    if (cached) return cached;

    let q = query(collection(db, COLLECTION), orderBy('date', 'asc'));
    if (activeOnly) {
      q = query(q, where('status', '==', 'On Sale')); // Simple filter
    }

    const snapshot = await getDocs(q);
    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BAIEvent[];
    
    cacheService.set(cacheKey, events);
    return events;
  },

  async getEventById(eventId: string) {
    const cacheKey = `${COLLECTION}:${eventId}`;
    const cached = cacheService.get(cacheKey);
    if (cached) return cached;

    const docRef = doc(db, COLLECTION, eventId);
    const snap = await getDoc(docRef);
    
    if (!snap.exists()) return null;
    const event = { id: snap.id, ...snap.data() } as BAIEvent;
    
    cacheService.set(cacheKey, event);
    return event;
  },

  async createEvent(data: Partial<BAIEvent>) {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      ticketsSold: 0,
      createdAt: serverTimestamp()
    });
    cacheService.invalidate(COLLECTION);
    return docRef.id;
  },

  async updateEvent(eventId: string, data: Partial<BAIEvent>) {
    const docRef = doc(db, COLLECTION, eventId);
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
    cacheService.invalidate(COLLECTION);
  },

  async deleteEvent(eventId: string) {
    await deleteDoc(doc(db, COLLECTION, eventId));
    cacheService.invalidate(COLLECTION);
  }
};

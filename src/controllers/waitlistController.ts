/**
 * Waiting lists for sold-out shows. One entry per person per event (id "<event>_<account>"),
 * written only by that person, readable by them and by event staff (firestore.rules).
 * The site sends no emails yet, so staff contact people on the list themselves when
 * seats free up (the event report lists them with a copy button).
 */
import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from './lib/firebase';
import type { DateLike } from '../models/types';

const COLLECTION = 'waitlist';

export interface WaitlistEntry {
  id: string;
  eventId: string;
  uid: string;
  email: string;
  name: string;
  createdAt: DateLike;
}

const entryId = (eventId: string, uid: string) => `${eventId}_${uid}`;

export const waitlistController = {
  async isOn(eventId: string, uid: string) {
    return (await getDoc(doc(db, COLLECTION, entryId(eventId, uid)))).exists();
  },

  async join(eventId: string, user: User, name?: string | null) {
    await setDoc(doc(db, COLLECTION, entryId(eventId, user.uid)), {
      eventId,
      uid: user.uid,
      email: user.email || '',
      name: (name || user.displayName || '').slice(0, 100),
      createdAt: serverTimestamp(),
    });
  },

  async leave(eventId: string, uid: string) {
    await deleteDoc(doc(db, COLLECTION, entryId(eventId, uid)));
  },

  /** Staff: everyone waiting for an event, first come first served. */
  async forEvent(eventId: string) {
    const snap = await getDocs(query(collection(db, COLLECTION), where('eventId', '==', eventId), orderBy('createdAt', 'asc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as WaitlistEntry);
  },

  async remove(id: string) {
    await deleteDoc(doc(db, COLLECTION, id));
  },
};

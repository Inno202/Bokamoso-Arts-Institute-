/**
 * Version history for site content: every confirmed save keeps a copy of what was saved,
 * who saved it and when, under content/{section}/versions. Staff can look back and put an
 * earlier version back in the form (it goes live only when they save it again).
 *
 * A copy is written after the save itself and never blocks it. firestore.rules only accept
 * a copy that matches the content live at that moment, signed by the person saving, and
 * nobody can change or delete one.
 */
import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../controllers/lib/firebase';
import type { Data } from './fields';
import type { SectionKey } from './sections';
import type { DateLike } from '../models/types';
import { logger } from '../services/loggerService';

export const HISTORY_LIMIT = 20;

export interface ContentVersion {
  id: string;
  data: Data;
  savedAt: DateLike;
  savedBy: string;
  savedByName: string;
}

const versions = (key: SectionKey) => collection(db, 'content', key, 'versions');

/** Keeps a copy of what was just saved. Never throws: a missing copy must not undo a save. */
export async function recordVersion(key: SectionKey, data: Data, uid: string) {
  const work = (async () => {
    // The name comes from the profile as the database holds it (the rules check it matches).
    const profile = await getDoc(doc(db, 'users', uid));
    const savedByName = String(profile.data()?.displayName ?? '').slice(0, 100);
    await addDoc(versions(key), { data, savedAt: serverTimestamp(), savedBy: uid, savedByName });
  })();
  try {
    // A slow connection must not keep the Save button spinning: the save itself is already confirmed.
    await Promise.race([work, new Promise((_, reject) => setTimeout(() => reject(new Error('timed out')), 8_000))]);
  } catch (err) {
    logger.warn(`Could not keep a copy of the ${key} section`, err);
  }
}

/** The most recent saves of a section, newest first. */
export async function listVersions(key: SectionKey): Promise<ContentVersion[]> {
  const snap = await getDocs(query(versions(key), orderBy('savedAt', 'desc'), limit(HISTORY_LIMIT)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as ContentVersion);
}

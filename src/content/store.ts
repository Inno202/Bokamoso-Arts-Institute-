/**
 * The content store: one Firestore collection, `content`, with one document per
 * section. Public pages only ever READ through useContent(); the single write
 * path is saveSection(), used by the admin area and enforced by firestore.rules.
 */
import { useSyncExternalStore } from 'react';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../controllers/lib/firebase';
import { logger } from '../services/loggerService';
import { clean, validate, type Data, type Errors } from './fields';
import { SECTIONS, pickSource, resolveSection, type ContentMap, type ContentSource, type SectionKey } from './sections';

export const CONTENT_COLLECTION = 'content';
/** Firestore refuses documents over 1 MB; stop a little before that with a clear message. */
export const MAX_SECTION_BYTES = 900_000;

export interface SectionState<K extends SectionKey> {
  content: ContentMap[K];
  /** Where the content on screen came from. */
  source: ContentSource;
  /** False until the store has answered (or failed) at least once. */
  ready: boolean;
  updatedAt: Date | null;
}

type Entry<K extends SectionKey> = { state: SectionState<K>; listeners: Set<() => void>; started: boolean };
const entries = new Map<SectionKey, Entry<SectionKey>>();

function entryFor<K extends SectionKey>(key: K): Entry<K> {
  let entry = entries.get(key) as Entry<K> | undefined;
  if (!entry) {
    entry = {
      // Defaults are in place before anything loads, so a page is never blank.
      state: { content: SECTIONS[key].defaults, source: 'defaults', ready: false, updatedAt: null },
      listeners: new Set(),
      started: false,
    };
    entries.set(key, entry as unknown as Entry<SectionKey>);
  }
  return entry;
}

function publish<K extends SectionKey>(key: K, next: Partial<SectionState<K>>) {
  const entry = entryFor(key);
  entry.state = { ...entry.state, ...next, ready: true };
  entry.listeners.forEach(notify => notify());
}

/** One live listener per section for the whole app, however many components use it. */
function start<K extends SectionKey>(key: K) {
  const entry = entryFor(key);
  if (entry.started) return;
  entry.started = true;
  const def = SECTIONS[key];

  onSnapshot(doc(db, CONTENT_COLLECTION, key), async (snap) => {
    const stored = snap.exists() ? snap.data()?.data : undefined;
    let legacy: unknown;
    if (!stored && def.legacyPath) {
      try {
        const old = await getDoc(doc(db, def.legacyPath));
        legacy = old.exists() ? old.data() : undefined;
      } catch (err) {
        logger.error(`Could not read earlier ${key} content`, err);
      }
    }
    const { source, raw } = pickSource(stored, legacy);
    const updatedAt = snap.exists() ? snap.data()?.updatedAt?.toDate?.() ?? null : null;
    publish(key, { content: resolveSection(key, raw), source, updatedAt });
  }, (err) => {
    // Offline, blocked or denied: keep showing what we have (defaults at worst).
    logger.error(`Could not load ${key} content`, err);
    publish(key, {});
  });
}

/** Read-only access to a content section. Returns built-in defaults until (and unless) the store answers. */
export function useContentState<K extends SectionKey>(key: K): SectionState<K> {
  const entry = entryFor(key);
  return useSyncExternalStore(
    (notify) => {
      entry.listeners.add(notify);
      start(key);
      return () => { entry.listeners.delete(notify); };
    },
    () => entry.state,
  );
}

export const useContent = <K extends SectionKey>(key: K): ContentMap[K] => useContentState(key).content;

export class ContentValidationError extends Error {
  constructor(public errors: Errors) {
    super('Some fields need attention before this can be saved.');
  }
}

/**
 * Saves a section. Validates first, and saves only the declared fields.
 * firestore.rules decides whether the signed-in person is allowed to.
 */
export async function saveSection<K extends SectionKey>(key: K, draft: unknown, uid: string) {
  const def = SECTIONS[key];
  const data = clean(def.fields, draft);
  const errors = validate(def.fields, data);
  if (Object.keys(errors).length > 0) throw new ContentValidationError(errors);

  if (new Blob([JSON.stringify(data)]).size > MAX_SECTION_BYTES) {
    throw new ContentValidationError({
      '': 'This section now holds more image data than can be saved at once. Remove a photo or two, or connect Cloudinary so photos are stored outside the page.',
    });
  }

  await setDoc(doc(db, CONTENT_COLLECTION, key), {
    data: data as Data,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });
}

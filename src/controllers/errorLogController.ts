/**
 * The site error log: problems visitors and staff run into (a page that crashed, a
 * sign-in, booking or scan that failed for an unexpected reason, the bot check failing),
 * so a super admin hears about them before a customer has to call.
 *
 * Kept small and private on purpose: the error's code and a short message, the page,
 * the browser family and the release, and the account id if someone was signed in.
 * No emails, names or form contents. Entries can never be edited or deleted, and only
 * super admins can read them (firestore.rules).
 */
import { addDoc, collection, doc, getCountFromServer, updateDoc, getDocs, limit, orderBy, query, serverTimestamp, startAfter, Timestamp, where, type QueryDocumentSnapshot } from 'firebase/firestore';
import { getToken } from 'firebase/app-check';
import { appCheck, APP_CHECK_ENABLED, auth, db } from './lib/firebase';
import type { DateLike } from '../models/types';
import { toDate } from './lib/utils';

const COLLECTION = 'error_log';
const SEEN_KEY = 'bai-errors-seen';
export const ERROR_PAGE_SIZE = 50;
/** At most this many reports from one browser tab, so a broken page cannot flood the log. */
const PER_TAB_LIMIT = 15;

export const ERROR_KINDS = {
  page: 'Pages',
  signin: 'Sign-in',
  booking: 'Bookings',
  scan: 'Door scanner',
  botcheck: 'Bot check',
} as const;
export type ErrorKind = keyof typeof ERROR_KINDS;

export interface ErrorEntry {
  id: string;
  at: DateLike;
  kind: ErrorKind;
  code: string;
  message: string;
  page: string;
  browser: string;
  release: string;
  uid: string;
}

const RELEASE = typeof __RELEASE__ === 'string' ? __RELEASE__ : 'dev';

/** "Chrome on Android", "Safari on iPhone": enough to reproduce, nothing that identifies a person. */
export function browserFamily(ua = typeof navigator === 'undefined' ? '' : navigator.userAgent) {
  const browser = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /OPR\//.test(ua) ? 'Opera'
    : /Firefox\//.test(ua) ? 'Firefox' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Other browser';
  const os = /iPhone|iPod/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android'
    : /Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'other system';
  return `${browser} on ${os}`;
}

/** Short and free of anything personal: email addresses and long ids are blanked out. */
export function cleanMessage(text: string) {
  return text
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[email]')
    .replace(/\b[A-Za-z0-9_-]{28,}\b/g, '[id]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

/** Sign-in problems that are the person's own (a typo, a closed pop-up): not reported. */
const SIGN_IN_MISTAKES = new Set(['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email', 'auth/email-already-in-use', 'auth/weak-password', 'auth/password-does-not-meet-requirements', 'auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/too-many-requests', 'auth/network-request-failed', 'auth/missing-password', 'auth/user-disabled']);
export const isSignInMistake = (err: unknown) => SIGN_IN_MISTAKES.has(String((err as { code?: unknown })?.code || ''));

const sent = new Set<string>();

export const errorLog = {
  /**
   * Records a problem. Never throws and never slows the page down: if it cannot be
   * written (offline, blocked), it is simply dropped.
   */
  report(kind: ErrorKind, err: unknown, page = typeof location === 'undefined' ? '' : location.pathname) {
    // Not while pre-rendering, and not from a developer's machine pointed at the live database.
    if (typeof window === 'undefined' || (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS !== 'true')) return;
    const e = err as { code?: unknown; name?: unknown; message?: unknown } | null;
    const code = String(e?.code || e?.name || 'error').slice(0, 80);
    const message = cleanMessage(String(e?.message || err || ''));
    const key = `${kind}|${code}|${page}`;
    if (sent.has(key) || sent.size >= PER_TAB_LIMIT) return;
    sent.add(key);
    void addDoc(collection(db, COLLECTION), {
      at: serverTimestamp(),
      kind,
      code,
      message,
      page: page.slice(0, 200),
      browser: browserFamily().slice(0, 80),
      release: RELEASE.slice(0, 40),
      uid: auth.currentUser?.uid || '',
    }).catch(() => undefined);
  },

  /** One page of entries, newest first, optionally of one kind. */
  async page(kind?: ErrorKind, after?: QueryDocumentSnapshot) {
    const parts = [
      ...(kind ? [where('kind', '==', kind)] : []),
      orderBy('at', 'desc'),
      ...(after ? [startAfter(after)] : []),
      limit(ERROR_PAGE_SIZE),
    ];
    const snap = await getDocs(query(collection(db, COLLECTION), ...parts));
    return {
      entries: snap.docs.map(d => ({ id: d.id, ...d.data() }) as ErrorEntry),
      cursor: snap.docs.length === ERROR_PAGE_SIZE ? snap.docs[snap.docs.length - 1] : undefined,
    };
  },

  /**
   * When this super admin last looked at the error log: saved on their profile (so every device
   * agrees) and on this device (works even before the matching rules are deployed).
   */
  seenAt(profileSeenAt?: unknown): Date {
    let local = 0;
    try { local = Number(localStorage.getItem(SEEN_KEY) || 0); } catch { /* storage unavailable */ }
    const fromProfile = toDate(profileSeenAt as DateLike)?.getTime() ?? 0;
    const latest = Math.max(local, fromProfile);
    // Never looked: announce the last 7 days.
    return new Date(latest || Date.now() - 7 * 24 * 3600e3);
  },

  markSeen(uid: string) {
    try { localStorage.setItem(SEEN_KEY, String(Date.now())); } catch { /* storage unavailable */ }
    void updateDoc(doc(db, 'users', uid), { errorsSeenAt: serverTimestamp() }).catch(() => undefined);
  },

  /** How many problems were recorded since a moment (for the Overview notice). */
  async countSince(since: Date) {
    const snap = await getCountFromServer(query(collection(db, COLLECTION), where('at', '>=', Timestamp.fromDate(since))));
    return snap.data().count;
  },
};

export type BotCheckStatus = { state: 'off' } | { state: 'working' } | { state: 'failing'; reason: string };

/**
 * Asks App Check for a token right now, on this device. "failing" carries Firebase's own
 * reason (for example a 403 from the exchange), which is what to look up when the
 * console shows unverified requests.
 */
export async function checkBotCheck(): Promise<BotCheckStatus> {
  if (!APP_CHECK_ENABLED || !appCheck) return { state: 'off' };
  try {
    const { token } = await getToken(appCheck, false);
    return token ? { state: 'working' } : { state: 'failing', reason: 'No token was issued.' };
  } catch (err) {
    const e = err as { code?: string; message?: string };
    return { state: 'failing', reason: cleanMessage([e.code, e.message].filter(Boolean).join(': ')) || 'Unknown reason.' };
  }
}

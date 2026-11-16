/**
 * PRO staff ask for access to edit site content; a super admin or the CEO
 * approves it for a limited time, declines it, or ends it early. The Firestore
 * rules enforce all of this; these helpers only make the calls.
 */
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from './lib/firebase';
import { toDate } from './lib/utils';
import type { ContentAccess } from '../models/types';
import { logger } from '../services/loggerService';

const COLLECTION = 'content_access';
export const NOTE_LIMIT = 300;
/** Lengths an approver can choose. The rules allow at most 7 days. */
export const ACCESS_DURATIONS = [
  { hours: 1, label: '1 hour' },
  { hours: 24, label: '1 day' },
  { hours: 24 * 7, label: '1 week' },
] as const;

/** True while an approval is in force. */
export function hasLiveAccess(access: ContentAccess | null | undefined, now = Date.now()): boolean {
  if (access?.status !== 'APPROVED') return false;
  const until = toDate(access.expiresAt);
  return !!until && until.getTime() > now;
}

export const contentAccessController = {
  subscribeMine(uid: string, callback: (access: ContentAccess | null) => void, onError?: (e: unknown) => void) {
    return onSnapshot(doc(db, COLLECTION, uid), (snap) => {
      callback(snap.exists() ? ({ ...snap.data({ serverTimestamps: 'estimate' }), uid: snap.id } as ContentAccess) : null);
    }, (err) => { logger.error('Could not load content access', err); onError?.(err); });
  },

  /** For super admins and the CEO: every request, newest first. */
  subscribeAll(callback: (all: ContentAccess[]) => void, onError?: (e: unknown) => void) {
    return onSnapshot(query(collection(db, COLLECTION), orderBy('requestedAt', 'desc')), (snap) => {
      callback(snap.docs.map(d => ({ ...d.data({ serverTimestamps: 'estimate' }), uid: d.id } as ContentAccess)));
    }, (err) => { logger.error('Could not load content access requests', err); onError?.(err); });
  },

  async request(user: User, name: string, note: string) {
    await setDoc(doc(db, COLLECTION, user.uid), {
      uid: user.uid,
      name: (name || user.email || 'PRO').trim().slice(0, 100),
      email: user.email || '',
      note: note.trim().slice(0, NOTE_LIMIT),
      status: 'PENDING',
      requestedAt: serverTimestamp(),
    });
  },

  async approve(uid: string, approverId: string, hours: number) {
    await updateDoc(doc(db, COLLECTION, uid), {
      status: 'APPROVED',
      decidedBy: approverId,
      decidedAt: serverTimestamp(),
      // A little under the full length, so the rules' "at most N" check never trips on clock drift.
      expiresAt: Timestamp.fromMillis(Date.now() + hours * 3600e3 - 60e3),
    });
  },

  async decline(uid: string, approverId: string) {
    await updateDoc(doc(db, COLLECTION, uid), { status: 'DECLINED', decidedBy: approverId, decidedAt: serverTimestamp() });
  },

  async end(uid: string, approverId: string) {
    await updateDoc(doc(db, COLLECTION, uid), { status: 'ENDED', decidedBy: approverId, decidedAt: serverTimestamp(), expiresAt: serverTimestamp() });
  },
};

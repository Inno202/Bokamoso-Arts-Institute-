/**
 * The staff activity log: who did what, and when. Entries are written by the app
 * as each action happens, can only be written in the writer's own name, can never
 * be edited or deleted, and only super admins can read them (all in firestore.rules).
 */
import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, startAfter, where, type QueryDocumentSnapshot } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from './lib/firebase';
import type { DateLike, UserRole } from '../models/types';
import { logger } from '../services/loggerService';

const COLLECTION = 'activity_log';
export const PAGE_SIZE = 50;
const SUMMARY_LIMIT = 300;

export const ACTIVITY_AREAS = {
  people: 'People',
  events: 'Events',
  content: 'Site content',
  access: 'Content access',
  tickets: 'Tickets',
} as const;
export type ActivityArea = keyof typeof ACTIVITY_AREAS;

export type ActivityAction =
  | 'user.created' | 'user.role' | 'user.deactivated' | 'user.reactivated'
  | 'event.created' | 'event.updated' | 'event.deleted' | 'event.cancelled'
  | 'content.saved'
  | 'access.requested' | 'access.approved' | 'access.declined' | 'access.ended'
  | 'ticket.cancelled';

export const areaOf = (action: ActivityAction): ActivityArea =>
  action.startsWith('user.') ? 'people'
    : action.startsWith('event.') ? 'events'
    : action.startsWith('content.') ? 'content'
    : action.startsWith('access.') ? 'access'
    : 'tickets';

export interface ActivityEntry {
  id: string;
  at: DateLike;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: ActivityAction;
  area: ActivityArea;
  summary: string;
  targetId: string;
}

export interface Actor { user: User | null; name?: string | null; role: UserRole | null }

export const activityController = {
  /**
   * Records an action. Never stops the action itself: if the entry cannot be written
   * (for example offline), the problem is logged and the person carries on.
   */
  async record(actor: Actor, action: ActivityAction, summary: string, targetId = '') {
    if (!actor.user || !actor.role) return;
    try {
      await addDoc(collection(db, COLLECTION), {
        at: serverTimestamp(),
        actorId: actor.user.uid,
        actorName: (actor.name || actor.user.displayName || actor.user.email || 'Staff').slice(0, 100),
        actorRole: actor.role,
        action,
        area: areaOf(action),
        summary: summary.replace(/\s+/g, ' ').trim().slice(0, SUMMARY_LIMIT),
        targetId: targetId.slice(0, 200),
      });
    } catch (err) {
      logger.error('Could not write to the activity log', err);
    }
  },

  /** One page of entries, newest first, optionally for one area. */
  async page(area?: ActivityArea, after?: QueryDocumentSnapshot) {
    const parts = [
      ...(area ? [where('area', '==', area)] : []),
      orderBy('at', 'desc'),
      ...(after ? [startAfter(after)] : []),
      limit(PAGE_SIZE),
    ];
    const snap = await getDocs(query(collection(db, COLLECTION), ...parts));
    return {
      entries: snap.docs.map(d => ({ id: d.id, ...d.data() }) as ActivityEntry),
      cursor: snap.docs.length === PAGE_SIZE ? snap.docs[snap.docs.length - 1] : undefined,
    };
  },
};

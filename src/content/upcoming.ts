/**
 * The next events on sale, for the home page. Read-only and live: an event added
 * (or put on sale) in the admin area appears here straight away, and disappears
 * once it is closed, deleted, or its date has passed.
 */
import { useSyncExternalStore } from 'react';
import { eventController } from '../controllers/eventController';
import { toDate } from '../controllers/lib/utils';
import type { BAIEvent } from '../models/types';

export interface UpcomingEvent {
  id: string;
  name: string;
  venue: string;
  city: string;
  /** ISO date string, so it can be baked into pre-rendered HTML and compared after hydration. */
  date: string;
  price: number;
  soldOut: boolean;
}

export const UPCOMING_LIMIT = 3;
/** An event stays listed until a few hours after it starts. */
const GRACE_MS = 6 * 60 * 60 * 1000;

/** Picks the next events still to happen, soonest first. Pure, so the build and the browser agree. */
export function pickUpcoming(events: Array<Partial<BAIEvent> & { id: string }>, now = Date.now()): UpcomingEvent[] {
  return events
    .filter(e => e.status === 'On Sale')
    .map(e => ({ e, when: toDate(e.date) }))
    .filter(({ when }) => !!when && when.getTime() + GRACE_MS >= now)
    .sort((a, b) => a.when!.getTime() - b.when!.getTime())
    .slice(0, UPCOMING_LIMIT)
    .map(({ e, when }) => ({
      id: e.id,
      name: String(e.name || 'Event').slice(0, 200),
      venue: String(e.venue || '').slice(0, 200),
      city: String(e.city || '').slice(0, 100),
      date: when!.toISOString(),
      price: Number(e.price) || 0,
      soldOut: (Number(e.capacity) || 0) - (Number(e.ticketsSold) || 0) <= 0,
    }));
}

let state: UpcomingEvent[] = [];
const listeners = new Set<() => void>();
let started = false;

/** Starts from the list captured at build time, so pre-rendered HTML and the first browser render match. */
export function seedUpcoming(list: unknown) {
  if (!Array.isArray(list)) return;
  state = list
    .filter((e): e is UpcomingEvent => !!e && typeof e.id === 'string' && typeof e.name === 'string' && !Number.isNaN(new Date(e.date).getTime()))
    .slice(0, UPCOMING_LIMIT)
    .map(e => ({ id: e.id, name: e.name, venue: String(e.venue || ''), city: String(e.city || ''), date: e.date, price: Number(e.price) || 0, soldOut: !!e.soldOut }));
}

function start() {
  if (started) return;
  started = true;
  eventController.subscribeToEvents((events) => {
    state = pickUpcoming(events);
    listeners.forEach(notify => notify());
  }, true);
}

export function useUpcomingEvents(): UpcomingEvent[] {
  return useSyncExternalStore(
    (notify) => { listeners.add(notify); start(); return () => { listeners.delete(notify); }; },
    () => state,
    () => state,
  );
}

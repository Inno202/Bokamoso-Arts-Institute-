/**
 * The event an event page was pre-rendered with, so the page appears instantly with its
 * details (and link previews work), and the browser's first render matches the HTML.
 */
import type { BAIEvent } from '../models/types';

let seeded: BAIEvent | null = null;

export function seedEvent(event: unknown) {
  const e = event as Partial<BAIEvent> | null;
  if (e && typeof e.id === 'string' && typeof e.name === 'string') seeded = e as BAIEvent;
}

export const seededEvent = (id: string) => (seeded && seeded.id === id ? seeded : null);

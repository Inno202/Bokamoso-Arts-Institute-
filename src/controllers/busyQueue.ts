/**
 * The ticket queue for busy moments.
 *
 * Every booking updates the event's seat count in one database transaction, so two buyers
 * can never take the same last seat. When hundreds of people book the same event at once,
 * those transactions collide and the database asks some of them to try again. Instead of
 * failing, the booking waits in line: it retries with growing, randomised pauses (so the
 * crowd spreads out instead of colliding again) while the buyer sees the queue screen.
 *
 * Nothing is ever booked twice: before each retry, `alreadyBooked` checks whether an
 * earlier attempt actually went through and only its confirmation was lost.
 * Answers written for the buyer (sold out, limit reached) are never retried.
 */
import { AppError } from './lib/utils';

export interface QueueOptions<T> {
  /** Called when the booking starts waiting in line, with the time it started waiting. */
  onWaiting?: (since: number) => void;
  /** Returns the result of an earlier attempt that did go through, or undefined. */
  alreadyBooked?: () => Promise<T | undefined>;
  /** Longest total wait before giving up, in ms (default 3 minutes). */
  maxWaitMs?: number;
  /** For tests: how to pause, and a random source. */
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  now?: () => number;
}

/**
 * Database answers that mean "too busy right now, try again", as opposed to a real refusal.
 * Inside a booking, 'failed-precondition' means the seat count changed underneath us (another
 * buyer got there first): Firebase's web library reports collisions that way once its own
 * few quick retries are used up. A refusal by the security rules is 'permission-denied'.
 */
const BUSY_CODES = new Set(['aborted', 'failed-precondition', 'resource-exhausted', 'unavailable', 'deadline-exceeded']);
/** Of those, the ones where the booking may have gone through without us hearing back. */
const UNCLEAR_CODES = new Set(['unavailable', 'deadline-exceeded']);

const codeOf = (error: unknown) => String((error as { code?: string } | null)?.code || '').replace(/^firestore\//, '');

export function isBusyError(error: unknown) {
  return BUSY_CODES.has(codeOf(error));
}

/** The pause before attempt n (1, 2, 3...): grows from about 1 s to at most 12 s, randomised. */
export function pauseBefore(attempt: number, random = Math.random) {
  const ceiling = Math.min(12_000, 1_000 * 1.7 ** attempt);
  return Math.round(ceiling * (0.5 + random() * 0.5));
}

export class QueueTimeout extends AppError {
  constructor() {
    super('We could not get you through the queue in time. Nothing was booked or charged: please try again in a few minutes.');
    this.name = 'QueueTimeout';
  }
}

export async function waitInLine<T>(attempt: () => Promise<T>, options: QueueOptions<T> = {}): Promise<T> {
  const sleep = options.sleep || ((ms: number) => new Promise<void>(r => setTimeout(r, ms)));
  const random = options.random || Math.random;
  const now = options.now || Date.now;
  const maxWait = options.maxWaitMs ?? 180_000;
  let since: number | null = null;

  for (let n = 1; ; n++) {
    try {
      return await attempt();
    } catch (error) {
      if (!isBusyError(error)) throw error;
      // Offline is not "busy": say so straight away rather than wait.
      if (typeof navigator !== 'undefined' && navigator.onLine === false) throw error;
      if (since === null) { since = now(); options.onWaiting?.(since); }
      if (now() - since > maxWait) throw new QueueTimeout();
      await sleep(pauseBefore(n, random));
      if (UNCLEAR_CODES.has(codeOf(error)) && options.alreadyBooked) {
        const done = await options.alreadyBooked().catch(() => undefined);
        if (done !== undefined) return done;
      }
    }
  }
}

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { DateLike } from '../../models/types';
import { formatMoney } from '../../models/currency';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toDate(date: DateLike): Date | null {
  if (!date) return null;
  if (date instanceof Date) return date;
  if (typeof date === 'object' && 'seconds' in date) return new Date(date.seconds * 1000);
  const parsed = new Date(date as string);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Events have a start time but no end time: one counts as over this long after it starts. */
export const EVENT_OVER_AFTER_HOURS = 12;
export function eventHasEnded(date: DateLike, now = Date.now()) {
  const start = toDate(date);
  return !!start && start.getTime() + EVENT_OVER_AFTER_HOURS * 3_600_000 < now;
}

/**
 * Every date and time on the site is shown in South African time (the same hour for
 * Eswatini, Botswana and Lesotho). This also makes the pages built in advance (on a
 * server set to UTC) match exactly what the visitor's browser draws.
 */
export const SITE_TIME_ZONE = 'Africa/Johannesburg';

export function formatDate(date: DateLike, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) {
  const d = toDate(date);
  return d ? d.toLocaleDateString('en-ZA', { timeZone: SITE_TIME_ZONE, ...options }) : '';
}

export function formatTime(date: DateLike) {
  const d = toDate(date);
  return d ? d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', timeZone: SITE_TIME_ZONE }) : '';
}

export function formatDateTime(date: DateLike) {
  const d = toDate(date);
  return d ? `${formatDate(d, { day: 'numeric', month: 'short', year: 'numeric' })}, ${formatTime(d)}` : '';
}

/** Money in an event's currency (rand when none is given). */
export function formatCurrency(amount: number, currency?: unknown) {
  return formatMoney(amount || 0, currency);
}

/** Turns Firebase/JS errors into something a visitor can act on, without leaking internals. */
export function friendlyError(err: unknown, fallback = 'Something went wrong. Please try again.') {
  const code = (err as { code?: string })?.code || '';
  const map: Record<string, string> = {
    'auth/invalid-credential': 'That email and password do not match. Check them and try again.',
    'auth/wrong-password': 'That email and password do not match. Check them and try again.',
    'auth/user-not-found': 'That email and password do not match. Check them and try again.',
    'auth/invalid-email': 'That email address does not look right.',
    'auth/email-already-in-use': 'An account with that email already exists. Try signing in instead.',
    'auth/weak-password': 'Choose a longer password, at least 8 characters.',
    'auth/too-many-requests': 'Too many attempts. Wait a few minutes, then try again.',
    'auth/popup-closed-by-user': 'The Google window was closed before sign-in finished.',
    'auth/popup-blocked': 'Your browser blocked the Google window. Allow pop-ups for this site and try again.',
    'auth/network-request-failed': 'No connection. Check your internet and try again.',
    'auth/user-disabled': 'This account has been disabled. Contact the institute for help.',
    'auth/operation-not-allowed': 'This sign-in method is not switched on yet. Try signing in with Google.',
    // App Check is enforced but this browser's check failed (or is not set up correctly in the console).
    'auth/firebase-app-check-token-is-invalid': 'The site could not confirm this is a real browser. Reload the page and try again; if it keeps happening, the site\'s bot check needs attention.',
    'auth/app-check-token-is-invalid': 'The site could not confirm this is a real browser. Reload the page and try again; if it keeps happening, the site\'s bot check needs attention.',
    'permission-denied': 'You do not have permission to do that.',
    'unavailable': 'No connection. Check your internet and try again.',
    'failed-precondition': 'That could not be completed right now. Please try again.',
  };
  // The password policy in Firebase says exactly what is missing; pass that on in plain words.
  if (code === 'auth/password-does-not-meet-requirements') {
    const list = /\[([^\]]+)\]/.exec((err as Error)?.message || '')?.[1];
    return list ? `Choose a stronger password. ${list.split(',').map(x => x.trim().replace(/\.$/, '')).join('. ')}.` : 'Choose a stronger password: at least 8 characters with a mix of letters and numbers.';
  }
  if (map[code]) return map[code];
  if (err instanceof AppError) return err.message;
  return fallback;
}

/** An error whose message is already written for the visitor. */
export class AppError extends Error {}

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { DateLike } from '../../models/types';

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

export function formatDate(date: DateLike, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) {
  const d = toDate(date);
  return d ? d.toLocaleDateString('en-ZA', options) : '';
}

export function formatTime(date: DateLike) {
  const d = toDate(date);
  return d ? d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) : '';
}

export function formatDateTime(date: DateLike) {
  const d = toDate(date);
  return d ? `${formatDate(d, { day: 'numeric', month: 'short', year: 'numeric' })}, ${formatTime(d)}` : '';
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(amount || 0);
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
    'permission-denied': 'You do not have permission to do that.',
    'unavailable': 'No connection. Check your internet and try again.',
    'failed-precondition': 'That could not be completed right now. Please try again.',
  };
  if (map[code]) return map[code];
  if (err instanceof AppError) return err.message;
  return fallback;
}

/** An error whose message is already written for the visitor. */
export class AppError extends Error {}

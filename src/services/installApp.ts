/**
 * "Add BAI to your home screen". Android/Chrome offer the install once, early, through the
 * `beforeinstallprompt` event, so it is caught as soon as the site starts and kept for when
 * a page offers it. iPhones have no such event: they get short instructions instead.
 * A "Not now" is remembered on that device. Nothing is offered once the site is installed.
 */
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const INSTALL_DISMISSED_KEY = 'bai-install-dismissed';

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(fn => fn());

export function captureInstallOffer() {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // the site shows its own, quieter offer where it helps
    deferred = e as InstallEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => { deferred = null; notify(); });
}

export function isInstalled() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** iPhone or iPad Safari, where installing is done from the Share menu. */
export function isIos() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

export function wasDismissed() {
  try { return localStorage.getItem(INSTALL_DISMISSED_KEY) === '1'; } catch { return false; }
}

export function dismissInstall() {
  try { localStorage.setItem(INSTALL_DISMISSED_KEY, '1'); } catch { /* simply shown again next time */ }
  notify();
}

/** 'prompt' (one-tap install), 'ios' (Share instructions) or null (nothing to offer). */
export function installOffer(): 'prompt' | 'ios' | null {
  if (isInstalled() || wasDismissed()) return null;
  if (deferred) return 'prompt';
  if (isIos()) return 'ios';
  return null;
}

export async function installNow() {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  await event.prompt();
  const { outcome } = await event.userChoice;
  notify();
  return outcome === 'accepted';
}

export function onInstallChange(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

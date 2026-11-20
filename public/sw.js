/*
 * Keeps a copy of the site on the phone so My Tickets (and the pages already
 * visited) open without a signal at the door. Tickets themselves come from the
 * app's own offline database copy; this file only makes the pages load.
 *
 * - Pages: network first, always asking the server for the newest version (never the
 *   browser's short-term copy), so a new release shows straight away; saved copy offline.
 * - Built files (names carry a fingerprint, so they never change): saved once, reused.
 * - Site photos and other unfingerprinted files: network first, saved copy offline.
 * - Fonts and uploaded event photos (each upload has its own address): saved as seen.
 * Database, sign-in and upload requests are never touched.
 */
const VERSION = 'v2';
const PAGES = `bai-pages-${VERSION}`;
const FILES = `bai-files-${VERSION}`;
const PHOTOS = `bai-photos-${VERSION}`;
const SCOPE = new URL(self.registration.scope);
const OFFLINE_START = ['', 'my-tickets/'];
const MAX_PHOTOS = 80;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const pages = await caches.open(PAGES);
    const files = await caches.open(FILES);
    for (const path of OFFLINE_START) {
      try {
        const url = new URL(path, SCOPE).href;
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) continue;
        await pages.put(url, res.clone());
        // Also save the scripts and styles that page needs.
        const html = await res.text();
        const refs = [...html.matchAll(/(?:src|href)="([^"]*\/assets\/[^"]+\.(?:js|css))"/g)].map(m => new URL(m[1], SCOPE).href);
        await Promise.all(refs.map(ref => files.add(ref).catch(() => undefined)));
      } catch { /* offline during install: try again next time */ }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = [PAGES, FILES, PHOTOS];
    for (const name of await caches.keys()) if (name.startsWith('bai-') && !keep.includes(name)) await caches.delete(name);
    await self.clients.claim();
  })());
});

const fingerprinted = (url) => /-[A-Za-z0-9_-]{8,}\.(?:js|css)$/.test(url.pathname);

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(key);
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGES);
  const key = request.url.split('#')[0].split('?')[0];
  try {
    // 'no-cache' revalidates with the server (a quick "not modified" when nothing changed)
    // instead of reusing the browser's copy, which GitHub Pages lets live for 10 minutes.
    const res = await fetch(request.url, { cache: 'no-cache', credentials: 'same-origin', redirect: 'manual' });
    if (res.ok) cache.put(key, res.clone());
    return res;
  } catch {
    return (await cache.match(key))
      || (key.includes('/my-tickets') && await cache.match(new URL('my-tickets/', SCOPE).href))
      || (await cache.match(SCOPE.href))
      || new Response('You are offline.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request, { cache: 'no-cache' });
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    const hit = await cache.match(request);
    if (hit) return hit;
    throw new Error('offline');
  }
}

async function staleWhileRevalidate(request, cacheName, max) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const refresh = fetch(request).then(async (res) => {
    if (res.ok || res.type === 'opaque') {
      await cache.put(request, res.clone());
      if (max) await trim(cacheName, max);
    }
    return res;
  }).catch(() => hit);
  return hit || refresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === SCOPE.origin && url.pathname.startsWith(SCOPE.pathname)) {
    if (request.mode === 'navigate') return event.respondWith(networkFirstPage(request));
    if (url.pathname.includes('/assets/')) {
      return event.respondWith(fingerprinted(url) ? cacheFirst(request, FILES) : networkFirst(request, FILES));
    }
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    return event.respondWith(staleWhileRevalidate(request, FILES));
  }
  if (url.hostname === 'res.cloudinary.com' && request.destination === 'image') {
    return event.respondWith(staleWhileRevalidate(request, PHOTOS, MAX_PHOTOS));
  }
  // Everything else (database, sign-in, uploads, bot check) goes straight to the network.
});

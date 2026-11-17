/**
 * Pre-renders the public pages to finished HTML after `vite build`.
 *
 *   1. Reads the site's current content from Firestore (public, read-only), so the
 *      HTML carries real content rather than built-in defaults. If the database
 *      cannot be reached the build still succeeds, using the defaults.
 *   2. Renders each public route with the server build (build/ssr/entry-server.js).
 *   3. Writes dist/<route>/index.html, plus plain app shells for the signed-in
 *      routes and for 404.html, so every address opens directly on GitHub Pages.
 *
 * Content edited after a build still appears: the browser starts from the baked
 * HTML and then switches to the live content within a moment.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const DIST = 'dist';
const config = JSON.parse(await readFile('firebase-applet-config.json', 'utf8'));
const BASE = '/Bokamoso-Arts-Institute-';

const TITLES = {
  '/': 'Bokamoso Arts Institute | Choral excellence from Mabopane',
  '/about': 'About us | Bokamoso Arts Institute',
  '/programs': 'Our work | Bokamoso Arts Institute',
  '/events': 'Events and tickets | Bokamoso Arts Institute',
  '/traditions': 'Our traditions | Bokamoso Arts Institute',
  '/login': 'Sign in | Bokamoso Arts Institute',
  '/register': 'Create an account | Bokamoso Arts Institute',
  '/terms': 'Terms of use | Bokamoso Arts Institute',
  '/privacy': 'Privacy policy | Bokamoso Arts Institute',
  '/cookies': 'Cookie policy | Bokamoso Arts Institute',
};

// Signed-in and staff pages are never pre-rendered: they get the plain shell.
const SHELL_ROUTES = ['/cart', '/checkout', '/my-tickets', '/account', '/dashboard', '/scanner', '/admin/events', '/admin/content', '/admin/users', '/admin/activity',
  ...['site', 'home', 'about', 'work', 'traditions'].map(s => `/admin/content/${s}`)];

// ---------- 1. content ----------

const DOCS = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${config.firestoreDatabaseId}/documents`;

/** Firestore's REST format to plain values. */
function decode(value) {
  const [type, v] = Object.entries(value)[0];
  switch (type) {
    case 'stringValue': case 'timestampValue': case 'referenceValue': return v;
    case 'booleanValue': return v;
    case 'integerValue': return Number(v);
    case 'doubleValue': return v;
    case 'nullValue': return null;
    case 'arrayValue': return (v.values || []).map(decode);
    case 'mapValue': return Object.fromEntries(Object.entries(v.fields || {}).map(([k, x]) => [k, decode(x)]));
    default: return undefined;
  }
}

async function getDoc(path) {
  const res = await fetch(`${DOCS}/${path}`, { signal: AbortSignal.timeout(15000) });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  const body = await res.json();
  return Object.fromEntries(Object.entries(body.fields || {}).map(([k, v]) => [k, decode(v)]));
}

const raw = {};
try {
  for (const key of ['site', 'home', 'about', 'work', 'traditions']) {
    const stored = (await getDoc(`content/${key}`))?.data;
    if (stored && Object.keys(stored).length) raw[key] = stored;
  }
  // Sections saved before the content store existed (same fallback as the live site).
  for (const [key, legacy] of [['about', 'about/main'], ['work', 'work/main']]) {
    if (!raw[key]) {
      const old = await getDoc(legacy);
      if (old && Object.keys(old).length) raw[key] = old;
    }
  }
  console.log(`prerender: live content for ${Object.keys(raw).join(', ') || 'no sections (defaults used)'}`);
} catch (err) {
  console.warn(`prerender: could not read live content (${err.message}); using built-in defaults`);
}

// The next events on sale, for the home page's Upcoming events section.
let events = [];
try {
  const res = await fetch(`${DOCS}:runQuery`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId: 'events' }],
      where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'On Sale' } } },
      orderBy: [{ field: { fieldPath: 'date' }, direction: 'ASCENDING' }],
      limit: 50,
    } }),
  });
  if (!res.ok) throw new Error(`events: HTTP ${res.status}`);
  events = (await res.json()).filter(r => r.document).map(r => ({
    id: r.document.name.split('/').pop(),
    ...Object.fromEntries(Object.entries(r.document.fields || {}).map(([k, v]) => [k, decode(v)])),
  }));
} catch (err) {
  console.warn(`prerender: could not read events (${err.message}); the home page will load them in the browser`);
}

// ---------- 2 & 3. render ----------

const server = await import(pathToFileURL(join(process.cwd(), 'build/ssr/entry-server.js')).href);
const content = server.prepareContent(raw);
const upcomingEvents = server.prepareUpcoming(events);
console.log(`prerender: ${upcomingEvents.length} upcoming event(s) on the home page`);
const template = await readFile(join(DIST, 'index.html'), 'utf8');
if (!template.includes('<div id="root"></div>')) throw new Error('dist/index.html has no empty #root to fill');

// JSON inside a non-executing script tag; "<" escaped so content can never close the tag.
const seed = JSON.stringify({ ...content, upcomingEvents }).replace(/</g, '\\u003c');
const seedTag = `<script type="application/json" id="bai-content">${seed}</script>`;

const setTitle = (html, title) => html.replace(/<title>[^<]*<\/title>/, `<title>${title.replace(/</g, '&lt;')}</title>`);

async function write(route, html) {
  const file = route === '/' ? join(DIST, 'index.html') : join(DIST, route, 'index.html');
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, html);
}

for (const route of server.PRERENDERED_ROUTES) {
  const body = await server.render(`${BASE}${route === '/' ? '/' : route}`, BASE);
  let html = template.replace('<div id="root"></div>', `<div id="root" data-route="${route}">${body}</div>${seedTag}`);
  html = setTitle(html, TITLES[route] || TITLES['/']);
  await write(route, html);
  console.log(`prerender: ${route} (${Math.round(html.length / 1024)} kB)`);
}

const shell = template.replace('<div id="root"></div>', `<div id="root"></div>${seedTag}`);
for (const route of SHELL_ROUTES) await write(route, shell);
await writeFile(join(DIST, '404.html'), shell);
console.log(`prerender: ${SHELL_ROUTES.length} app shells and 404.html`);

// Firebase keeps connections open; the work is done.
process.exit(0);

// Security-rule tests. Run with `npm run test:rules` (needs Java for the emulator).
import { setLogLevel } from 'firebase/firestore';
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where,
  writeBatch, serverTimestamp, Timestamp, increment,
} from 'firebase/firestore';

setLogLevel('silent');
let env;
const TICKET = 'BAI-ABCDEFGH2345';
const TICKET2 = 'BAI-ZZZZZZZZ9999';

const nowSeconds = () => Math.floor(Date.now() / 1000);
const as = (uid, email = `${uid}@example.com`, signedInSecondsAgo = 60) =>
  env.authenticatedContext(uid, { email, auth_time: nowSeconds() - signedInSecondsAgo }).firestore();
const guest = () => env.unauthenticatedContext().firestore();

const profile = (role, extra = {}) => ({
  email: 'x@example.com', displayName: 'X', role, isActive: true, createdAt: Timestamp.now(), ...extra,
});
const eventDoc = (extra = {}) => ({
  name: 'Gala', venue: 'Hall', city: 'Pretoria', date: Timestamp.now(), price: 150,
  capacity: 2, ticketsSold: 0, status: 'On Sale', description: '', ...extra,
});
const ticketDoc = (uid, extra = {}) => ({
  orderId: `${uid}_e1_1`, eventId: 'e1', eventName: 'Gala', ticketType: 'General Admission', buyerId: uid,
  buyerEmail: `${uid}@example.com`, price: 150, quantity: 1, status: 'VALID',
  createdAt: serverTimestamp(), ...extra,
});

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-bai',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
after(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/root'), profile('SUPER_ADMIN'));
    await setDoc(doc(db, 'users/ceo'), profile('CEO'));
    await setDoc(doc(db, 'users/pro'), profile('PRO'));
    await setDoc(doc(db, 'users/fin'), profile('FINANCE_MANAGER'));
    await setDoc(doc(db, 'users/door'), profile('TICKET_SCANNER'));
    await setDoc(doc(db, 'users/alice'), profile('USER', { email: 'alice@example.com' }));
    await setDoc(doc(db, 'users/exadmin'), profile('SUPER_ADMIN', { isActive: false }));
    await setDoc(doc(db, 'events/e1'), eventDoc());
    await setDoc(doc(db, 'events/closed'), eventDoc({ status: 'Closed' }));
    await setDoc(doc(db, 'tickets/BAI-EXISTING2345'), { ...ticketDoc('alice'), createdAt: Timestamp.now() });
    await setDoc(doc(db, 'about/main'), { story: {} });
  });
});

// Ticket references avoid 0, 1, I and O, so test ids are built from letters that are allowed.
const ticketIds = (n, prefix = 'A') => Array.from({ length: n }, (_, i) => `BAI-${prefix}BCDEFGH${'ABCDEFGHJK'[i]}234`);

/**
 * One checkout: N tickets, their order, the event's sold counter and the buyer's
 * holding, in a single write. Each option breaks exactly one part, for the forgery tests.
 */
const buy = (db, uid, o = {}) => {
  const n = o.n ?? 1;
  const eventId = o.eventId ?? 'e1';
  const held = o.held ?? 0;
  const ids = o.ids ?? ticketIds(n, o.prefix);
  const orderId = o.orderId ?? `${uid}_${eventId}_${held + n}`;
  const b = writeBatch(db);
  if (o.order !== false) {
    b.set(doc(db, 'orders', orderId), {
      buyerId: uid, buyerEmail: `${uid}@example.com`, eventId, eventName: 'Gala', unitPrice: 150,
      quantity: n, ticketIds: ids, createdAt: serverTimestamp(), ...(o.order || {}),
    });
  }
  for (const id of (o.createIds ?? ids)) {
    b.set(doc(db, 'tickets', id), { ...ticketDoc(uid), orderId, eventId, ...(o.ticket || {}) });
  }
  if (o.bump !== 0) b.update(doc(db, 'events', eventId), { ticketsSold: increment(o.bump ?? n) });
  if (o.holding !== false) {
    b.set(doc(db, 'ticket_holdings', `${uid}_${eventId}`), {
      buyerId: uid, eventId, count: held + n, updatedAt: serverTimestamp(), ...(o.holding || {}),
    });
  }
  return b.commit();
};

// ---------- users ----------

test('sign-up creates a plain USER profile only', async () => {
  const db = as('bob');
  const base = { email: 'bob@example.com', displayName: 'Bob', isActive: true, createdAt: serverTimestamp() };
  await assertFails(setDoc(doc(db, 'users/bob'), { ...base, role: 'SUPER_ADMIN' }));
  await assertFails(setDoc(doc(db, 'users/bob'), { ...base, role: 'TICKET_SCANNER' }));
  await assertFails(setDoc(doc(db, 'users/someone-else'), { ...base, role: 'USER' }));
  await assertFails(setDoc(doc(db, 'users/bob'), { ...base, role: 'USER', email: 'ceo@example.com' }));
  await assertSucceeds(setDoc(doc(db, 'users/bob'), { ...base, role: 'USER' }));
});

test('users cannot promote or reactivate themselves', async () => {
  const db = as('alice');
  await assertFails(updateDoc(doc(db, 'users/alice'), { role: 'SUPER_ADMIN' }));
  await assertFails(updateDoc(doc(db, 'users/alice'), { isActive: false }));
  await assertSucceeds(updateDoc(doc(db, 'users/alice'), { displayName: 'Alice M' }));
});

test('profiles are private to their owner and user admins', async () => {
  await assertFails(getDoc(doc(as('bob'), 'users/alice')));
  await assertFails(getDocs(collection(as('alice'), 'users')));
  await assertFails(getDocs(collection(as('pro'), 'users')));
  await assertFails(getDoc(doc(guest(), 'users/alice')));
  await assertSucceeds(getDoc(doc(as('alice'), 'users/alice')));
  await assertSucceeds(getDocs(collection(as('ceo'), 'users')));
});

test('only super admins assign roles, and never to themselves', async () => {
  await assertSucceeds(updateDoc(doc(as('root'), 'users/alice'), { role: 'TICKET_SCANNER' }));
  await assertFails(updateDoc(doc(as('root'), 'users/root'), { role: 'USER' }));
  await assertFails(updateDoc(doc(as('ceo'), 'users/alice'), { role: 'CEO' }));
  await assertFails(updateDoc(doc(as('pro'), 'users/alice'), { role: 'PRO' }));
  await assertFails(updateDoc(doc(as('root'), 'users/alice'), { role: 'WIZARD' }));
});

test('CEO can deactivate staff below super admin, and create non-super users', async () => {
  const db = as('ceo');
  await assertSucceeds(updateDoc(doc(db, 'users/alice'), { isActive: false }));
  await assertFails(updateDoc(doc(db, 'users/root'), { isActive: false }));
  const base = { email: 'n@example.com', displayName: 'New', isActive: true, createdAt: serverTimestamp() };
  await assertSucceeds(setDoc(doc(db, 'users/new1'), { ...base, role: 'PRO' }));
  await assertFails(setDoc(doc(db, 'users/new2'), { ...base, role: 'SUPER_ADMIN' }));
});

test('a deactivated admin has no admin powers', async () => {
  const db = as('exadmin');
  await assertFails(getDocs(collection(db, 'users')));
  await assertFails(updateDoc(doc(db, 'users/alice'), { role: 'CEO' }));
  await assertFails(setDoc(doc(db, 'about/main'), { story: { title: 'hacked' } }));
});

test('only super admins delete profiles', async () => {
  await assertFails(deleteDoc(doc(as('ceo'), 'users/alice')));
  await assertFails(deleteDoc(doc(as('root'), 'users/root')));
  await assertSucceeds(deleteDoc(doc(as('root'), 'users/alice')));
});

// ---------- events ----------

test('events are public to read and staff-only to manage', async () => {
  await assertSucceeds(getDocs(collection(guest(), 'events')));
  await assertFails(setDoc(doc(as('alice'), 'events/mine'), eventDoc()));
  await assertFails(updateDoc(doc(as('alice'), 'events/e1'), { price: 1 }));
  await assertFails(deleteDoc(doc(as('alice'), 'events/e1')));
  await assertFails(setDoc(doc(as('fin'), 'events/x'), eventDoc()));
  await assertSucceeds(setDoc(doc(as('pro'), 'events/x'), eventDoc()));
  await assertFails(setDoc(doc(as('pro'), 'events/y'), eventDoc({ price: -5 })));
  await assertSucceeds(updateDoc(doc(as('pro'), 'events/e1'), { price: 200 }));
});

test('buyers can only move the sold counter up, within capacity', async () => {
  const db = as('alice');
  await assertFails(updateDoc(doc(db, 'events/e1'), { ticketsSold: 3 }));
  await assertFails(updateDoc(doc(db, 'events/e1'), { ticketsSold: -1 }));
  await assertFails(updateDoc(doc(db, 'events/e1'), { ticketsSold: 1, capacity: 999 }));
  await assertFails(updateDoc(doc(db, 'events/closed'), { ticketsSold: 1 }));
  await assertFails(updateDoc(doc(guest(), 'events/e1'), { ticketsSold: 1 }));
});

// ---------- tickets ----------

test('a buyer can purchase a ticket at the real price', async () => {
  await assertSucceeds(buy(as('alice'), 'alice'));
});

test('ticket purchases cannot be forged', async () => {
  const db = as('alice');
  await assertFails(buy(db, 'alice', { order: { unitPrice: 1 }, ticket: { price: 1 } }), 'wrong price');
  await assertFails(buy(db, 'alice', { ticket: { price: 1 } }), 'ticket cheaper than its order');
  await assertFails(buy(db, 'alice', { ticket: { buyerId: 'bob' } }), 'someone else as ticket holder');
  await assertFails(buy(db, 'alice', { order: { buyerId: 'bob' } }), 'someone else as buyer');
  await assertFails(buy(db, 'alice', { ticket: { buyerEmail: 'vip@example.com' } }), 'spoofed email');
  await assertFails(buy(db, 'alice', { ticket: { status: 'SCANNED' } }), 'pre-scanned');
  await assertFails(buy(db, 'alice', { ticket: { quantity: 50 } }), 'bulk quantity on one ticket');
  await assertFails(buy(db, 'alice', { eventId: 'closed' }), 'event not on sale');
  await assertFails(buy(db, 'alice', { eventId: 'nope' }), 'missing event');
  await assertFails(buy(db, 'alice', { ticket: { vip: true } }), 'extra fields');
  await assertFails(buy(db, 'alice', { ids: ['my-own-id'] }), 'non-standard ticket id');
  await assertFails(buy(db, 'alice', { bump: 0 }), 'no sold-counter update');
  await assertFails(buy(db, 'alice', { order: false }), 'no order');
  await assertFails(buy(db, 'alice', { holding: false }), 'no holding update');
  await assertFails(buy(guest(), 'alice'), 'signed out');
});

test('events take a known currency and only https links to an outside seller', async () => {
  const pro = as('pro');
  await assertSucceeds(setDoc(doc(pro, 'events/bw'), eventDoc({ currency: 'BWP' })));
  await assertSucceeds(setDoc(doc(pro, 'events/sz'), eventDoc({ currency: 'SZL', ticketUrl: 'https://www.mojaticket.com/event/gala', ticketProvider: 'MojaTicket' })));
  await assertFails(setDoc(doc(pro, 'events/x1'), eventDoc({ currency: 'BTC' })), 'unknown currency');
  await assertFails(setDoc(doc(pro, 'events/x2'), eventDoc({ ticketUrl: 'javascript:alert(1)' })), 'script link');
  await assertFails(setDoc(doc(pro, 'events/x3'), eventDoc({ ticketUrl: 'http://example.com/tickets' })), 'plain http link');
  await assertFails(setDoc(doc(pro, 'events/x4'), eventDoc({ ticketProvider: 'x'.repeat(61) })), 'provider name too long');
});

test('tickets carry the event currency, and outside-sold events are never issued here', async () => {
  await env.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), 'events/bw'), eventDoc({ currency: 'BWP' }));
    await setDoc(doc(ctx.firestore(), 'events/sz'), eventDoc({ currency: 'SZL', ticketUrl: 'https://www.mojaticket.com/event/gala', ticketProvider: 'MojaTicket' }));
  });
  const db = as('alice');
  await assertFails(buy(db, 'alice', { eventId: 'sz', order: { currency: 'SZL' }, ticket: { currency: 'SZL' } }), 'event sold by MojaTicket');
  await assertFails(buy(db, 'alice', { eventId: 'bw' }), 'pula event recorded as rand');
  await assertFails(buy(db, 'alice', { eventId: 'bw', order: { currency: 'BWP' } }), 'ticket currency differs from order');
  await assertFails(buy(db, 'alice', { order: { currency: 'BWP' }, ticket: { currency: 'BWP' } }), 'rand event recorded as pula');
  await assertSucceeds(buy(db, 'alice', { eventId: 'bw', order: { currency: 'BWP' }, ticket: { currency: 'BWP' } }));
  await assertSucceeds(buy(db, 'alice', { order: { currency: 'ZAR' }, ticket: { currency: 'ZAR' }, prefix: 'C' }));
});

test('a full order of 10 tickets with a currency still goes through in one write', async () => {
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'events/e1'), eventDoc({ capacity: 500, currency: 'ZAR', ticketUrl: '', ticketProvider: '' })));
  await assertSucceeds(buy(as('alice'), 'alice', { n: 10, order: { currency: 'ZAR' }, ticket: { currency: 'ZAR' } }));
});

test('tickets cannot outnumber what the order and the sold counter record', async () => {
  const db = as('alice');
  // Two tickets, but the order and the counter only account for one.
  await assertFails(buy(db, 'alice', { n: 1, createIds: [TICKET, TICKET2], ids: [TICKET] }), 'extra ticket not listed in the order');
  await assertFails(buy(db, 'alice', { n: 2, bump: 1 }), 'counter moved by less than the order');
  await assertFails(buy(db, 'alice', { n: 2, holding: { count: 1 } }), 'holding moved by less than the order');
  await assertFails(buy(db, 'alice', { n: 2, ids: [TICKET, TICKET] }), 'same ticket listed twice');
  await assertFails(buy(db, 'alice', { orderId: 'alice_e1_99' }), 'order id not tied to the holding');

  // A second order in the same write would need the same id as the first.
  const b = writeBatch(db);
  const order = { buyerId: 'alice', buyerEmail: 'alice@example.com', eventId: 'e1', eventName: 'Gala', unitPrice: 150, quantity: 1, createdAt: serverTimestamp() };
  b.set(doc(db, 'orders/alice_e1_1'), { ...order, ticketIds: [TICKET] });
  b.set(doc(db, 'orders/alice_e1_2'), { ...order, ticketIds: [TICKET2] });
  b.set(doc(db, 'tickets', TICKET), { ...ticketDoc('alice'), orderId: 'alice_e1_1' });
  b.set(doc(db, 'tickets', TICKET2), { ...ticketDoc('alice'), orderId: 'alice_e1_2' });
  b.update(doc(db, 'events/e1'), { ticketsSold: increment(1) });
  b.set(doc(db, 'ticket_holdings/alice_e1'), { buyerId: 'alice', eventId: 'e1', count: 1, updatedAt: serverTimestamp() });
  await assertFails(b.commit(), 'two orders for one checkout');

  // A ticket cannot be added to an order after the fact.
  await assertSucceeds(buy(db, 'alice'));
  await assertFails(setDoc(doc(db, 'tickets', 'BAI-LATERADD2345'), { ...ticketDoc('alice'), orderId: 'alice_e1_1' }), 'ticket added to an old order');
  await assertFails(updateDoc(doc(db, 'orders/alice_e1_1'), { quantity: 5 }), 'order edited afterwards');
  await assertFails(updateDoc(doc(db, 'events/e1'), { ticketsSold: increment(1) }), 'counter moved without a checkout');
});

test('an event cannot be oversold', async () => {
  await assertSucceeds(buy(as('alice'), 'alice', { n: 2 }));
  await assertFails(buy(as('bob'), 'bob', { n: 1, prefix: 'B' }));
});

test('a full order of 10 tickets goes through in one write', async () => {
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'events/e1'), eventDoc({ capacity: 500 })));
  await assertSucceeds(buy(as('alice'), 'alice', { n: 10 }));
});

test('one account cannot hold more than 10 tickets for an event', async () => {
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'events/e1'), eventDoc({ capacity: 500 })));
  const db = as('alice');
  await assertSucceeds(buy(db, 'alice', { n: 6 }));
  await assertFails(buy(db, 'alice', { n: 5, held: 6, prefix: 'C' }), '6 + 5 is over the limit');
  await assertFails(buy(db, 'alice', { n: 5, held: 0, prefix: 'D' }), 'pretending to hold none');
  await assertSucceeds(buy(db, 'alice', { n: 4, held: 6, prefix: 'E' }));
  await assertFails(buy(db, 'alice', { n: 1, held: 10, prefix: 'F' }), 'already at the limit');
  // Another account is unaffected, and cannot touch the first one's holding.
  await assertSucceeds(buy(as('bob'), 'bob', { n: 10, prefix: 'G' }));
  await assertFails(setDoc(doc(as('bob'), 'ticket_holdings/alice_e1'), { buyerId: 'alice', eventId: 'e1', count: 0, updatedAt: serverTimestamp() }));
  await assertFails(deleteDoc(doc(db, 'ticket_holdings/alice_e1')), 'resetting own holding');
});

test('orders and holdings are private to the buyer and admins', async () => {
  await assertSucceeds(buy(as('alice'), 'alice'));
  await assertSucceeds(getDoc(doc(as('alice'), 'orders/alice_e1_1')));
  await assertSucceeds(getDoc(doc(as('alice'), 'ticket_holdings/alice_e1')));
  await assertFails(getDoc(doc(as('bob'), 'orders/alice_e1_1')));
  await assertFails(getDoc(doc(as('bob'), 'ticket_holdings/alice_e1')));
  await assertFails(getDocs(collection(as('bob'), 'orders')));
  await assertSucceeds(getDocs(collection(as('fin'), 'orders')));
});

test('handing out roles needs a recent sign-in', async () => {
  const stale = as('root', 'root@example.com', 9 * 3600);
  await assertFails(updateDoc(doc(stale, 'users/alice'), { role: 'CEO' }), 'session older than 8 hours');
  await assertFails(deleteDoc(doc(stale, 'users/alice')));
  await assertFails(updateDoc(doc(as('ceo', 'ceo@example.com', 9 * 3600), 'users/alice'), { isActive: false }));
  await assertSucceeds(updateDoc(doc(as('root'), 'users/alice'), { role: 'CEO' }));
  // An old session can still do everyday work.
  await assertSucceeds(setDoc(doc(as('pro', 'pro@example.com', 9 * 3600), 'content/home'), { data: { a: 1 }, updatedAt: serverTimestamp(), updatedBy: 'pro' }));
});

test('tickets are visible to their buyer and staff only', async () => {
  await assertSucceeds(getDoc(doc(as('alice'), 'tickets/BAI-EXISTING2345')));
  await assertFails(getDoc(doc(as('bob'), 'tickets/BAI-EXISTING2345')));
  await assertFails(getDoc(doc(guest(), 'tickets/BAI-EXISTING2345')));
  await assertSucceeds(getDocs(query(collection(as('alice'), 'tickets'), where('buyerId', '==', 'alice'))));
  await assertFails(getDocs(collection(as('alice'), 'tickets')));
  await assertFails(getDocs(query(collection(as('bob'), 'tickets'), where('buyerId', '==', 'alice'))));
  await assertSucceeds(getDocs(collection(as('fin'), 'tickets')));
  await assertSucceeds(getDoc(doc(as('door'), 'tickets/BAI-EXISTING2345')));
});

test('buyers cannot edit or delete tickets', async () => {
  const db = as('alice');
  await assertFails(updateDoc(doc(db, 'tickets/BAI-EXISTING2345'), { price: 0 }));
  await assertFails(updateDoc(doc(db, 'tickets/BAI-EXISTING2345'), { status: 'VALID', buyerId: 'bob' }));
  await assertFails(deleteDoc(doc(db, 'tickets/BAI-EXISTING2345')));
});

// ---------- scanning ----------

const scan = (db, uid, id = 'BAI-EXISTING2345') => {
  const b = writeBatch(db);
  b.set(doc(db, 'ticket_scanned', id), {
    ticketId: id, eventId: 'e1', buyerEmail: 'alice@example.com',
    scannedAt: serverTimestamp(), scannedBy: uid,
  });
  b.update(doc(db, 'tickets', id), { status: 'SCANNED', scannedAt: serverTimestamp(), scannedBy: uid });
  return b.commit();
};

test('door staff admit a ticket exactly once', async () => {
  await assertSucceeds(scan(as('door'), 'door'));
  await assertFails(scan(as('door'), 'door'));
  await assertFails(scan(as('pro'), 'pro'));
});

test('only door staff can scan, and a scan must update the ticket', async () => {
  await assertFails(scan(as('alice'), 'alice'));
  await assertFails(scan(as('fin'), 'fin'));
  await assertFails(scan(as('door'), 'someone-else'));
  const db = as('door');
  await assertFails(setDoc(doc(db, 'ticket_scanned/BAI-EXISTING2345'), {
    ticketId: 'BAI-EXISTING2345', eventId: 'e1', buyerEmail: 'a', scannedAt: serverTimestamp(), scannedBy: 'door',
  }));
  await assertFails(updateDoc(doc(db, 'tickets/BAI-EXISTING2345'), {
    status: 'SCANNED', scannedAt: serverTimestamp(), scannedBy: 'door',
  }));
});

test('scan history is staff-only', async () => {
  await assertFails(getDocs(collection(as('alice'), 'ticket_scanned')));
  await assertSucceeds(getDocs(collection(as('fin'), 'ticket_scanned')));
});

// ---------- content, carts, everything else ----------

const section = (uid, extra = {}) => ({ data: { quote: 'x' }, updatedAt: serverTimestamp(), updatedBy: uid, ...extra });

test('site content is public to read', async () => {
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'content/home'), { data: { a: 1 } }));
  await assertSucceeds(getDoc(doc(guest(), 'content/home')));
  await assertSucceeds(getDocs(collection(guest(), 'content')));
  await assertSucceeds(getDoc(doc(guest(), 'about/main')));
});

test('only content editors can change site content', async () => {
  for (const uid of ['root', 'ceo', 'pro']) {
    await assertSucceeds(setDoc(doc(as(uid), 'content/traditions'), section(uid)));
  }
  for (const uid of ['alice', 'door', 'fin', 'exadmin']) {
    await assertFails(setDoc(doc(as(uid), 'content/traditions'), section(uid)));
  }
  await assertFails(setDoc(doc(guest(), 'content/traditions'), section('root')));
  await assertFails(deleteDoc(doc(as('pro'), 'content/traditions')));
  await assertFails(deleteDoc(doc(as('alice'), 'content/traditions')));
});

test('content saves must be well-formed and signed by the person saving', async () => {
  const db = as('pro');
  await assertFails(setDoc(doc(db, 'content/traditions'), section('root')), 'someone else as author');
  await assertFails(setDoc(doc(db, 'content/traditions'), section('pro', { updatedAt: Timestamp.fromMillis(0) })), 'back-dated');
  await assertFails(setDoc(doc(db, 'content/traditions'), section('pro', { role: 'SUPER_ADMIN' })), 'extra fields');
  await assertFails(setDoc(doc(db, 'content/traditions'), section('pro', { data: 'text' })), 'data is not a map');
  await assertFails(setDoc(doc(db, 'content/anything-else'), section('pro')), 'unknown section');
});

test('the earlier About and Our Work documents are read-only', async () => {
  await assertFails(setDoc(doc(as('root'), 'about/main'), { story: {} }));
  await assertFails(setDoc(doc(as('pro'), 'work/main'), { hero: {} }));
});

test('carts are private', async () => {
  const cart = { userId: 'alice', items: [], total: 0, updatedAt: serverTimestamp() };
  await assertSucceeds(setDoc(doc(as('alice'), 'cart/alice'), cart));
  await assertFails(setDoc(doc(as('bob'), 'cart/alice'), cart));
  await assertFails(getDoc(doc(as('bob'), 'cart/alice')));
  await assertFails(setDoc(doc(as('alice'), 'cart/alice'), { ...cart, userId: 'bob' }));
});

test('unknown collections are closed', async () => {
  await assertFails(getDoc(doc(as('root'), 'sessions/s1')));
  await assertFails(setDoc(doc(as('alice'), 'anything/x'), { a: 1 }));
});

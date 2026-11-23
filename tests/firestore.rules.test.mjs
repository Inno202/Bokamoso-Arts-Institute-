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
  doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, collection, query, where,
  writeBatch, serverTimestamp, Timestamp, increment,
} from 'firebase/firestore';

setLogLevel('silent');
let env;
const TICKET = 'BAI-ABCDEFGH2345';
const TICKET2 = 'BAI-ZZZZZZZZ9999';

const nowSeconds = () => Math.floor(Date.now() / 1000);
const as = (uid, email = `${uid}@example.com`, signedInSecondsAgo = 60, emailVerified = true) =>
  env.authenticatedContext(uid, { email, auth_time: nowSeconds() - signedInSecondsAgo, email_verified: emailVerified }).firestore();
const guest = () => env.unauthenticatedContext().firestore();

const profile = (role, extra = {}) => ({
  email: 'x@example.com', displayName: 'X', role, isActive: true, createdAt: Timestamp.now(), ...extra,
});
const eventDoc = (extra = {}) => ({
  name: 'Gala', venue: 'Hall', city: 'Pretoria', date: Timestamp.now(), price: 150,
  capacity: 2, ticketsSold: 0, status: 'On Sale', description: '',
  bannerImageUrl: 'https://res.cloudinary.com/demo/image/upload/banner.jpg', ticketImageUrl: 'https://res.cloudinary.com/demo/image/upload/ticket.jpg', ...extra,
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
  if (o.bump !== 0) {
    b.update(doc(db, 'events', eventId), {
      ticketsSold: increment(o.bump ?? n),
      ...(o.typeSold ? { [`typeSold.${o.typeSold.key}`]: increment(o.typeSold.by ?? n) } : {}),
    });
  }
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

test('only super admins delete other people\'s profiles', async () => {
  await assertFails(deleteDoc(doc(as('ceo'), 'users/alice')));
  await assertFails(deleteDoc(doc(as('root'), 'users/root')));
  await assertSucceeds(deleteDoc(doc(as('root'), 'users/alice')));
});

test('people can delete their own account, staff cannot delete themselves', async () => {
  await assertFails(deleteDoc(doc(as('bob'), 'users/alice')), 'someone else');
  await assertFails(deleteDoc(doc(as('alice', 'alice@example.com', 9 * 3600), 'users/alice')), 'sign-in older than 8 hours');
  await assertFails(deleteDoc(doc(as('pro'), 'users/pro')), 'staff account');
  await assertSucceeds(deleteDoc(doc(as('alice'), 'users/alice')));
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

test('new events need both pictures; older events without them can still be edited', async () => {
  const pro = as('pro');
  await assertFails(setDoc(doc(pro, 'events/nopic1'), eventDoc({ bannerImageUrl: '' })), 'no banner');
  const { ticketImageUrl: _omit, ...noArtwork } = eventDoc();
  await assertFails(setDoc(doc(pro, 'events/nopic2'), noArtwork), 'no ticket artwork');
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'events/old'), { ...eventDoc(), bannerImageUrl: '', ticketImageUrl: '' }));
  await assertSucceeds(updateDoc(doc(pro, 'events/old'), { status: 'Cancelled' }));
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

test('booking does not need a confirmed email while the site sends no emails', async () => {
  await assertSucceeds(buy(as('alice', 'alice@example.com', 60, false), 'alice'));
});

test('an unconfirmed account still cannot book in someone else\'s name', async () => {
  await assertFails(buy(as('mallory', 'mallory@example.com', 60, false), 'alice'));
});

test('a show that is over cannot be booked', async () => {
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'events/e1'), eventDoc({ date: Timestamp.fromMillis(Date.now() - 13 * 3600e3) })));
  await assertFails(buy(as('alice'), 'alice'), 'started 13 hours ago');
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'events/e1'), eventDoc({ date: Timestamp.fromMillis(Date.now() + 24 * 3600e3) })));
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

// ---------- ticket types ----------

const typedEvent = (extra = {}) => eventDoc({
  price: 100, capacity: 30,
  ticketTypes: { t1: { name: 'General Admission', price: 100, capacity: 20 }, t2: { name: 'VIP', price: 350, capacity: 10 } },
  typeSold: { t1: 0, t2: 0 }, ...extra,
});
const vip = (o = {}) => ({
  ...o,
  order: { unitPrice: 350, ticketTypeId: 't2', ticketTypeName: 'VIP', ...(o.order || {}) },
  ticket: { price: 350, ticketType: 'VIP', ...(o.ticket || {}) },
  typeSold: o.typeSold ?? { key: 't2' },
});

test('a ticket type is bought at its own price, name and seat count', async () => {
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'events/e1'), typedEvent()));
  const db = as('alice');
  await assertFails(buy(db, 'alice', vip({ order: { unitPrice: 100 }, ticket: { price: 100 } })), 'VIP at the general price');
  await assertFails(buy(db, 'alice', vip({ order: { ticketTypeName: 'Gold' }, ticket: { ticketType: 'Gold' } })), 'renamed type');
  await assertFails(buy(db, 'alice', vip({ order: { ticketTypeId: 't5' } })), 'type that does not exist');
  await assertFails(buy(db, 'alice', vip({ typeSold: { key: 't1' } })), 'moves the general counter instead');
  await assertFails(buy(db, 'alice', vip({ ticket: { ticketType: 'General Admission' } })), 'ticket names a different type');
  await assertFails(buy(db, 'alice', { order: { unitPrice: 100 }, ticket: { price: 100 } }), 'no type on a typed event');
  await assertSucceeds(buy(db, 'alice', vip()));
});

test('a ticket type cannot be oversold', async () => {
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'events/e1'), typedEvent({ typeSold: { t1: 0, t2: 9 }, ticketsSold: 9 })));
  await assertFails(buy(as('alice'), 'alice', vip({ n: 2 })), 'only one VIP seat left');
  await assertSucceeds(buy(as('alice'), 'alice', vip({ n: 1 })));
});

test('event managers can set ticket types, within limits', async () => {
  const pro = as('pro');
  await assertSucceeds(setDoc(doc(pro, 'events/typed'), typedEvent()));
  await assertFails(setDoc(doc(pro, 'events/bad1'), typedEvent({ ticketTypes: { t7: { name: 'X', price: 1, capacity: 1 } } })), 'unknown key');
  await assertFails(setDoc(doc(pro, 'events/bad2'), typedEvent({ ticketTypes: { t1: { name: '', price: 1, capacity: 1 } } })), 'empty name');
  await assertFails(setDoc(doc(pro, 'events/bad3'), typedEvent({ ticketTypes: { t1: { name: 'A', price: -1, capacity: 1 } } })), 'negative price');
  await assertFails(setDoc(doc(pro, 'events/bad4'), typedEvent({ ticketTypes: { t1: { name: 'A', price: 1, capacity: 0 } } })), 'no seats');
  await assertFails(setDoc(doc(pro, 'events/bad5'), typedEvent({ ticketTypes: { t1: { name: 'A', price: 1, capacity: 1, secret: true } } })), 'extra field');
});

test('a full order of 10 VIP tickets still goes through in one write', async () => {
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'events/e1'), typedEvent({ ticketTypes: { t1: { name: 'General Admission', price: 100, capacity: 20 }, t2: { name: 'VIP', price: 350, capacity: 50 } }, capacity: 70 })));
  await assertSucceeds(buy(as('alice'), 'alice', vip({ n: 10, order: { currency: 'ZAR' }, ticket: { currency: 'ZAR' } })));
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
  await assertSucceeds(setDoc(doc(as('ceo', 'ceo@example.com', 9 * 3600), 'content/home'), { data: { a: 1 }, updatedAt: serverTimestamp(), updatedBy: 'ceo' }));
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

test('tickets for an event that has passed cannot be admitted', async () => {
  const hoursAgo = (h) => Timestamp.fromMillis(Date.now() - h * 3600e3);
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'events/e1'), eventDoc({ date: hoursAgo(13) })));
  await assertFails(scan(as('door'), 'door'), 'event started 13 hours ago');
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'events/e1'), eventDoc({ date: hoursAgo(3) })));
  await assertSucceeds(scan(as('door'), 'door'), 'event started 3 hours ago is still running');
});

test('tickets for a cancelled event cannot be admitted', async () => {
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'events/e1'), eventDoc({ status: 'Cancelled' })));
  await assertFails(scan(as('door'), 'door'));
});

test('event managers can cancel and restore an unused ticket; buyers cannot', async () => {
  const cancel = (uid, status = 'CANCELLED') => updateDoc(doc(as(uid), 'tickets/BAI-EXISTING2345'), { status, updatedAt: serverTimestamp() });
  await assertFails(cancel('alice'), 'the buyer');
  await assertFails(cancel('fin'), 'finance');
  await assertFails(cancel('door'), 'door staff');
  await assertSucceeds(cancel('pro'));
  await assertFails(scan(as('door'), 'door'), 'a cancelled ticket does not scan');
  await assertSucceeds(cancel('ceo', 'VALID'));
  await assertSucceeds(scan(as('door'), 'door'));
  await assertFails(cancel('root'), 'a used ticket cannot be cancelled');
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
  for (const uid of ['root', 'ceo']) {
    await assertSucceeds(setDoc(doc(as(uid), 'content/traditions'), section(uid)));
  }
  // PRO staff need an approved request first (see the access request tests).
  for (const uid of ['pro', 'alice', 'door', 'fin', 'exadmin']) {
    await assertFails(setDoc(doc(as(uid), 'content/traditions'), section(uid)));
  }
  await assertFails(setDoc(doc(guest(), 'content/traditions'), section('root')));
  await assertFails(deleteDoc(doc(as('pro'), 'content/traditions')));
  await assertFails(deleteDoc(doc(as('alice'), 'content/traditions')));
});

test('content saves must be well-formed and signed by the person saving', async () => {
  const db = as('ceo');
  await assertFails(setDoc(doc(db, 'content/traditions'), section('root')), 'someone else as author');
  await assertFails(setDoc(doc(db, 'content/traditions'), section('ceo', { updatedAt: Timestamp.fromMillis(0) })), 'back-dated');
  await assertFails(setDoc(doc(db, 'content/traditions'), section('ceo', { role: 'SUPER_ADMIN' })), 'extra fields');
  await assertFails(setDoc(doc(db, 'content/traditions'), section('ceo', { data: 'text' })), 'data is not a map');
  await assertFails(setDoc(doc(db, 'content/anything-else'), section('ceo')), 'unknown section');
});

// ---------- staff activity log ----------

const entry = (uid, extra = {}) => ({
  at: serverTimestamp(), actorId: uid, actorName: 'Staff', actorRole: 'PRO', action: 'event.updated', area: 'events',
  summary: 'Edited the event "Gala".', targetId: 'e1', ...extra,
});

test('staff write activity entries only in their own name and role', async () => {
  await assertSucceeds(addDoc(collection(as('pro'), 'activity_log'), entry('pro')));
  await assertFails(addDoc(collection(as('pro'), 'activity_log'), entry('ceo')), 'in someone else\'s name');
  await assertFails(addDoc(collection(as('pro'), 'activity_log'), entry('pro', { actorRole: 'SUPER_ADMIN' })), 'claiming a higher role');
  await assertFails(addDoc(collection(as('pro'), 'activity_log'), entry('pro', { at: Timestamp.fromMillis(0) })), 'back-dated');
  await assertFails(addDoc(collection(as('pro'), 'activity_log'), entry('pro', { action: 'made.up' })), 'unknown action');
  await assertFails(addDoc(collection(as('alice'), 'activity_log'), entry('alice', { actorRole: 'USER' })), 'not staff');
});

test('only super admins read the activity log, and nobody edits or deletes it', async () => {
  let id;
  await env.withSecurityRulesDisabled(async ctx => { id = (await addDoc(collection(ctx.firestore(), 'activity_log'), { ...entry('pro'), at: Timestamp.now() })).id; });
  await assertSucceeds(getDocs(collection(as('root'), 'activity_log')));
  await assertFails(getDocs(collection(as('ceo'), 'activity_log')));
  await assertFails(getDocs(collection(as('pro'), 'activity_log')));
  await assertFails(updateDoc(doc(as('root'), 'activity_log', id), { summary: 'changed' }));
  await assertFails(deleteDoc(doc(as('root'), 'activity_log', id)));
});

// ---------- passing a ticket to a friend ----------

const future = () => Timestamp.fromMillis(Date.now() + 7 * 24 * 3600e3);
const friend = (verified = true) => env.authenticatedContext('bob', { email: 'Bob@Example.com', auth_time: nowSeconds() - 60, email_verified: verified }).firestore();
const T = 'tickets/BAI-EXISTING2345';

test('a holder offers an unused ticket to a friend\'s email, and can take it back', async () => {
  await env.withSecurityRulesDisabled(ctx => updateDoc(doc(ctx.firestore(), 'events/e1'), { date: future() }));
  await assertSucceeds(updateDoc(doc(as('alice'), T), { transferTo: 'bob@example.com', transferAt: serverTimestamp() }));
  await assertSucceeds(updateDoc(doc(as('alice'), T), { transferTo: '', transferAt: serverTimestamp() }));
  await assertFails(updateDoc(doc(as('alice'), T), { transferTo: 'alice@example.com', transferAt: serverTimestamp() }), 'to themselves');
  await assertFails(updateDoc(doc(as('alice'), T), { transferTo: 'Bob@Example.com', transferAt: serverTimestamp() }), 'not lower case');
  await assertFails(updateDoc(doc(as('alice'), T), { transferTo: 'not-an-email', transferAt: serverTimestamp() }), 'not an email');
  await assertFails(updateDoc(doc(as('mallory'), T), { transferTo: 'mallory@example.com', transferAt: serverTimestamp() }), 'not the holder');
  await assertFails(updateDoc(doc(as('alice'), T), { transferTo: 'bob@example.com', transferAt: serverTimestamp(), price: 0 }), 'changing anything else');
});

test('no transfers once the event has started, or for a used ticket', async () => {
  await assertFails(updateDoc(doc(as('alice'), T), { transferTo: 'bob@example.com', transferAt: serverTimestamp() }), 'event started');
  await env.withSecurityRulesDisabled(ctx => Promise.all([
    updateDoc(doc(ctx.firestore(), 'events/e1'), { date: future() }),
    updateDoc(doc(ctx.firestore(), T), { status: 'SCANNED' }),
  ]));
  await assertFails(updateDoc(doc(as('alice'), T), { transferTo: 'bob@example.com', transferAt: serverTimestamp() }), 'already used');
});

test('only the friend, with a confirmed email, can see and accept the ticket', async () => {
  await env.withSecurityRulesDisabled(ctx => updateDoc(doc(ctx.firestore(), T), { transferTo: 'bob@example.com' }));
  const accept = (db, uid = 'bob', email = 'Bob@Example.com', extra = {}) =>
    updateDoc(doc(db, T), { buyerId: uid, buyerEmail: email, transferTo: '', transferredFrom: 'alice', transferAt: serverTimestamp(), ...extra });
  await assertSucceeds(getDoc(doc(friend(), T)));
  await assertSucceeds(getDocs(query(collection(friend(), 'tickets'), where('transferTo', '==', 'bob@example.com'))));
  await assertFails(getDoc(doc(as('mallory'), T)), 'a stranger cannot read it');
  await assertFails(accept(friend(false)), 'email not confirmed');
  await assertFails(accept(as('mallory'), 'mallory', 'mallory@example.com'), 'a stranger cannot accept');
  await assertFails(accept(friend(), 'alice'), 'must become the friend\'s');
  await assertFails(accept(friend(), 'bob', 'Bob@Example.com', { status: 'VALID', price: 0 }), 'changing the price');
  await assertSucceeds(accept(friend()));
  await assertFails(getDoc(doc(as('alice'), T)), 'the old holder no longer sees it');
  await assertSucceeds(getDoc(doc(friend(), T)));
});

// ---------- waiting lists ----------

const waiting = (uid, extra = {}) => ({ eventId: 'e1', uid, email: `${uid}@example.com`, name: 'Alice', createdAt: serverTimestamp(), ...extra });

test('people join and leave a waiting list only for themselves; staff see the list', async () => {
  await assertSucceeds(getDoc(doc(as('alice'), 'waitlist/e1_alice')));
  await assertSucceeds(setDoc(doc(as('alice'), 'waitlist/e1_alice'), waiting('alice')));
  await assertFails(setDoc(doc(as('alice'), 'waitlist/e1_bob'), waiting('bob')), 'for someone else');
  await assertFails(setDoc(doc(as('alice'), 'waitlist/e1_alice'), waiting('alice', { email: 'other@example.com' })), 'with another email');
  await assertFails(setDoc(doc(as('alice'), 'waitlist/nope_alice'), waiting('alice', { eventId: 'nope' })), 'event that does not exist');
  await assertFails(getDoc(doc(as('mallory'), 'waitlist/e1_alice')), 'others cannot read it');
  await assertFails(getDocs(collection(as('alice'), 'waitlist')), 'people cannot list everyone');
  await assertSucceeds(getDocs(query(collection(as('pro'), 'waitlist'), where('eventId', '==', 'e1'))));
  await assertSucceeds(deleteDoc(doc(as('alice'), 'waitlist/e1_alice')));
});

// ---------- site error log ----------

const problem = (uid = '', extra = {}) => ({
  at: serverTimestamp(), kind: 'signin', code: 'auth/internal-error', message: 'Something failed', page: '/login',
  browser: 'Chrome on Android', release: 'abc1234', uid, ...extra,
});

test('anyone can report a small problem, only in their own name or none', async () => {
  await assertSucceeds(addDoc(collection(guest(), 'error_log'), problem()));
  await assertSucceeds(addDoc(collection(as('alice'), 'error_log'), problem('alice')));
  await assertFails(addDoc(collection(guest(), 'error_log'), problem('alice')), 'a visitor naming an account');
  await assertFails(addDoc(collection(as('alice'), 'error_log'), problem('bob')), 'in someone else\'s name');
  await assertFails(addDoc(collection(guest(), 'error_log'), problem('', { kind: 'made-up' })), 'unknown kind');
  await assertFails(addDoc(collection(guest(), 'error_log'), problem('', { message: 'x'.repeat(301) })), 'too long');
  await assertFails(addDoc(collection(guest(), 'error_log'), problem('', { at: Timestamp.fromMillis(0) })), 'back-dated');
  await assertFails(addDoc(collection(guest(), 'error_log'), problem('', { email: 'a@b.c' })), 'extra fields');
});

test('only super admins read the error log, and nobody edits or deletes it', async () => {
  let id;
  await env.withSecurityRulesDisabled(async ctx => { id = (await addDoc(collection(ctx.firestore(), 'error_log'), { ...problem(), at: Timestamp.now() })).id; });
  await assertSucceeds(getDocs(collection(as('root'), 'error_log')));
  await assertFails(getDocs(collection(as('ceo'), 'error_log')));
  await assertFails(getDocs(collection(guest(), 'error_log')));
  await assertFails(updateDoc(doc(as('root'), 'error_log', id), { message: 'changed' }));
  await assertFails(deleteDoc(doc(as('root'), 'error_log', id)));
});

// ---------- site content access requests ----------

const accessRequest = (uid, extra = {}) => ({
  uid, name: 'Pro Officer', email: `${uid}@example.com`, note: 'Update the Traditions page', status: 'PENDING', requestedAt: serverTimestamp(), ...extra,
});
const decide = (uid, status, extra = {}) => ({ status, decidedBy: uid, decidedAt: serverTimestamp(), ...extra });
const inHours = (h) => Timestamp.fromMillis(Date.now() + h * 3600e3);

test('a PRO can ask for content access, but cannot approve it', async () => {
  const pro = as('pro');
  await assertFails(setDoc(doc(pro, 'content_access/pro'), accessRequest('pro', { status: 'APPROVED', expiresAt: inHours(24) })), 'self-approved request');
  await assertFails(setDoc(doc(pro, 'content_access/pro'), accessRequest('pro', { email: 'ceo@example.com' })), 'someone else\'s email');
  await assertFails(setDoc(doc(pro, 'content_access/pro'), accessRequest('pro', { note: 'x'.repeat(301) })), 'note too long');
  await assertFails(setDoc(doc(as('alice'), 'content_access/alice'), accessRequest('alice')), 'not PRO staff');
  await assertFails(setDoc(doc(pro, 'content_access/door'), accessRequest('door')), 'on someone else\'s behalf');
  await assertSucceeds(setDoc(doc(pro, 'content_access/pro'), accessRequest('pro')));
  await assertFails(updateDoc(doc(pro, 'content_access/pro'), decide('pro', 'APPROVED', { expiresAt: inHours(24) })), 'approving their own request');
  await assertFails(setDoc(doc(pro, 'content_access/pro'), accessRequest('pro')), 'asking again while one is waiting');
  await assertFails(setDoc(doc(pro, 'content/traditions'), section('pro')), 'still waiting: cannot edit');
});

test('requests are visible to their owner and to user admins only', async () => {
  await assertSucceeds(setDoc(doc(as('pro'), 'content_access/pro'), accessRequest('pro')));
  await assertSucceeds(getDoc(doc(as('pro'), 'content_access/pro')));
  await assertSucceeds(getDocs(collection(as('ceo'), 'content_access')));
  await assertSucceeds(getDocs(collection(as('root'), 'content_access')));
  await assertFails(getDocs(collection(as('pro'), 'content_access')));
  await assertFails(getDoc(doc(as('fin'), 'content_access/pro')));
  await assertFails(getDoc(doc(as('alice'), 'content_access/pro')));
});

test('once the CEO approves, the PRO can edit until it expires or is ended', async () => {
  await assertSucceeds(setDoc(doc(as('pro'), 'content_access/pro'), accessRequest('pro')));
  const ceo = as('ceo');
  await assertFails(updateDoc(doc(ceo, 'content_access/pro'), decide('ceo', 'APPROVED', { expiresAt: inHours(24 * 8) })), 'longer than 7 days');
  await assertFails(updateDoc(doc(ceo, 'content_access/pro'), decide('root', 'APPROVED', { expiresAt: inHours(24) })), 'signed as someone else');
  await assertFails(updateDoc(doc(as('fin'), 'content_access/pro'), decide('fin', 'APPROVED', { expiresAt: inHours(24) })), 'finance cannot approve');
  await assertSucceeds(updateDoc(doc(ceo, 'content_access/pro'), decide('ceo', 'APPROVED', { expiresAt: inHours(24) })));
  await assertSucceeds(setDoc(doc(as('pro'), 'content/traditions'), section('pro')));
  // Ending it early takes effect at once.
  await assertFails(updateDoc(doc(ceo, 'content_access/pro'), decide('ceo', 'ENDED', { expiresAt: inHours(1) })), 'ended in the future');
  await assertSucceeds(updateDoc(doc(ceo, 'content_access/pro'), decide('ceo', 'ENDED', { expiresAt: serverTimestamp() })));
  await assertFails(setDoc(doc(as('pro'), 'content/traditions'), section('pro')), 'ended: cannot edit');
});

test('expired or declined access does not let a PRO edit', async () => {
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'content_access/pro'),
    { ...accessRequest('pro', { requestedAt: Timestamp.now() }), status: 'APPROVED', decidedBy: 'ceo', decidedAt: Timestamp.now(), expiresAt: Timestamp.fromMillis(Date.now() - 1000) }));
  await assertFails(setDoc(doc(as('pro'), 'content/traditions'), section('pro')), 'expired');
  await assertSucceeds(setDoc(doc(as('pro'), 'content_access/pro'), accessRequest('pro')), 'can ask again after expiry');
  await assertSucceeds(updateDoc(doc(as('root'), 'content_access/pro'), decide('root', 'DECLINED')));
  await assertFails(setDoc(doc(as('pro'), 'content/traditions'), section('pro')), 'declined');
  await assertFails(updateDoc(doc(as('root'), 'content_access/pro'), decide('root', 'APPROVED', { expiresAt: inHours(1) })), 'a declined request cannot be approved later; ask again');
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

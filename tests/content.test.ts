import { describe, expect, it } from 'vitest';
import { isSafeUrl, isSafeImage, isEmail, isPhone, resolve, validate, clean, blankItem, type Field } from '../src/content/fields';
import { SECTIONS, SECTION_KEYS, pickSource, resolveSection, isSectionKey } from '../src/content/sections';
import { validateEvent, type EventForm } from '../src/content/eventValidation';

describe('safe links and images', () => {
  it('accepts only full https links', () => {
    expect(isSafeUrl('https://www.instagram.com/bokamoso')).toBe(true);
    for (const bad of [
      'http://example.com', 'javascript:alert(1)', 'data:text/html,<script>', '//evil.com', '/relative',
      'https://user:pass@example.com', 'https://', 'ftp://example.com', 'https://exa mple.com', '', null, 42,
    ]) expect(isSafeUrl(bad), String(bad)).toBe(false);
  });

  it('accepts site files, https links and uploaded pictures as images', () => {
    expect(isSafeImage('assets/hero.jpg')).toBe(true);
    expect(isSafeImage('https://res.cloudinary.com/x/image/upload/a.jpg')).toBe(true);
    expect(isSafeImage('data:image/jpeg;base64,AAAA')).toBe(true);
    for (const bad of [
      'data:image/svg+xml;base64,AAAA', 'data:text/html;base64,AAAA', 'assets/../secret.jpg',
      'javascript:alert(1)', 'http://example.com/a.jpg', 'assets/script.js', '',
    ]) expect(isSafeImage(bad), bad).toBe(false);
  });

  it('checks email addresses and phone numbers', () => {
    expect(isEmail('info@bokamosoarts.org')).toBe(true);
    expect(isEmail('not-an-email')).toBe(false);
    expect(isEmail('a@b')).toBe(false);
    expect(isPhone('+27 12 702 4455')).toBe(true);
    expect(isPhone('call me')).toBe(false);
  });
});

// A price list, to exercise number fields the way any priced content would use them.
const priceList: Field[] = [
  { kind: 'text', key: 'quote', label: 'Quote', max: 240 },
  { kind: 'list', key: 'tiers', label: 'Prices', itemLabel: 'Price', titleKey: 'title', min: 1, max: 6, fields: [
    { kind: 'text', key: 'title', label: 'Name', max: 40, required: true },
    { kind: 'number', key: 'amount', label: 'Amount in rand', min: 1, max: 1000000, integer: true },
    { kind: 'text', key: 'perk', label: 'What it pays for', max: 160, required: true },
  ] },
  { kind: 'number', key: 'minimumAmount', label: 'Smallest amount', min: 1, max: 100000, integer: true },
];
const priceDefaults = { quote: '', tiers: [{ title: 'Standard', amount: 50, perk: 'Entry.' }], minimumAmount: 10 };

describe('loading content', () => {
  it('shows the built-in defaults when the store is empty or unreachable', () => {
    for (const key of SECTION_KEYS) {
      expect(resolveSection(key, undefined)).toEqual(SECTIONS[key].defaults);
      expect(resolveSection(key, null)).toEqual(SECTIONS[key].defaults);
      expect(resolveSection(key, 'garbage')).toEqual(SECTIONS[key].defaults);
    }
  });

  it('every built-in default passes its own validation', () => {
    for (const key of SECTION_KEYS) {
      expect(validate(SECTIONS[key].fields, SECTIONS[key].defaults), key).toEqual({});
    }
  });

  it('uses stored values and falls back field by field', () => {
    const site = resolveSection('site', { contact: { phone: '+27 11 000 0000', email: 'not an email' } });
    expect(site.contact.phone).toBe('+27 11 000 0000');
    expect(site.contact.email).toBe(SECTIONS.site.defaults.contact.email);
    expect(site.contact.address).toBe(SECTIONS.site.defaults.contact.address);
    expect(site.partners).toEqual(SECTIONS.site.defaults.partners);
  });

  it('never lets an unsafe link or image through to a page', () => {
    const site = resolveSection('site', {
      socials: [
        { network: 'facebook', url: 'javascript:alert(document.cookie)' },
        { network: 'instagram', url: 'https://instagram.com/ok' },
        { network: 'myspace', url: 'https://myspace.com/x' },
      ],
    });
    expect(site.socials).toEqual([{ network: 'instagram', url: 'https://instagram.com/ok' }]);

    const home = resolveSection('home', { hero: { images: ['javascript:alert(1)', 'assets/photos/a.jpg'] }, community: { images: ['assets/a.jpg', 'http://x/y.jpg', 7] } });
    expect(home.hero.images).toEqual(['assets/photos/a.jpg']);
    expect(home.community.images).toEqual(['assets/a.jpg']);
  });

  it('drops malformed list items and wrong types instead of crashing', () => {
    const prices = resolve(priceList, {
      tiers: [
        { title: 'Friend', amount: 100, perk: 'Sheet music for a term.' },
        { title: 'No amount', amount: '', perk: 'x' },
        { title: 'Negative', amount: -5, perk: 'x' },
        'not an object',
        null,
      ],
      minimumAmount: 'ten',
    }, priceDefaults) as any;
    expect(prices.tiers).toEqual([{ title: 'Friend', amount: 100, perk: 'Sheet music for a term.' }]);
    expect(prices.minimumAmount).toBe(10);
  });

  it('falls back to the default list when too few valid items remain', () => {
    const list = resolve(priceList, { tiers: [{ title: '', amount: 0, perk: '' }] }, priceDefaults);
    expect(list.tiers).toEqual(priceDefaults.tiers);
  });

  it('allows a list to be emptied on purpose', () => {
    expect(resolveSection('site', { partners: [] }).partners).toEqual([]);
  });

  it('ignores fields it does not know and caps over-long text', () => {
    const about = resolveSection('about', { valuesHeading: 'x'.repeat(500), badge: 'retired field', injected: '<script>', story: { title: 'Hello', evil: true } });
    expect(about.valuesHeading).toHaveLength(60);
    expect(about).not.toHaveProperty('badge');
    expect(about.story.title).toBe('Hello');
    expect(about).not.toHaveProperty('injected');
    expect(about.story).not.toHaveProperty('evil');
  });

  it('reads the About and Our Work content saved before the content store existed', () => {
    const legacy = {
      story: { title: 'Our Story', description: 'Real story.', stats: [{ value: '3', label: 'Tours' }] },
      values: [{ title: 'Ubuntu', desc: 'Together.' }],
      management: [{ role: 'CEO', name: 'Nceba Mdaka', desc: 'Leads.', image: 'https://res.cloudinary.com/x/a.jpg' }],
      choirPictures: ['https://res.cloudinary.com/x/b.jpg'],
      updatedAt: '2026-05-07',
    };
    const about = resolveSection('about', legacy);
    expect(about.management[0].name).toBe('Nceba Mdaka');
    expect(about.story.stats).toEqual([{ value: '3', label: 'Tours' }]);
    expect(about.heroImage).toBe(SECTIONS.about.defaults.heroImage);

    const work = resolveSection('work', {
      pillars: [{ title: 'Choral', desc: 'Sing.', type: 'choral' }],
      projects: [{ id: 1, title: 'Gala', file: 'gala.jpg', imageUrl: 'https://res.cloudinary.com/x/g.jpg' }, { id: 2, title: 'Visit', file: '' }],
    });
    expect(work.pillars).toEqual([{ title: 'Choral', desc: 'Sing.' }]);
    expect(work.projects).toEqual([{ title: 'Gala', imageUrl: 'https://res.cloudinary.com/x/g.jpg' }, { title: 'Visit', imageUrl: '' }]);
  });

  it('prefers the content store, then earlier content, then defaults', () => {
    expect(pickSource({ a: 1 }, { b: 2 })).toEqual({ source: 'store', raw: { a: 1 } });
    expect(pickSource(undefined, { b: 2 })).toEqual({ source: 'legacy', raw: { b: 2 } });
    expect(pickSource({}, undefined).source).toBe('defaults');
    expect(pickSource(null, null).source).toBe('defaults');
    expect(pickSource('text', []).source).toBe('defaults');
  });

  it('recognises section names', () => {
    expect(isSectionKey('home')).toBe(true);
    expect(isSectionKey('users')).toBe(false);
    expect(isSectionKey(undefined)).toBe(false);
  });
});

describe('validating what staff type', () => {
  const tierFields = priceList;

  it('rejects empty and out-of-range prices', () => {
    const draft = { quote: '', minimumAmount: 10, tiers: [
      { title: 'A', amount: '', perk: 'p' },
      { title: 'B', amount: 0, perk: 'p' },
      { title: 'C', amount: 12.5, perk: 'p' },
      { title: 'D', amount: 100, perk: 'p' },
    ] };
    const errors = validate(tierFields, draft);
    expect(errors['tiers.0.amount']).toMatch(/number/);
    expect(errors['tiers.1.amount']).toMatch(/between/);
    expect(errors['tiers.2.amount']).toMatch(/whole number/);
    expect(errors['tiers.3.amount']).toBeUndefined();
  });

  it('requires required text and enforces lengths', () => {
    const errors = validate(tierFields, { quote: 'q'.repeat(241), minimumAmount: 10, tiers: [{ title: '  ', amount: 5, perk: 'x'.repeat(161) }] });
    expect(errors.quote).toMatch(/240 characters/);
    expect(errors['tiers.0.title']).toBeDefined();
    expect(errors['tiers.0.perk']).toMatch(/160/);
  });

  it('enforces list sizes', () => {
    expect(validate(tierFields, { quote: '', minimumAmount: 10, tiers: [] }).tiers).toMatch(/at least 1/);
    const many = Array.from({ length: 7 }, () => ({ title: 'T', amount: 5, perk: 'p' }));
    expect(validate(tierFields, { quote: '', minimumAmount: 10, tiers: many }).tiers).toMatch(/6/);
  });

  it('rejects unsafe links, bad emails and bad phone numbers', () => {
    const draft = structuredClone(SECTIONS.site.defaults) as any;
    draft.socials[0].url = 'http://youtube.com/x';
    draft.socials[1].url = 'javascript:alert(1)';
    draft.contact.email = 'nope';
    draft.contact.phone = 'abc';
    const errors = validate(SECTIONS.site.fields, draft);
    expect(errors['socials.0.url']).toMatch(/https/);
    expect(errors['socials.1.url']).toMatch(/https/);
    expect(errors['contact.email']).toBeDefined();
    expect(errors['contact.phone']).toBeDefined();
    expect(Object.keys(errors)).toHaveLength(4);
  });

  it('rejects images that are not pictures', () => {
    const draft = structuredClone(SECTIONS.home.defaults) as any;
    draft.hero.images = ['data:image/svg+xml;base64,AAAA'];
    draft.community.images = ['assets/a.jpg', 'javascript:x'];
    const errors = validate(SECTIONS.home.fields, draft);
    expect(errors['hero.images']).toBeDefined();
    expect(errors['community.images']).toBeDefined();
  });

  it('cleans drafts: trims text and drops unknown fields', () => {
    const fields: Field[] = [
      { kind: 'text', key: 'title', label: 'Title', max: 20 },
      { kind: 'list', key: 'rows', label: 'Rows', itemLabel: 'Row', titleKey: 'name', max: 3, fields: [{ kind: 'text', key: 'name', label: 'Name', max: 10 }] },
    ];
    expect(clean(fields, { title: '  Hi  ', extra: 1, rows: [{ name: ' a ', junk: true }] }))
      .toEqual({ title: 'Hi', rows: [{ name: 'a' }] });
    expect(blankItem(fields)).toEqual({ title: '', rows: [] });
    expect(resolve(fields, { title: 5 }, { title: 'Default', rows: [] })).toEqual({ title: 'Default', rows: [] });
  });
});

describe('team members', () => {
  const team = SECTIONS.about.fields.find(f => f.key === 'management')!;
  const member = { name: 'Thabo', role: 'Conductor', desc: '', image: '' };

  it('cannot be saved without "About them" and a photo', () => {
    const errors = validate([team], { management: [member] });
    expect(Object.keys(errors).sort()).toEqual(['management.0.desc', 'management.0.image']);
    expect(validate([team], { management: [{ ...member, desc: 'Leads the choir.', image: 'https://res.cloudinary.com/x/a.jpg' }] })).toEqual({});
  });

  it('still shows members saved before these were required', () => {
    const out = resolve([team], { management: [member] }, { management: [] });
    expect(out.management).toEqual([member]);
  });
});

describe('validating events', () => {
  const good: EventForm = { name: 'Gala', venue: 'Hall', city: 'Pretoria', date: '2026-05-29T10:00', price: '200', capacity: '300', description: '', status: 'On Sale', currency: 'ZAR', ticketUrl: '', ticketProvider: '' };

  it('accepts a complete event, including a free one', () => {
    expect(validateEvent(good)).toEqual({});
    expect(validateEvent({ ...good, price: '0' })).toEqual({});
    expect(validateEvent({ ...good, price: '149.50' })).toEqual({});
  });

  it('never treats an empty price as free', () => {
    expect(validateEvent({ ...good, price: '' }).price).toMatch(/Enter the ticket price/);
    expect(validateEvent({ ...good, price: '   ' }).price).toBeDefined();
    expect(validateEvent({ ...good, price: 'abc' }).price).toBeDefined();
    expect(validateEvent({ ...good, price: '-1' }).price).toMatch(/negative/);
    expect(validateEvent({ ...good, price: '1.999' }).price).toMatch(/two decimal/);
    expect(validateEvent({ ...good, price: '100001' }).price).toBeDefined();
  });

  it('checks capacity, including tickets already issued', () => {
    expect(validateEvent({ ...good, capacity: '' }).capacity).toBeDefined();
    expect(validateEvent({ ...good, capacity: '0' }).capacity).toBeDefined();
    expect(validateEvent({ ...good, capacity: '2.5' }).capacity).toBeDefined();
    expect(validateEvent({ ...good, capacity: '50' }, 80).capacity).toMatch(/80 tickets/);
    expect(validateEvent({ ...good, capacity: '80' }, 80)).toEqual({});
  });

  it('requires name, venue, city, date and a known status', () => {
    const errors = validateEvent({ ...good, name: ' ', venue: '', city: '', date: 'tomorrow', status: 'Whenever' });
    expect(Object.keys(errors).sort()).toEqual(['city', 'date', 'name', 'status', 'venue']);
    expect(validateEvent({ ...good, name: 'x'.repeat(201) }).name).toMatch(/200/);
    expect(validateEvent({ ...good, description: 'x'.repeat(5001) }).description).toBeDefined();
  });
});

describe('currencies and outside sellers', () => {
  const good: EventForm = { name: 'Gala', venue: 'Hall', city: 'Mbabane', date: '2026-05-29T10:00', price: '200', capacity: '300', description: '', status: 'On Sale', currency: 'SZL', ticketUrl: 'https://www.mojaticket.com/event/gala', ticketProvider: 'MojaTicket' };

  it('formats each amount with its own currency, and legacy amounts as rand', async () => {
    const { formatMoney } = await import('../src/models/currency');
    expect(formatMoney(150)).toMatch(/^R 150[.,]00$/);
    expect(formatMoney(150, 'BWP')).toMatch(/^P 150[.,]00$/);
    expect(formatMoney(150, 'SZL')).toMatch(/^E 150[.,]00$/);
    expect(formatMoney(150, 'nonsense')).toMatch(/^R /);
  });

  it('never adds different currencies together', async () => {
    const { totalsByCurrency } = await import('../src/models/currency');
    expect(totalsByCurrency([{ amount: 100 }, { amount: 50, currency: 'BWP' }, { amount: 20, currency: 'ZAR' }]))
      .toEqual([{ currency: 'ZAR', total: 120 }, { currency: 'BWP', total: 50 }]);
  });

  it('treats only https links as sold elsewhere', async () => {
    const { sellsElsewhere } = await import('../src/models/currency');
    expect(sellsElsewhere({ ticketUrl: 'https://www.mojaticket.com/x' })).toBe(true);
    expect(sellsElsewhere({ ticketUrl: '' })).toBe(false);
    expect(sellsElsewhere({ ticketUrl: 'javascript:alert(1)' })).toBe(false);
    expect(sellsElsewhere({})).toBe(false);
  });

  it('accepts an event sold by MojaTicket in emalangeni', () => {
    expect(validateEvent(good)).toEqual({});
  });

  it('rejects unknown currencies, unsafe links, and a link without a seller or the reverse', () => {
    expect(validateEvent({ ...good, currency: 'BTC' }).currency).toBeDefined();
    expect(validateEvent({ ...good, ticketUrl: 'http://mojaticket.com/x' }).ticketUrl).toMatch(/https/);
    expect(validateEvent({ ...good, ticketUrl: 'javascript:alert(1)' }).ticketUrl).toBeDefined();
    expect(validateEvent({ ...good, ticketProvider: '' }).ticketProvider).toBeDefined();
    expect(validateEvent({ ...good, ticketUrl: '' }).ticketUrl).toBeDefined();
    expect(validateEvent({ ...good, ticketProvider: 'x'.repeat(61) }).ticketProvider).toMatch(/60/);
  });
});

describe('confirming a save', () => {
  it('treats the same content as equal whatever order its fields come back in', async () => {
    const { stable } = await import('../src/content/stable');
    expect(stable({ b: 1, a: { d: [2, { z: 1, y: 2 }], c: 'x' } })).toBe(stable({ a: { c: 'x', d: [2, { y: 2, z: 1 }] }, b: 1 }));
    expect(stable({ a: [1, 2] })).not.toBe(stable({ a: [2, 1] }));
    expect(stable({ a: 'x' })).not.toBe(stable({ a: 'y' }));
  });
});

describe('event list order', () => {
  it('shows the most recently added event first, older records after by date', async () => {
    const { sortNewestFirst } = await import('../src/controllers/eventController');
    const at = (iso: string) => ({ seconds: Date.parse(iso) / 1000 });
    const list = sortNewestFirst([
      { id: 'tour', createdAt: at('2026-11-01T10:00:00Z'), date: at('2027-05-29T10:00:00Z') },
      { id: 'legacyLate', createdAt: undefined, date: at('2027-09-01T10:00:00Z') },
      { id: 'eswatini', createdAt: at('2026-11-16T09:00:00Z'), date: at('2026-12-16T11:34:00Z') },
      { id: 'legacySoon', createdAt: undefined, date: at('2027-01-01T10:00:00Z') },
    ] as never);
    expect(list.map((e: { id: string }) => e.id)).toEqual(['eswatini', 'tour', 'legacySoon', 'legacyLate']);
  });
});

describe('upcoming events on the home page', () => {
  it('lists events on sale that are still to come, soonest first, at most three', async () => {
    const { pickUpcoming } = await import('../src/content/upcoming');
    const now = Date.parse('2026-11-16T12:00:00Z');
    const at = (iso: string) => ({ seconds: Date.parse(iso) / 1000 });
    const events = [
      { id: 'late', name: 'Late', status: 'On Sale', date: at('2027-03-01T18:00:00Z'), capacity: 10, ticketsSold: 0, price: 100 },
      { id: 'soon', name: 'Soon', status: 'On Sale', date: at('2026-12-01T18:00:00Z'), capacity: 10, ticketsSold: 10, price: 50 },
      { id: 'past', name: 'Past', status: 'On Sale', date: at('2026-10-01T18:00:00Z'), capacity: 10, ticketsSold: 0, price: 50 },
      { id: 'tonight', name: 'Tonight', status: 'On Sale', date: at('2026-11-16T09:00:00Z'), capacity: 10, ticketsSold: 0, price: 0 },
      { id: 'draft', name: 'Draft', status: 'Draft', date: at('2026-12-02T18:00:00Z'), capacity: 10, ticketsSold: 0, price: 50 },
      { id: 'later', name: 'Later', status: 'On Sale', date: at('2027-06-01T18:00:00Z'), capacity: 10, ticketsSold: 0, price: 50 },
      { id: 'nodate', name: 'No date', status: 'On Sale', date: null, capacity: 10, ticketsSold: 0, price: 50 },
    ];
    const list = pickUpcoming(events as never, now);
    expect(list.map(e => e.id)).toEqual(['tonight', 'soon', 'late']);
    expect(list[1].soldOut).toBe(true);
    expect(list[0].date).toBe('2026-11-16T09:00:00.000Z');
    expect(list[0].currency).toBe('ZAR');
  });
});

describe('downloadable ticket PDF', () => {
  it('wraps the ticket image in a valid one-page PDF of 210 x 95 mm', async () => {
    const { jpegToPdf } = await import('../src/services/ticketDownload');
    const fakeJpeg = new Uint8Array([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9]);
    const pdf = jpegToPdf(fakeJpeg, 2480, 1122, 'Bokamoso on Tour (Gaborone) - BAI-ABCDEFGH2345');
    const text = new TextDecoder('latin1').decode(pdf);
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('/MediaBox [0 0 595.28 269.29]');
    expect(text).toContain('/Width 2480 /Height 1122');
    expect(text).toContain(`/Length ${fakeJpeg.length}`);
    // The cross-reference table must point at each object, and startxref at the table.
    const startxref = Number(text.match(/startxref\n(\d+)/)![1]);
    expect(text.slice(startxref, startxref + 4)).toBe('xref');
    const offsets = [...text.slice(startxref).matchAll(/(\d{10}) 00000 n/g)].map(m => Number(m[1]));
    expect(offsets).toHaveLength(6);
    offsets.forEach((o, i) => expect(text.slice(o, o + 7)).toBe(`${i + 1} 0 obj`));
    // Brackets in titles would break the PDF string; they are removed.
    expect(text).toContain('/Title (Bokamoso on Tour Gaborone - BAI-ABCDEFGH2345)');
  });
});

describe('when an event is over', () => {
  it('counts an event as over 12 hours after it starts', async () => {
    const { eventHasEnded } = await import('../src/controllers/lib/utils');
    const now = Date.parse('2026-11-17T12:00:00Z');
    const at = (iso: string) => ({ seconds: Date.parse(iso) / 1000 });
    expect(eventHasEnded(at('2026-11-17T09:00:00Z'), now)).toBe(false); // started 3 hours ago
    expect(eventHasEnded(at('2026-11-16T23:59:00Z'), now)).toBe(true); // 12 hours and a minute ago
    expect(eventHasEnded(at('2026-12-01T18:00:00Z'), now)).toBe(false); // still to come
    expect(eventHasEnded(null, now)).toBe(false); // no date: not treated as over
  });
});

describe('ticket types', () => {
  const base: EventForm = { name: 'Gala', venue: 'Hall', city: 'Pretoria', date: '2027-05-29T10:00', price: '', capacity: '', description: '', status: 'On Sale', currency: 'ZAR', ticketUrl: '', ticketProvider: '' };
  const row = (id: string, name: string, price: string, capacity: string, sold = 0) => ({ id, name, price, capacity, sold });

  it('accepts several types with their own prices and seats', () => {
    expect(validateEvent({ ...base, types: [row('t1', 'General Admission', '100', '200'), row('t2', 'VIP', '350', '20')] })).toEqual({});
  });

  it('checks each type: name, unique names, price and seats (not below what is sold)', () => {
    const e = validateEvent({ ...base, types: [row('t1', '', 'x', '0'), row('t2', 'VIP', '-1', '5', 8), row('t3', 'vip', '10', '10')] });
    expect(e['type-0-name']).toMatch(/name/);
    expect(e['type-0-price']).toBeDefined();
    expect(e['type-0-capacity']).toBeDefined();
    expect(e['type-1-price']).toMatch(/negative/);
    expect(e['type-1-capacity']).toMatch(/8 of these are already issued/);
    expect(e['type-2-name']).toMatch(/same name/);
    expect(validateEvent({ ...base, types: [] }).types).toBeDefined();
  });

  it('reads older events as one General Admission type, and lists newer ones in order', async () => {
    const { ticketTypesOf, priceRange, typeOf } = await import('../src/models/ticketTypes');
    expect(ticketTypesOf({ price: 150, capacity: 100, ticketsSold: 40 })).toEqual([{ id: 'general', name: 'General Admission', price: 150, capacity: 100, sold: 40, remaining: 60 }]);
    const typed = { price: 100, capacity: 30, ticketTypes: { t2: { name: 'VIP', price: 350, capacity: 10 }, t1: { name: 'General Admission', price: 100, capacity: 20 } }, typeSold: { t2: 10 } };
    expect(ticketTypesOf(typed).map(t => [t.id, t.remaining])).toEqual([['t1', 20], ['t2', 0]]);
    expect(priceRange(typed)).toEqual({ min: 100, max: 350 });
    expect(typeOf(typed, 'general')?.id).toBe('t1'); // a bag line from before the event had types
  });
});

describe('fresh data before the copy saved on this device', () => {
  const snap = (fromCache: boolean, v: string) => ({ metadata: { fromCache, hasPendingWrites: false, isEqual: () => false }, v });

  it('shows the server answer and never the older saved copy when the server is quick', async () => {
    const { vi } = await import('vitest');
    vi.useFakeTimers();
    const { preferServer } = await import('../src/controllers/lib/preferServer');
    const seen: string[] = [];
    const h = preferServer((s: ReturnType<typeof snap>) => seen.push(s.v), 1500);
    h(snap(true, 'saved'));
    vi.advanceTimersByTime(400);
    h(snap(false, 'server'));
    vi.advanceTimersByTime(5000);
    expect(seen).toEqual(['server']);
    h(snap(true, 'later local change'));
    expect(seen).toEqual(['server', 'later local change']);
    vi.useRealTimers();
  });

  it('falls back to the saved copy when the server is slow', async () => {
    const { vi } = await import('vitest');
    vi.useFakeTimers();
    const { preferServer } = await import('../src/controllers/lib/preferServer');
    const seen: string[] = [];
    const h = preferServer((s: ReturnType<typeof snap>) => seen.push(s.v), 1500);
    h(snap(true, 'saved'));
    vi.advanceTimersByTime(1600);
    expect(seen).toEqual(['saved']);
    h(snap(false, 'server'));
    expect(seen).toEqual(['saved', 'server']);
    vi.useRealTimers();
  });
});

describe('sign-in error messages', () => {
  it('explains a password-policy refusal and a failed bot check in plain words', async () => {
    const { friendlyError } = await import('../src/controllers/lib/utils');
    const policy = Object.assign(new Error('Firebase: Missing password requirements: [Password must contain an upper case character, Password must contain a numeric character] (auth/password-does-not-meet-requirements).'), { code: 'auth/password-does-not-meet-requirements' });
    expect(friendlyError(policy)).toBe('Choose a stronger password. Password must contain an upper case character. Password must contain a numeric character.');
    expect(friendlyError({ code: 'auth/firebase-app-check-token-is-invalid' })).toMatch(/real browser/);
  });
});

describe('site error reports', () => {
  it('keep messages short and free of emails and long ids, and name only the browser family', async () => {
    const { cleanMessage, browserFamily } = await import('../src/controllers/errorLogController');
    expect(cleanMessage('Failed for thandi.m@example.co.za with token AbCdEfGhIjKlMnOpQrStUvWxYz0123456789')).toBe('Failed for [email] with token [id]');
    expect(cleanMessage('word '.repeat(100))).toHaveLength(300);
    expect(browserFamily('Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36')).toBe('Chrome on Android');
    expect(browserFamily('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1')).toBe('Safari on iPhone');
  });
});

describe('add to calendar', () => {
  it('builds a Google Calendar link and a valid calendar file lasting three hours', async () => {
    const { googleCalendarUrl, icsFile } = await import('../src/services/calendar');
    const ev = { id: 'e1', name: 'Lost in Music, Eswatini; Night', date: '2026-12-16T11:34:00Z', venue: 'Esibayeni Lodge', city: 'Matsapha', url: 'https://example.org/events/e1' };
    const g = new URL(googleCalendarUrl(ev));
    expect(g.searchParams.get('dates')).toBe('20261216T113400Z/20261216T143400Z');
    expect(g.searchParams.get('location')).toBe('Esibayeni Lodge, Matsapha');
    const ics = icsFile(ev);
    expect(ics).toContain('DTSTART:20261216T113400Z');
    expect(ics).toContain('DTEND:20261216T143400Z');
    expect(ics).toContain('SUMMARY:Lost in Music\\, Eswatini\\; Night');
    expect(ics.split('\r\n').every(line => line.length <= 75)).toBe(true);
    expect(googleCalendarUrl({ ...ev, date: null })).toBe('');
  });
});

describe('door scanning without signal', () => {
  it('admits a valid ticket once, refuses used, cancelled and unknown ones, and records them later', async () => {
    const store = new Map<string, string>();
    const fake = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); }, key: () => null, clear: () => store.clear(), get length() { return store.size; } };
    Object.defineProperty(globalThis, 'localStorage', { value: new Proxy(fake, { ownKeys: () => [...store.keys()], getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }) }), configurable: true });
    const { doorOffline } = await import('../src/services/doorOffline');
    const t = (id: string, status: 'VALID' | 'SCANNED' | 'CANCELLED') => ({ id, status, ticketType: 'General', buyerEmail: `${id}@x.com` }) as never;
    doorOffline.saveList({ id: 'e1', name: 'Gala', date: new Date(Date.now() + 3600e3) }, [t('BAI-AAA', 'VALID'), t('BAI-BBB', 'SCANNED'), t('BAI-CCC', 'CANCELLED'), t('BAI-DDD', 'VALID')]);
    expect(doorOffline.check('BAI-AAA', 'e1').kind).toBe('admit');
    expect(doorOffline.check('BAI-AAA', 'e1')).toMatchObject({ kind: 'refuse', reason: 'used' });
    expect(doorOffline.check('BAI-BBB', 'e1')).toMatchObject({ kind: 'refuse', reason: 'used' });
    expect(doorOffline.check('BAI-CCC', 'e1')).toMatchObject({ kind: 'refuse', reason: 'cancelled' });
    expect(doorOffline.check('BAI-ZZZ', 'e1')).toMatchObject({ kind: 'refuse', reason: 'unknown' });
    expect(doorOffline.check('BAI-AAA', 'other')).toMatchObject({ kind: 'refuse', reason: 'no-list' });
    expect(doorOffline.check('BAI-DDD', 'e1').kind).toBe('admit');
    // A fresh copy from the server must not forget admissions still waiting to be recorded.
    doorOffline.saveList({ id: 'e1', name: 'Gala', date: new Date(Date.now() + 3600e3) }, [t('BAI-AAA', 'VALID'), t('BAI-DDD', 'VALID')]);
    expect(doorOffline.check('BAI-AAA', 'e1')).toMatchObject({ kind: 'refuse', reason: 'used' });
    // Back online: AAA records; DDD was already let in by another phone.
    const recorded: string[] = [];
    const conflicts = await doorOffline.sync(async (id) => {
      if (id === 'BAI-DDD') throw Object.assign(new Error('Already admitted at 18:02.'), { kind: 'used' });
      recorded.push(id);
    });
    expect(recorded).toEqual(['BAI-AAA']);
    expect(conflicts.map(c => c.ticketId)).toEqual(['BAI-DDD']);
    expect(doorOffline.queue()).toEqual([]);
  });
});

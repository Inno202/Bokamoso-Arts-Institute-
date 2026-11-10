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

    const home = resolveSection('home', { hero: { image: 'javascript:alert(1)' }, community: { images: ['assets/a.jpg', 'http://x/y.jpg', 7] } });
    expect(home.hero.image).toBe('assets/hero.jpg');
    expect(home.community.images).toEqual(['assets/a.jpg']);
  });

  it('drops malformed list items and wrong types instead of crashing', () => {
    const donate = resolveSection('donate', {
      tiers: [
        { title: 'Friend', amount: 100, perk: 'Sheet music for a term.' },
        { title: 'No amount', amount: '', perk: 'x' },
        { title: 'Negative', amount: -5, perk: 'x' },
        'not an object',
        null,
      ],
      minimumAmount: 'ten',
    });
    expect(donate.tiers).toEqual([{ title: 'Friend', amount: 100, perk: 'Sheet music for a term.' }]);
    expect(donate.minimumAmount).toBe(10);
  });

  it('falls back to the default list when too few valid items remain', () => {
    const donate = resolveSection('donate', { tiers: [{ title: '', amount: 0, perk: '' }] });
    expect(donate.tiers).toEqual(SECTIONS.donate.defaults.tiers);
  });

  it('allows a list to be emptied on purpose', () => {
    expect(resolveSection('site', { partners: [] }).partners).toEqual([]);
  });

  it('ignores fields it does not know and caps over-long text', () => {
    const about = resolveSection('about', { badge: 'x'.repeat(500), injected: '<script>', story: { title: 'Hello', evil: true } });
    expect(about.badge).toHaveLength(40);
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
    expect(about.hero.label).toBe(SECTIONS.about.defaults.hero.label);

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
  const tierFields = SECTIONS.donate.fields;

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
    draft.hero.image = 'data:image/svg+xml;base64,AAAA';
    draft.community.images = ['assets/a.jpg', 'javascript:x'];
    const errors = validate(SECTIONS.home.fields, draft);
    expect(errors['hero.image']).toBeDefined();
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

describe('validating events', () => {
  const good: EventForm = { name: 'Gala', venue: 'Hall', city: 'Pretoria', date: '2026-05-29T10:00', price: '200', capacity: '300', description: '', status: 'On Sale' };

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

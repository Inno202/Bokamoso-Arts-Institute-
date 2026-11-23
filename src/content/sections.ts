/**
 * The content sections of the site: what each holds, its built-in defaults, and
 * the fields staff can edit. Pure data and pure functions (no Firebase).
 *
 * The defaults are what the public site shows when the content store is empty
 * or cannot be reached.
 */
import { type Data, type Field, resolve } from './fields';

// ---------- shapes ----------

export interface Stat { value: string; label: string; detail: string }

export interface SiteContent {
  contact: { address: string; phone: string; email: string };
  eventsHeroImage: string;
  footerBlurb: string;
  copyrightLine: string;
  socials: Array<{ network: 'youtube' | 'facebook' | 'instagram' | 'whatsapp'; url: string }>;
  partners: Array<{ name: string }>;
}

export interface HomeContent {
  hero: { tagline: string; images: string[] };
  stats: Stat[];
  philosophy: { headingLine1: string; headingLine2: string; quote: string; image: string; buttonLabel: string };
  community: { headingLine1: string; headingLine2: string; images: string[] };
  highlights: {
    headingLine1: string; headingLine2: string;
    items: Array<{ date: string; title: string; text: string; linkLabel: string; linkTo: 'traditions' | 'events' | 'about' | 'programs' }>;
  };
}

export interface AboutContent {
  heroImage: string;
  story: { title: string; description: string; stats: Array<{ value: string; label: string }> };
  valuesHeading: string;
  values: Array<{ title: string; desc: string }>;
  management: Array<{ role: string; name: string; desc: string; image: string }>;
  choirPictures: string[];
}

export interface WorkContent {
  heroImage: string;
  pillars: Array<{ title: string; desc: string }>;
  gallery: { headingLine1: string; headingLine2: string };
  projects: Array<{ title: string; imageUrl: string }>;
  outreach: {
    title: string; description: string; imageUrl: string;
    stats: Array<{ value: string; label: string }>;
  };
}

export interface TraditionsContent {
  heroImage: string;
  items: Array<{ title: string; desc: string; when: string }>;
}

export interface ContentMap {
  site: SiteContent;
  home: HomeContent;
  about: AboutContent;
  work: WorkContent;
  traditions: TraditionsContent;
}
export type SectionKey = keyof ContentMap;

export interface SectionDef<K extends SectionKey = SectionKey> {
  key: K;
  title: string;
  /** Which public pages show this content, in plain words. */
  shownOn: string;
  /** In-app path of the main page that shows it. */
  preview: string;
  fields: Field[];
  defaults: ContentMap[K];
  /** Where this section lived before the content store existed (read-only fallback). */
  legacyPath?: string;
}

// ---------- small field builders ----------

const text = (key: string, label: string, max: number, extra: Partial<Extract<Field, { kind: 'text' }>> = {}): Field =>
  ({ kind: 'text', key, label, max, ...extra });
const required = { required: true } as const;
const long = { multiline: true } as const;

const statFields = (withDetail: boolean): Field[] => [
  text('value', 'Figure', 12, { ...required, help: 'For example 2, 250+ or 5th.' }),
  text('label', 'Label', 40, required),
  ...(withDetail ? [text('detail', 'Detail', 80)] : []),
];

// ---------- sections ----------

const site: SectionDef<'site'> = {
  key: 'site',
  title: 'Contact, socials and partners',
  shownOn: 'The footer of every page, the partners strip on the home page, the social links on Our Work, and the photo at the top of Events.',
  preview: '/',
  fields: [
    { kind: 'group', key: 'contact', label: 'Contact details', fields: [
      text('address', 'Address', 200, required),
      { kind: 'tel', key: 'phone', label: 'Phone number', help: 'Leave empty to hide the phone number on the site.' },
      { kind: 'email', key: 'email', label: 'Email address', required: true },
    ] },
    { kind: 'image', key: 'eventsHeroImage', label: 'Photo at the top of the Events page', required: true, help: 'Best size: 1600 × 900, landscape. Keep the subject in the centre and the bottom-left calm (the page title sits there).' },
    text('footerBlurb', 'Footer introduction', 200, long),
    text('copyrightLine', 'Line after the copyright notice', 100),
    { kind: 'list', key: 'socials', label: 'Social media links', itemLabel: 'Social link', titleKey: 'network', max: 8, fields: [
      { kind: 'select', key: 'network', label: 'Network', options: [
        { value: 'youtube', label: 'YouTube' },
        { value: 'facebook', label: 'Facebook' },
        { value: 'instagram', label: 'Instagram' },
        { value: 'whatsapp', label: 'WhatsApp' },
      ] },
      { kind: 'url', key: 'url', label: 'Link', required: true },
    ] },
    { kind: 'list', key: 'partners', label: 'Partners', itemLabel: 'Partner', titleKey: 'name', max: 20, fields: [
      text('name', 'Partner name', 60, required),
    ] },
  ],
  defaults: {
    contact: {
      address: '110 Industrial Park, Mabopane, Gauteng, 0190',
      phone: '+27 12 702 4455',
      email: 'info@bokamosoarts.org',
    },
    eventsHeroImage: 'assets/photos/soloist-lost-in-music.jpg',
    footerBlurb: 'Bula Pelo. Open your heart. We nurture the voices of Mabopane to resonate across the globe.',
    copyrightLine: 'Cultural excellence from Mabopane.',
    socials: [
      { network: 'youtube', url: 'https://youtube.com/@bokamosoartsinstitute?si=KQ55EgXECEq4iSDR' },
      { network: 'facebook', url: 'https://www.facebook.com/share/1G9FqBQFUC/' },
      { network: 'instagram', url: 'https://www.instagram.com/bokamoso_arts_institute?igsh=dG9sdTQzYjU5aWtx' },
    ],
    partners: [
      { name: 'Entsika Foundation' },
      { name: 'DSAC' },
      { name: 'Tshwane Heritage' },
      { name: 'Old Mutual ZA' },
      { name: 'Bokamoso Passenger' },
    ],
  },
};

const home: SectionDef<'home'> = {
  key: 'home',
  title: 'Home page',
  shownOn: 'The home page.',
  preview: '/',
  fields: [
    { kind: 'group', key: 'hero', label: 'Top of the page', fields: [
      text('tagline', 'Line under the name', 80, { help: 'Bula Pelo is underlined by hand on the page.' }),
      { kind: 'images', key: 'images', label: 'Slideshow photos', max: 6, help: 'Best size: 1600 × 1067, landscape, with the choir in the centre (phones trim the sides). The first photo shows first.' },
    ] },
    { kind: 'list', key: 'stats', label: 'Key figures', itemLabel: 'Figure', titleKey: 'label', max: 4, fields: statFields(true) },
    { kind: 'group', key: 'philosophy', label: 'Philosophy', fields: [
      text('headingLine1', 'Heading, first line', 40, required),
      text('headingLine2', 'Heading, second line', 40),
      text('quote', 'Quote', 400, { ...required, ...long }),
      { kind: 'image', key: 'image', label: 'Photo', required: true, help: 'Best size: 1280 × 1600, portrait (4:5).' },
      text('buttonLabel', 'Button label', 40, required),
    ] },
    { kind: 'group', key: 'community', label: 'Community', fields: [
      text('headingLine1', 'Heading, first word', 40, required),
      text('headingLine2', 'Heading, second word', 40),
      { kind: 'images', key: 'images', label: 'Photos', max: 6, help: 'Three photos fit best. Best size: 1280 × 1600, portrait (4:5).' },
    ] },
    { kind: 'group', key: 'highlights', label: 'Highlights', fields: [
      text('headingLine1', 'Heading, first word', 40, required),
      text('headingLine2', 'Heading, second word', 40),
      { kind: 'list', key: 'items', label: 'Highlights', itemLabel: 'Highlight', titleKey: 'title', max: 4, fields: [
        text('date', 'Date', 40, { help: 'For example Feb 14-15.' }),
        text('title', 'Title', 80, required),
        text('text', 'Description', 300, { ...required, ...long }),
        text('linkLabel', 'Link label', 40, required),
        { kind: 'select', key: 'linkTo', label: 'Link goes to', options: [
          { value: 'traditions', label: 'Traditions page' },
          { value: 'events', label: 'Events page' },
          { value: 'about', label: 'About page' },
          { value: 'programs', label: 'Our Work page' },
        ] },
      ] },
    ] },
  ],
  defaults: {
    hero: {
      tagline: 'Bula Pelo. Open your heart.',
      images: ['assets/photos/choir-stage.jpg', 'assets/photos/conductor-lost-in-music.jpg', 'assets/photos/choir-black.jpg'],
    },
    stats: [
      { value: '2', label: 'WCG World Titles', detail: 'Gold Medals in South Korea 2023' },
      { value: '250+', label: 'Artists Trained', detail: 'Nurturing local township talent' },
      { value: '5th', label: 'Annual Prayer', detail: 'Community Soul & Resilience' },
    ],
    philosophy: {
      headingLine1: 'Music is',
      headingLine2: 'Resilience.',
      quote: '"We don\'t just teach notes; we nurture souls. Our philosophy is rooted in the belief that artistic excellence is the most powerful tool for township transformation."',
      image: 'assets/philosophy.jpg',
      buttonLabel: 'Discover Our Story',
    },
    community: {
      headingLine1: 'Community',
      headingLine2: 'Impact',
      images: ['assets/community/community-1.jpg', 'assets/community/community-2.jpg', 'assets/community/community-3.jpg'],
    },
    highlights: {
      headingLine1: 'Our',
      headingLine2: 'Traditions',
      items: [
        { date: 'Feb 14-15', title: '5th Annual Prayer Service', text: '"The First Kick" — An all-night spiritual gathering to set the tone for the season. Join us in Mabopane.', linkLabel: 'Learn More', linkTo: 'traditions' },
        { date: 'May 29-30', title: 'Botswana on Tour', text: 'Maitisong Theatre, Gaborone. We are bringing the voices of Mabopane to our neighbors. Tickets out now.', linkLabel: 'Get Tickets', linkTo: 'events' },
      ],
    },
  },
};

const about: SectionDef<'about'> = {
  key: 'about',
  title: 'About page',
  shownOn: 'The About Us page.',
  preview: '/about',
  legacyPath: 'about/main',
  fields: [
    { kind: 'image', key: 'heroImage', label: 'Photo at the top of the page', required: true, help: 'Best size: 1600 × 900, landscape. Keep the subject in the centre and the bottom-left calm (the page title sits there).' },
    { kind: 'group', key: 'story', label: 'Our story', fields: [
      text('title', 'Heading', 60, required),
      text('description', 'Story', 1500, { ...required, ...long }),
      { kind: 'list', key: 'stats', label: 'Figures', itemLabel: 'Figure', titleKey: 'label', max: 4, fields: statFields(false) },
    ] },
    text('valuesHeading', 'Values heading', 60, required),
    { kind: 'list', key: 'values', label: 'Values', itemLabel: 'Value', titleKey: 'title', max: 8, fields: [
      text('title', 'Value', 60, required),
      text('desc', 'Description', 240, { ...required, ...long }),
    ] },
    { kind: 'list', key: 'management', label: 'Management team', itemLabel: 'Team member', titleKey: 'name', max: 30, fields: [
      text('name', 'Name', 80, { ...required, help: 'Shown exactly as typed, including capital letters.' }),
      text('role', 'Role', 80, required),
      text('desc', 'About them', 400, { ...long, requiredOnSave: true }),
      { kind: 'image', key: 'image', label: 'Photo', requiredOnSave: true, help: 'Best size: 1600 × 1600, square, with the face in the upper middle.' },
    ] },
    { kind: 'images', key: 'choirPictures', label: 'Choir photos', max: 24, help: 'Best size: 1600 × 1600, square. The first photo also appears beside the story, cropped to portrait (4:5), so keep its subject in the middle.' },
  ],
  defaults: {
    heroImage: 'assets/photos/choir-blue.jpg',
    story: {
      title: 'Our Story',
      description: "Founded deep within the industrial heart of Mabopane, BAI was a response to the lack of artistic sanctuaries for marginalized youth. We believe that discipline in music translates to discipline in life. Our choristers don't just gain vocal skills; they gain a spiritual compass and an artistic drive.",
      stats: [
        { value: '2', label: 'World Titles' },
        { value: 'EST', label: '2022 Foundation' },
      ],
    },
    valuesHeading: 'Our Foundation',
    values: [
      { title: 'Township Resilience', desc: 'Finding power in our origins and overcoming systemic barriers.' },
      { title: 'Global Precision', desc: 'Adhering to world-class standards in artistic excellence and performance.' },
      { title: 'Ubuntu Leadership', desc: 'Fostering collective responsibility and community focus.' },
      { title: 'Spiritual Fire', desc: 'Maintaining the sacred energy of traditional African choral art.' },
    ],
    // People and their photos are never invented: these stay empty until staff add them.
    management: [],
    choirPictures: [],
  },
};

const work: SectionDef<'work'> = {
  key: 'work',
  title: 'Our Work page',
  shownOn: 'The Our Work page.',
  preview: '/programs',
  legacyPath: 'work/main',
  fields: [
    { kind: 'image', key: 'heroImage', label: 'Photo at the top of the page', required: true, help: 'Best size: 1600 × 900, landscape. Keep the subject in the centre and the bottom-left calm (the page title sits there).' },
    { kind: 'list', key: 'pillars', label: 'What we do', itemLabel: 'Area of work', titleKey: 'title', max: 6, fields: [
      text('title', 'Title', 60, required),
      text('desc', 'Description', 300, { ...required, ...long }),
    ] },
    { kind: 'group', key: 'gallery', label: 'Project gallery heading', fields: [
      text('headingLine1', 'Heading, first line', 40, required),
      text('headingLine2', 'Heading, second line', 40),
    ] },
    { kind: 'list', key: 'projects', label: 'Projects', itemLabel: 'Project', titleKey: 'title', max: 24, fields: [
      text('title', 'Title', 80, required),
      { kind: 'image', key: 'imageUrl', label: 'Photo', help: 'Best size: 1280 × 1600, portrait (4:5). The title sits along the bottom.' },
    ] },
    { kind: 'group', key: 'outreach', label: 'Outreach', fields: [
      text('title', 'Heading', 80, required),
      text('description', 'Description', 600, { ...required, ...long }),
      { kind: 'image', key: 'imageUrl', label: 'Photo', help: 'Best size: 1600 × 1600, square.' },
      { kind: 'list', key: 'stats', label: 'Figures', itemLabel: 'Figure', titleKey: 'label', max: 4, fields: statFields(false) },
    ] },
  ],
  defaults: {
    heroImage: 'assets/photos/orchestra-lost-in-music.jpg',
    pillars: [
      { title: 'Choral Mastery', desc: 'Intensive vocal training focusing on indigenous South African rhythms, hymns, and contemporary choral arrangements.' },
      { title: 'Professional Coaching', desc: 'Developing stage presence, emotional connectivity, and technical precision through professional workshops.' },
      { title: 'Community Impact', desc: 'Using the power of voice to inspire hope and provide therapeutic support to vulnerable communities.' },
    ],
    gallery: { headingLine1: 'Living', headingLine2: 'Engagement' },
    projects: [
      { title: 'School Workshop', imageUrl: '' },
      { title: 'Choir Rehearsal', imageUrl: '' },
      { title: 'Street Performance', imageUrl: '' },
      { title: 'Youth Mentorship', imageUrl: '' },
      { title: 'Annual Gala', imageUrl: '' },
      { title: 'Orphanage Visit', imageUrl: '' },
    ],
    outreach: {
      title: 'Schools & Orphanages.',
      description: 'The Bokamoso Choir regularly visits local schools and orphanages in Mabopane to perform, share music, and inspire the youth through artistic exchange and spiritual upliftment.',
      imageUrl: 'assets/community/community-3.jpg',
      stats: [
        { value: '20+', label: 'Visits Per Year' },
        { value: '1500+', label: 'Souls Uplifted' },
      ],
    },
  },
};

const traditions: SectionDef<'traditions'> = {
  key: 'traditions',
  title: 'Traditions page',
  shownOn: 'The Traditions page.',
  preview: '/traditions',
  fields: [
    { kind: 'image', key: 'heroImage', label: 'Photo at the top of the page', required: true, help: 'Best size: 1600 × 900, landscape. Keep the subject in the centre and the bottom-left calm (the page title sits there).' },
    { kind: 'list', key: 'items', label: 'Traditions', itemLabel: 'Tradition', titleKey: 'title', min: 1, max: 12, fields: [
      text('title', 'Name', 80, required),
      text('desc', 'Description', 600, { ...required, ...long }),
      text('when', 'When it happens', 60, { help: 'For example Every February 14-15, or Annually.' }),
    ] },
  ],
  defaults: {
    heroImage: 'assets/photos/choir-black.jpg',
    items: [
      { title: 'Annual Prayer Service', desc: 'Our season begins with an all-night spiritual gathering in Mabopane. We invite elders, parents, and community leaders to join the institute in a collective "Bula Pelo" prayer for the year ahead.', when: 'Every February 14-15' },
      { title: 'Conductors Extravaganza', desc: 'A week-long masterclass hosted by BAI, bringing together the finest choral conductors in Southern Africa to share techniques, arrangements, and the philosophy of African Excellence.', when: 'Annually' },
      { title: 'Concert Series', desc: 'Our highlight local performance for the residents. This is where we debut our international repertoire to the community before taking it across borders.', when: 'Annually' },
    ],
  },
};

export const SECTIONS: { [K in SectionKey]: SectionDef<K> } = { site, home, about, work, traditions };
export const SECTION_KEYS = Object.keys(SECTIONS) as SectionKey[];
export const isSectionKey = (value: unknown): value is SectionKey =>
  typeof value === 'string' && (SECTION_KEYS as string[]).includes(value);

// ---------- loading logic ----------

export type ContentSource = 'store' | 'legacy' | 'defaults';

/**
 * Decides what a section shows: the content store first, then the place the
 * section lived before the store existed, then the built-in defaults.
 */
export function pickSource(stored: unknown, legacy: unknown): { source: ContentSource; raw: unknown } {
  const isDoc = (v: unknown) => typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length > 0;
  if (isDoc(stored)) return { source: 'store', raw: stored };
  if (isDoc(legacy)) return { source: 'legacy', raw: legacy };
  return { source: 'defaults', raw: undefined };
}

/** Always returns complete, renderable content for a section, whatever the store holds. */
export function resolveSection<K extends SectionKey>(key: K, raw: unknown): ContentMap[K] {
  const def = SECTIONS[key];
  return resolve(def.fields, raw, def.defaults as unknown as Data) as unknown as ContentMap[K];
}

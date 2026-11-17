# Bokamoso Arts Institute

Website and ticketing for the Bokamoso choir: public pages, event listings, ticket booking, a door scanner for staff and a small admin dashboard.

- **Frontend:** React 19, Vite, Tailwind CSS 4. Published as a static site on GitHub Pages.
- **Data and sign-in:** Firebase Auth and Cloud Firestore, called directly from the browser.
- **Access control:** `firestore.rules`. The browser code only decides what to *show*; the rules decide what is *allowed*.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

```bash
npm run lint       # type check
npm run test:rules # security-rule tests in the Firestore emulator (needs Java)
npm run build      # static site in dist/
npm run deploy     # publish dist/ to GitHub Pages
```

## Deploying the database rules (required)

Changes to `firestore.rules` and `firestore.indexes.json` do nothing until they are deployed to Firebase:

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore
```

Run `npm run test:rules` first. The tests cover the cases that matter most: nobody can give themselves a role, read another person's tickets or profile, forge or reprice a ticket, oversell an event, or admit a ticket twice.

## Roles

| Role | Can do |
| --- | --- |
| `USER` | Book tickets, see their own tickets |
| `TICKET_SCANNER` | Scan tickets at the door |
| `PRO` | Manage events, scan tickets; edit page content only while a super admin or the CEO has approved a request |
| `FINANCE_MANAGER` | See ticket totals |
| `CEO` | Everything above except scanning, plus edit page content directly, add staff, deactivate accounts and approve PRO content access |
| `SUPER_ADMIN` | Everything, including changing roles |

PRO staff who open Site content see a "Request access" screen. Super admins and the CEO approve (for 1 hour, 1 day or 1 week), decline or end access from the Users page. The rules enforce it: a PRO's content save is refused unless `content_access/{uid}` is approved and unexpired, approvals last at most 7 days, and nobody can approve their own request.

Everyone who signs up is a `USER`. Roles are changed by a super admin in Dashboard > Manage users. The very first super admin has to be set by hand in the Firebase console (Firestore > `users` > that person's document > `role: "SUPER_ADMIN"`).

Deactivating an account (`isActive: false`) signs the person out and removes all staff access immediately.

## Pages are pre-rendered

`npm run build` produces finished HTML for every public page (home, about, our work, events, traditions, sign-in, sign-up and the policies), with the site's current content from the database baked in. Pages appear instantly, work for search engines and link previews, and are then brought to life in the browser. If the database cannot be reached during a build, the built-in defaults are used and the build still succeeds.

- Addresses are real paths, such as `/Bokamoso-Arts-Institute-/events`. Old `#/events` links are redirected automatically.
- Content edited in the admin area appears straight away without a rebuild; the next build bakes it into the HTML too.
- Pages that depend on who is signed in (bag, checkout, tickets, staff pages) are not pre-rendered.

## Editing the site (content store)

Everything that changes on the public pages lives in one place: the Firestore `content` collection, one document per section (`site`, `home`, `about`, `work`, `traditions`). Events live in the `events` collection.

- **Staff edit it in the admin area** (Dashboard, then Events or Site content). Public pages only read; nothing is edited on a live page.
- **Who may edit is enforced by `firestore.rules`**, not by hidden buttons: only Super Admin, CEO and PR Officer can write content or events, and every content save records who made it and when.
- **Built-in defaults** in `src/content/sections.ts` are shown whenever a section has never been saved or the database cannot be reached.
- **Adding an editable field:** add it to the section's `fields` and `defaults` in `src/content/sections.ts` and use it in the page. The admin form, the validation and the safe loading all come from that one definition.
- The About and Our Work pages fall back to their earlier `about/main` and `work/main` documents until someone saves them once in the admin area.

```bash
npm run test:unit  # content loading and validation
```

To try the admin area without touching live data, run the emulators and the dev server side by side:

```bash
npx firebase-tools emulators:start --only firestore,auth --project bokamosoarts-6bf62
```

```bash
VITE_USE_EMULATORS=true npx vite
```

## Terms, privacy and cookies

`src/views/pages/Legal.tsx` holds the three policies. Update it, and its "last updated" date, in the same change as anything that alters what is charged, collected, stored or promised.

## Settings only the owner can switch on

These live in the Firebase, Cloudinary and Google consoles, not in this code:

1. **App Check enforcement** (Firebase → App Check → APIs). After the site has run for a day, when most requests show as verified, press **Enforce** for Cloud Firestore and Authentication. Requests that do not come from the real website are then refused.
2. **Password policy** (Firebase → Authentication → Settings → Password policy): require at least 8 characters with a mix of letters and numbers.
3. **Email enumeration protection** (Firebase → Authentication → Settings → User actions): on, so sign-in errors never reveal whether an email has an account.
4. **Authorised domains** (Firebase → Authentication → Settings): only `inno202.github.io` (and `localhost` for development).
5. **Database backups** (needs the Blaze plan): Firebase → Firestore → Disaster recovery → scheduled backups, daily, kept for 7 to 14 days.
6. **Cloudinary preset `bai_media`**: unsigned, asset folder `bokamoso`; if your plan offers them, also allowed formats `jpg, png, webp` and a 10 MB limit.
7. **Google Search Console**: add the property `https://inno202.github.io/Bokamoso-Arts-Institute-/`, verify it, and submit `sitemap.xml`. GitHub Pages project sites cannot serve a root `robots.txt`; signed-in and staff pages carry `noindex` instead.
8. **Dependabot** (`.github/dependabot.yml`) opens a pull request each week when a library needs updating: review and merge those.

## Security

What protects the system, and where each protection lives.

| Threat | Protection | Where |
| --- | --- | --- |
| Flooding the website (DDoS) | The site is static files served from GitHub's global network; there is no server of ours to overload | GitHub Pages |
| Flooding or scraping the database, mass fake sign-ups | **Firebase App Check**: requests without proof they come from this site in a real browser are refused | Console setup below |
| Someone using another person's account or data | Every read and write is checked against the signed-in person and their role | `firestore.rules` |
| Stolen or abandoned staff session | Staff are signed out after 30 idle minutes; role and account changes need a sign-in from the last 8 hours; a deactivated account loses access at once | `AuthProvider.tsx`, `firestore.rules` |
| Forged, free-minted or hoarded tickets | A ticket only exists as part of an order that matches the event's price and sold count; 10 tickets per account per event | `firestore.rules` |
| Malicious script injected into a page (XSS) | Content-Security-Policy limits where scripts can come from; admin input is validated; links must be https | `vite.config.ts`, `src/content` |
| The site hidden inside a hostile page (clickjacking) | The app refuses to start inside another site's frame | `src/main.tsx` |
| Forged requests from another site (CSRF) | Sign-in uses tokens the browser never sends automatically, not cookies | Firebase Auth |

No setup makes a system immune to every attack. These settings are not in the code and must be switched on once in the consoles:

1. **App Check** (the main defence against scripted floods):
   - Create a reCAPTCHA v3 key for your site's domain at google.com/recaptcha/admin.
   - Firebase console → App Check → register the web app with that key.
   - Put the site key in `.env` as `VITE_RECAPTCHA_SITE_KEY`, rebuild and deploy.
   - After a day of traffic shows as verified, press **Enforce** for Cloud Firestore and Authentication.
2. **Authentication settings** (Firebase console → Authentication → Settings): turn on email enumeration protection, set a password policy (minimum length 8), and remove any authorised domain you do not use.
3. **Budget alert** (Google Cloud console → Billing → Budgets): get an email if usage ever spikes.
4. **API key restriction** (Google Cloud console → Credentials → Browser key): restrict to your site's address under HTTP referrers.
5. **Staff accounts**: use strong unique passwords, and prefer Google sign-in with 2-step verification for anyone with a role.

## Images

Set `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET` (see `.env.example`) so uploads go to Cloudinary. Without them, uploaded images are compressed and stored inside Firestore documents, which caps each page at roughly 1 MB of images.

### Image sizes for uploads

**For every upload:**

- Use JPEG, PNG or WebP, under 10 MB.
- Uploads are shrunk automatically to **1600 px on the longest side**, so there's no benefit in uploading anything bigger.
- Most frames fill their space and trim the edges, so keep **faces, titles and dates in the middle**.
- The **downloaded ticket** and the **full-screen photo viewer** always show the whole image, uncropped.

**Events (Admin → Events)**

| Image | Best size | Where it shows | Notes |
| --- | --- | --- | --- |
| Banner photo / poster (required) | **1600 × 1200** (4:3 landscape) | Event card, top of the open ticket, downloaded ticket | 4:3 fits the event card exactly. A square poster (1080 × 1080) still works, but the card trims about 12% off the top and bottom, so keep text away from those edges. On the downloaded ticket any shape shows in full. |
| Ticket artwork (required) | **1200 × 1200** (square) | Your tickets (on screen and the downloaded PDF) and the thumbnail in the bag | An event cannot be saved without both pictures; older events without one are asked for it the next time they are edited. |

The coloured strip at the top of an open ticket on screen is very wide and short, so only the **middle band** of the banner shows there. This is decorative and expected.

**Site content (Admin → Site content)**

| Image | Best size | Notes |
| --- | --- | --- |
| Page header photos (About, Our Work, Events, Traditions) | **1600 × 900** (16:9 landscape) | Desktop shows a wide strip (about 10:3); phones show a nearly square crop. Keep the subject in the centre and the bottom-left calm, because the page title sits there. |
| Home slideshow | **1600 × 1067** (3:2 landscape) | Fills the whole screen. Phones trim a lot off the sides, so keep the subject centred. |
| Portrait photos: Home (choir and community), About story, Our Work projects | **1280 × 1600** (4:5 portrait) | Fits exactly. |
| Square photos: management team, "The choir" gallery, outreach | **1600 × 1600** (1:1) | Fits exactly. Put faces in the upper middle of team headshots. |

**Quick version:**

- Event posters: **1600 × 1200**
- Header and slideshow photos: **landscape, subject centred**
- Content photos: **1280 × 1600 portrait** or **1600 × 1600 square**

## Events in other countries

Each event has its own currency (rand, pula, emalangeni, maloti, Namibian dollar, US dollar, euro or pound; rand if none is set). Prices show the local symbol, and the bag and checkout show one total per currency, never converted or added together. The list lives in `src/models/currency.ts` and must match the list in `firestore.rules`.

When a show is sold by someone else, such as MojaTicket in Eswatini or the venue's own box office, fill in "Sold somewhere else?" on the event. The Events page then shows a "Buy tickets on …" link to that seller instead of the bag button, and the rules refuse any on-site order for that event. Seat counts for those shows are kept by the seller.

## Before taking real payments

Checkout currently issues tickets **without charging anyone** and tells the buyer so (`PAYMENTS_LIVE` in `src/config.ts`). A browser-only site cannot take payments safely: the payment provider must confirm payment to a server, and that server must be the only thing allowed to create tickets. To go live:

1. Add a server-side function (for example a Firebase Cloud Function) that receives the provider's payment confirmation (PayFast ITN, Yoco or Ozow webhook), verifies its signature, and creates the tickets with the Admin SDK.
2. Change the `tickets` `create` rule in `firestore.rules` to `if false`, so browsers can no longer create tickets.
3. Only then set `PAYMENTS_LIVE` to `true`.

## Project layout

```
src/content       the content store: sections, defaults, validation, loader
src/controllers   data access (Firestore, auth)
src/views         public pages, components and the admin area (views/admin)
src/hooks         shared cart state
src/services      image upload, toasts, logging
firestore.rules   who can read and write what
tests/            security-rule tests
server.ts         dev server and optional authenticated API (not used by the static site)
```

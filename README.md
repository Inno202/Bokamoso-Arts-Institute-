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
| `PRO` | Manage events and page content, scan tickets |
| `FINANCE_MANAGER` | See ticket totals, edit page content |
| `CEO` | Everything above except scanning, plus add staff and deactivate accounts |
| `SUPER_ADMIN` | Everything, including changing roles |

Everyone who signs up is a `USER`. Roles are changed by a super admin in Dashboard > Manage users. The very first super admin has to be set by hand in the Firebase console (Firestore > `users` > that person's document > `role: "SUPER_ADMIN"`).

Deactivating an account (`isActive: false`) signs the person out and removes all staff access immediately.

## Images

Set `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET` (see `.env.example`) so uploads go to Cloudinary. Without them, uploaded images are compressed and stored inside Firestore documents, which caps each page at roughly 1 MB of images.

## Before taking real payments

Checkout currently issues tickets **without charging anyone** and tells the buyer so (`PAYMENTS_LIVE` in `src/config.ts`). A browser-only site cannot take payments safely: the payment provider must confirm payment to a server, and that server must be the only thing allowed to create tickets. To go live:

1. Add a server-side function (for example a Firebase Cloud Function) that receives the provider's payment confirmation (PayFast ITN, Yoco or Ozow webhook), verifies its signature, and creates the tickets with the Admin SDK.
2. Change the `tickets` `create` rule in `firestore.rules` to `if false`, so browsers can no longer create tickets.
3. Only then set `PAYMENTS_LIVE` to `true`.

The same applies to donations, which are currently pledged by email.

## Project layout

```
src/controllers   data access (Firestore, auth)
src/views         pages and components
src/hooks         shared cart state
src/services      image upload, toasts, logging
firestore.rules   who can read and write what
tests/            security-rule tests
server.ts         dev server and optional authenticated API (not used by the static site)
```

import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../controllers/navigation';
import { useContent } from '../../content/store';
import { PageHero } from '../components/PageHero';
import { PAYMENTS_LIVE } from '../../config';
import { MAX_PER_EVENT } from '../../controllers/cartController';

/**
 * Terms, Privacy Policy and Cookie Policy.
 *
 * These describe what the site actually does. Whenever a change affects what is
 * charged, collected, stored or promised, update the matching section here and
 * the LAST_UPDATED date in the same commit.
 */
const LAST_UPDATED = '10 November 2026';

type Doc = 'terms' | 'privacy' | 'cookies';
const TITLES: Record<Doc, [string, string]> = {
  terms: ['Terms', 'of use.'],
  privacy: ['Privacy', 'policy.'],
  cookies: ['Cookie', 'policy.'],
};

const H = ({ children }: { children: React.ReactNode }) => <h2 className="font-display font-bold text-2xl uppercase tracking-tight mt-12 mb-4">{children}</h2>;
const P = ({ children }: { children: React.ReactNode }) => <p className="mb-4">{children}</p>;
const UL = ({ children }: { children: React.ReactNode }) => <ul className="list-disc pl-6 space-y-2 mb-4">{children}</ul>;

export default function Legal({ doc }: { doc: Doc }) {
  const { contact } = useContent('site');
  const email = <a href={`mailto:${contact.email}`} className="link">{contact.email}</a>;
  const others = (Object.keys(TITLES) as Doc[]).filter(d => d !== doc);
  const paths: Record<Doc, string> = { terms: ROUTES.TERMS, privacy: ROUTES.PRIVACY, cookies: ROUTES.COOKIES };
  const names: Record<Doc, string> = { terms: 'Terms of use', privacy: 'Privacy policy', cookies: 'Cookie policy' };

  return (
    <div className="pb-20 md:pb-28">
      <PageHero line1={TITLES[doc][0]} line2={TITLES[doc][1]} />
      <article className="max-w-[70ch] mx-auto px-4 sm:px-6 py-12 md:py-16 text-lg leading-relaxed text-bai-black/85">
        <p className="text-bai-black/70 mb-8">Last updated {LAST_UPDATED}</p>

        {doc === 'terms' && (
          <>
            <P>These terms apply when you use this website, create an account or book tickets. The site is run by Bokamoso Arts Institute, {contact.address}.</P>

            <H>Your account</H>
            <P>You need an account to book tickets. Give your real name and an email address you can read, and keep your password to yourself. You are responsible for what is done through your account. We may deactivate an account that is misused.</P>

            <H>Tickets</H>
            <UL>
              {PAYMENTS_LIVE
                ? <li>The price shown at checkout is the price you pay, including any ticketing fee shown there.</li>
                : <li><strong>Online payment is not available yet.</strong> Tickets booked on this site are currently issued without charge, and the site never asks for card details. These terms will be updated before any payment is taken online.</li>}
              <li>Each ticket admits one person, once. It is checked and marked as used at the door.</li>
              <li>You can book up to {MAX_PER_EVENT} tickets for an event in one order, while seats remain.</li>
              <li>Your ticket reference and QR code are your proof of booking. Anyone who has them can use the ticket, so only share them with the person attending.</li>
              <li>Event dates, times and venues can change. The Events page and your ticket always show the current details.</li>
            </UL>

            <H>Using the site</H>
            <P>Do not try to break, overload or gain unauthorised access to the site, book tickets with automated tools, or use another person's account.</P>

            <H>Content</H>
            <P>The text, photographs, recordings and logo on this site belong to Bokamoso Arts Institute or the people who made them. Ask us before reusing them.</P>

            <H>Changes and contact</H>
            <P>We may update these terms as the site changes; the date above shows the latest version. Questions: {email} or {contact.phone}.</P>
          </>
        )}

        {doc === 'privacy' && (
          <>
            <P>This policy explains what personal information this website collects, why, and what you can do about it. The site is run by Bokamoso Arts Institute, {contact.address}. We handle personal information in line with South Africa's Protection of Personal Information Act (POPIA).</P>

            <H>What we collect</H>
            <UL>
              <li><strong>Account details:</strong> your name and email address when you create an account. If you sign in with Google, we receive your name and email address from Google. Your password is handled by Google Firebase Authentication; we never see or store it.</li>
              <li><strong>Tickets:</strong> which events you booked, how many tickets, the price, the time of booking, and when a ticket was scanned at the door and by which staff account.</li>
              <li><strong>Your bag:</strong> the tickets you have added but not yet booked, saved to your account and in your browser so they are still there when you come back.</li>
              <li><strong>Emails you send us:</strong> if you email us, we receive whatever you choose to send.</li>
              <li><strong>Staff activity:</strong> for staff accounts, your role and a record of which account last changed site content or scanned a ticket.</li>
            </UL>
            <P>We do not collect card or bank details on this site, and we do not use advertising or analytics trackers.</P>

            <H>Why we use it</H>
            <UL>
              <li>To create and secure your account.</li>
              <li>To issue your tickets, show them to you, and check them at the door.</li>
              <li>To report internally on how many tickets were issued.</li>
              <li>To reply when you contact us.</li>
            </UL>
            <P>We do not sell your information or use it for marketing without your agreement.</P>

            <H>Who else handles it</H>
            <UL>
              <li><strong>Google Firebase</strong> stores accounts, tickets and site content, and handles sign-in. Its servers may be outside South Africa.</li>
              <li><strong>Cloudinary</strong> stores photographs that staff upload to the site.</li>
              <li><strong>GitHub Pages</strong> hosts the website, and <strong>Google Fonts</strong> supplies its typefaces. Like any web host, they see your device's IP address when your browser loads the page.</li>
            </UL>

            <H>How long we keep it</H>
            <P>We keep your account until you ask us to delete it. Ticket records are kept as a record of attendance and bookings. Ask us if you would like yours removed.</P>

            <H>Your rights</H>
            <P>You can ask us for a copy of the information we hold about you, ask us to correct or delete it, or object to how we use it. Email {email}. If you are not satisfied with our answer, you can complain to the Information Regulator of South Africa.</P>

            <H>Changes</H>
            <P>If what we collect or how we use it changes, we will update this page and the date above.</P>
          </>
        )}

        {doc === 'cookies' && (
          <>
            <P>This site does not use advertising or analytics cookies. It stores a small amount of information in your browser so that it works properly.</P>

            <H>What is stored on your device</H>
            <UL>
              <li><strong>Sign-in:</strong> when you sign in, Google Firebase keeps you signed in using your browser's storage, until you sign out.</li>
              <li><strong>Offline copy:</strong> a copy of the pages' content, events and your tickets is cached so the site loads quickly and your tickets open with a weak connection.</li>
              <li><strong>Your bag:</strong> the tickets you have added but not yet booked.</li>
              <li><strong>Footer preference:</strong> whether you have folded the footer away.</li>
            </UL>
            <P>These are needed for the site to do what you ask of it, which is why there is no cookie banner. None of them is used to track you across other websites.</P>

            <H>Other services</H>
            <P>If you choose "Sign in with Google", Google opens its own window and sets its own cookies there, under Google's privacy policy. The site's typefaces are loaded from Google Fonts.</P>

            <H>Clearing it</H>
            <P>Signing out removes your sign-in. Clearing site data for this website in your browser settings removes everything listed above; your account and tickets stay safe on our side and return when you sign in again.</P>

            <H>Questions</H>
            <P>Email {email}.</P>
          </>
        )}

        <p className="mt-12 pt-8 border-t border-bai-black/15">
          See also: {others.map((d, i) => (
            <span key={d}>{i > 0 && ' and '}<Link to={paths[d]} className="link">{names[d]}</Link></span>
          ))}.
        </p>
      </article>
    </div>
  );
}

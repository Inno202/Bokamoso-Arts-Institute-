/**
 * Online card payments are NOT connected. Until a payment provider (PayFast, Yoco,
 * Ozow...) confirms payment on a server and that server issues the tickets,
 * checkout issues tickets without charging anyone, and says so to the buyer.
 *
 * Do not flip this to true to "hide the notice": taking real money needs a
 * server-side payment confirmation first. See README, "Before taking real payments".
 */
export const PAYMENTS_LIVE = false;


/** Staff are signed out after this many minutes without touching the page. */
export const STAFF_IDLE_MINUTES = 30;

/** Changing roles or accounts needs a sign-in newer than this. Must match recentSignIn() in firestore.rules. */
export const RECENT_SIGN_IN_HOURS = 8;

export const FALLBACK_EVENT_IMAGE = `${import.meta.env.BASE_URL}assets/hero.jpg`;

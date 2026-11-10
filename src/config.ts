/**
 * Online card payments are NOT connected. Until a payment provider (PayFast, Yoco,
 * Ozow...) confirms payment on a server and that server issues the tickets,
 * checkout issues tickets without charging anyone, and says so to the buyer.
 *
 * Do not flip this to true to "hide the notice": taking real money needs a
 * server-side payment confirmation first. See README, "Before taking real payments".
 */
export const PAYMENTS_LIVE = false;


export const FALLBACK_EVENT_IMAGE = `${import.meta.env.BASE_URL}assets/hero.jpg`;

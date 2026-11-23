import { isSafeUrl, type Errors } from './fields';
import { formatMoney, isCurrency } from '../models/currency';
import { MAX_TYPES, TYPE_NAME_LIMIT } from '../models/ticketTypes';

/** What the event form holds while staff are typing: every value is still text. */
export interface EventForm {
  name: string;
  venue: string;
  city: string;
  date: string;
  price: string;
  capacity: string;
  description: string;
  status: string;
  currency: string;
  /** Optional: where tickets are sold instead of this site. */
  ticketUrl: string;
  ticketProvider: string;
  /** Optional line-up: one performer or act per line. */
  lineup?: string;
  /** Ticket types being edited. When present they replace the single price and capacity. */
  types?: FormTicketType[];
}

/** One ticket type row in the form; `sold` is how many of it are already issued. */
export interface FormTicketType { id: string; name: string; price: string; capacity: string; sold: number }

function priceProblem(raw: string, currency: string): string | undefined {
  const price = Number(raw);
  if (raw.trim() === '' || !Number.isFinite(price)) return 'Enter the price. Use 0 if it is free.';
  if (price < 0) return 'The price cannot be negative.';
  if (price > EVENT_LIMITS.price) return `The price cannot be more than ${formatMoney(EVENT_LIMITS.price, currency).replace(/[,.]00$/, '')}.`;
  if (Math.round(price * 100) !== price * 100) return 'Use at most two decimal places.';
  return undefined;
}

function seatsProblem(raw: string, sold: number): string | undefined {
  const seats = Number(raw);
  if (raw.trim() === '' || !Number.isInteger(seats)) return 'Enter the number of seats as a whole number.';
  if (seats < 1) return 'There must be at least 1 seat.';
  if (seats > EVENT_LIMITS.capacity) return `Seats cannot be more than ${EVENT_LIMITS.capacity}.`;
  if (seats < sold) return `${sold} of these are already issued, so the seats cannot go below that.`;
  return undefined;
}

export const EVENT_STATUSES = ['On Sale', 'Draft', 'Closed', 'Cancelled'] as const;
export const EVENT_LIMITS = { name: 200, venue: 200, city: 100, description: 5000, price: 100000, capacity: 1000000, ticketUrl: 500, ticketProvider: 60, lineupNames: 20, lineupName: 80 };

/** The line-up typed one per line, as the saved list (blank lines dropped). */
export const lineupFrom = (text = '') => text.split('\n').map(s => s.trim()).filter(Boolean);

/** Mirrors the event checks in firestore.rules, with messages staff can act on. */
export function validateEvent(form: EventForm, ticketsSold = 0): Errors {
  const errors: Errors = {};
  const need = (key: 'name' | 'venue' | 'city', label: string) => {
    const value = form[key].trim();
    if (!value) errors[key] = `Add the ${label}.`;
    else if (value.length > EVENT_LIMITS[key]) errors[key] = `Keep the ${label} to ${EVENT_LIMITS[key]} characters or fewer.`;
  };
  need('name', 'event name');
  need('venue', 'venue');
  need('city', 'city');

  if (!form.date || Number.isNaN(new Date(form.date).getTime())) errors.date = 'Choose the date and time.';

  if (form.types) {
    // Each ticket type has its own name, price and seats.
    if (form.types.length === 0) errors.types = 'Add at least one ticket type.';
    if (form.types.length > MAX_TYPES) errors.types = `An event can have at most ${MAX_TYPES} ticket types.`;
    const seen = new Set<string>();
    form.types.forEach((t, i) => {
      const name = t.name.trim();
      if (!name) errors[`type-${i}-name`] = 'Give this ticket type a name, for example VIP.';
      else if (name.length > TYPE_NAME_LIMIT) errors[`type-${i}-name`] = `Keep the name to ${TYPE_NAME_LIMIT} characters or fewer.`;
      else if (seen.has(name.toLowerCase())) errors[`type-${i}-name`] = 'Two ticket types cannot have the same name.';
      seen.add(name.toLowerCase());
      const price = priceProblem(t.price, form.currency);
      if (price) errors[`type-${i}-price`] = price;
      const seats = seatsProblem(t.capacity, t.sold);
      if (seats) errors[`type-${i}-capacity`] = seats;
    });
  } else {
    // An empty price must never quietly become R0.
    const price = priceProblem(form.price, form.currency);
    if (price) errors.price = price === 'Enter the price. Use 0 if it is free.' ? 'Enter the ticket price. Use 0 for a free event.' : price;
    const capacity = Number(form.capacity);
    if (form.capacity.trim() === '' || !Number.isInteger(capacity)) errors.capacity = 'Enter the number of seats as a whole number.';
    else if (capacity < 1) errors.capacity = 'There must be at least 1 seat.';
    else if (capacity > EVENT_LIMITS.capacity) errors.capacity = `Capacity cannot be more than ${EVENT_LIMITS.capacity}.`;
    else if (capacity < ticketsSold) errors.capacity = `${ticketsSold} tickets are already issued, so capacity cannot go below that.`;
  }

  if (form.description.length > EVENT_LIMITS.description) errors.description = `Keep the description to ${EVENT_LIMITS.description} characters or fewer.`;
  if (!(EVENT_STATUSES as readonly string[]).includes(form.status)) errors.status = 'Choose a status.';
  if (!isCurrency(form.currency)) errors.currency = 'Choose the currency the price is in.';

  // Selling through the venue or a ticket seller (for example MojaTicket in Eswatini).
  const url = form.ticketUrl.trim();
  const provider = form.ticketProvider.trim();
  if (url) {
    if (url.length > EVENT_LIMITS.ticketUrl) errors.ticketUrl = `Keep the link to ${EVENT_LIMITS.ticketUrl} characters or fewer.`;
    else if (!isSafeUrl(url)) errors.ticketUrl = 'Use the full link to the ticket page, starting with https://';
    if (!provider) errors.ticketProvider = 'Add who sells the tickets, for example MojaTicket or the venue\'s name.';
  }
  if (provider.length > EVENT_LIMITS.ticketProvider) errors.ticketProvider = `Keep the name to ${EVENT_LIMITS.ticketProvider} characters or fewer.`;
  if (provider && !url) errors.ticketUrl = 'Add the link where those tickets are sold, or clear the seller\'s name.';

  const lineup = lineupFrom(form.lineup);
  if (lineup.length > EVENT_LIMITS.lineupNames) errors.lineup = `List up to ${EVENT_LIMITS.lineupNames} names.`;
  else if (lineup.some(n => n.length > EVENT_LIMITS.lineupName)) errors.lineup = `Keep each name to ${EVENT_LIMITS.lineupName} characters or fewer.`;
  return errors;
}

import type { Errors } from './fields';

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
}

export const EVENT_STATUSES = ['On Sale', 'Draft', 'Closed'] as const;
export const EVENT_LIMITS = { name: 200, venue: 200, city: 100, description: 5000, price: 100000, capacity: 1000000 };

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

  // An empty price must never quietly become R0.
  const price = Number(form.price);
  if (form.price.trim() === '' || !Number.isFinite(price)) errors.price = 'Enter the ticket price. Use 0 for a free event.';
  else if (price < 0) errors.price = 'The price cannot be negative.';
  else if (price > EVENT_LIMITS.price) errors.price = `The price cannot be more than R${EVENT_LIMITS.price}.`;
  else if (Math.round(price * 100) !== price * 100) errors.price = 'Use at most two decimal places.';

  const capacity = Number(form.capacity);
  if (form.capacity.trim() === '' || !Number.isInteger(capacity)) errors.capacity = 'Enter the number of seats as a whole number.';
  else if (capacity < 1) errors.capacity = 'There must be at least 1 seat.';
  else if (capacity > EVENT_LIMITS.capacity) errors.capacity = `Capacity cannot be more than ${EVENT_LIMITS.capacity}.`;
  else if (capacity < ticketsSold) errors.capacity = `${ticketsSold} tickets are already issued, so capacity cannot go below that.`;

  if (form.description.length > EVENT_LIMITS.description) errors.description = `Keep the description to ${EVENT_LIMITS.description} characters or fewer.`;
  if (!(EVENT_STATUSES as readonly string[]).includes(form.status)) errors.status = 'Choose a status.';
  return errors;
}

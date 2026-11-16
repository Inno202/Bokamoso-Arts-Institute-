/**
 * Currencies an event can be priced in: the rand, the neighbouring currencies of
 * countries the choir tours, and the three most likely further afield.
 * The list is mirrored in firestore.rules (validEvent).
 */
export const CURRENCIES = [
  { code: 'ZAR', name: 'South African rand', symbol: 'R' },
  { code: 'BWP', name: 'Botswana pula', symbol: 'P' },
  { code: 'SZL', name: 'Eswatini lilangeni', symbol: 'E' },
  { code: 'LSL', name: 'Lesotho loti', symbol: 'M' },
  { code: 'NAD', name: 'Namibian dollar', symbol: 'N$' },
  { code: 'USD', name: 'US dollar', symbol: 'US$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British pound', symbol: '£' },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]['code'];
export const DEFAULT_CURRENCY: CurrencyCode = 'ZAR';

export const isCurrency = (value: unknown): value is CurrencyCode =>
  typeof value === 'string' && CURRENCIES.some(c => c.code === value);

/** The event's currency, treating events saved before currencies existed as rand. */
export const currencyOf = (value: unknown): CurrencyCode => (isCurrency(value) ? value : DEFAULT_CURRENCY);

const number = new Intl.NumberFormat('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "R 150,00", "P 150,00", "E 150,00": the local symbol, then the amount, written the South African way. */
export function formatMoney(amount: number, currency: unknown = DEFAULT_CURRENCY): string {
  const code = currencyOf(currency);
  const symbol = CURRENCIES.find(c => c.code === code)!.symbol;
  return `${symbol} ${number.format(Number.isFinite(amount) ? amount : 0)}`;
}

/** Adds up amounts per currency, so rand and pula are never added together. */
export function totalsByCurrency(lines: Array<{ amount: number; currency?: unknown }>) {
  const totals = new Map<CurrencyCode, number>();
  for (const line of lines) {
    const code = currencyOf(line.currency);
    totals.set(code, (totals.get(code) || 0) + line.amount);
  }
  return [...totals].map(([currency, total]) => ({ currency, total }));
}

/** True for a link that sends buyers to another site (the venue's or a ticket seller's). */
export const sellsElsewhere = (event: { ticketUrl?: unknown } | null | undefined) =>
  typeof event?.ticketUrl === 'string' && event.ticketUrl.startsWith('https://');

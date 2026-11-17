/**
 * Ticket types per event (General Admission, VIP, Early bird, ...). An event stores up
 * to six in `ticketTypes` under the fixed keys t1..t6, with seats sold per type in
 * `typeSold`. Events saved before ticket types existed have one implicit type,
 * "General Admission", using the event's own price, capacity and ticketsSold.
 */
export const TYPE_IDS = ['t1', 't2', 't3', 't4', 't5', 't6'] as const;
export type TypeId = (typeof TYPE_IDS)[number];
export const LEGACY_TYPE_ID = 'general';
export const LEGACY_TYPE_NAME = 'General Admission';
export const MAX_TYPES = TYPE_IDS.length;
export const TYPE_NAME_LIMIT = 40;

export interface TicketTypeDef { name: string; price: number; capacity: number }

export interface EventTicketType extends TicketTypeDef {
  id: string;
  sold: number;
  remaining: number;
}

interface TypedEventLike {
  price?: number;
  capacity?: number;
  ticketsSold?: number;
  ticketTypes?: Partial<Record<string, TicketTypeDef>> | null;
  typeSold?: Partial<Record<string, number>> | null;
}

export const hasTicketTypes = (event: TypedEventLike) =>
  !!event.ticketTypes && TYPE_IDS.some(id => !!event.ticketTypes?.[id]);

/** The event's ticket types in order, with seats sold and left for each. */
export function ticketTypesOf(event: TypedEventLike): EventTicketType[] {
  if (!hasTicketTypes(event)) {
    const capacity = Number(event.capacity) || 0;
    const sold = Number(event.ticketsSold) || 0;
    return [{ id: LEGACY_TYPE_ID, name: LEGACY_TYPE_NAME, price: Number(event.price) || 0, capacity, sold, remaining: Math.max(0, capacity - sold) }];
  }
  return TYPE_IDS.filter(id => !!event.ticketTypes?.[id]).map(id => {
    const def = event.ticketTypes![id]!;
    const sold = Number(event.typeSold?.[id]) || 0;
    return { id, name: def.name, price: Number(def.price) || 0, capacity: Number(def.capacity) || 0, sold, remaining: Math.max(0, (Number(def.capacity) || 0) - sold) };
  });
}

export function typeOf(event: TypedEventLike, typeId: string | undefined) {
  const types = ticketTypesOf(event);
  const id = typeId || LEGACY_TYPE_ID;
  const exact = types.find(t => t.id === id);
  if (exact) return exact;
  // A bag line from before the event had ticket types: its "General Admission".
  if (id === LEGACY_TYPE_ID) return types.find(t => t.name === LEGACY_TYPE_NAME) || (types.length === 1 ? types[0] : undefined);
  return undefined;
}

/** Lowest and highest price, for "From R 100" on event cards. */
export function priceRange(event: TypedEventLike) {
  const prices = ticketTypesOf(event).map(t => t.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

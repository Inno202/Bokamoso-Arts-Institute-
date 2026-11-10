import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './lib/firebase';
import { CartItem } from '../models/types';
import { logger } from '../services/loggerService';

const COLLECTION = 'cart';
export const MAX_PER_EVENT = 10;
const MAX_LINES = 25;

/** Keeps only well-formed lines and drops anything bulky (older carts stored image data). */
export function sanitizeCartItems(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(i => i && typeof i.eventId === 'string' && i.eventId && Number.isFinite(Number(i.price)))
    .slice(0, MAX_LINES)
    .map(i => ({
      eventId: i.eventId,
      eventName: String(i.eventName || 'Event').slice(0, 200),
      venue: String(i.venue || '').slice(0, 200),
      date: i.date ?? null,
      ticketType: String(i.ticketType || 'General Admission'),
      price: Number(i.price),
      quantity: Math.max(1, Math.min(MAX_PER_EVENT, Math.floor(Number(i.quantity) || 1))),
    }));
}

const localKey = (userId: string | null) => (userId ? `cart_${userId}` : 'guest_cart');

function readLocal(userId: string | null): CartItem[] {
  try {
    const raw = localStorage.getItem(localKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return sanitizeCartItems(Array.isArray(parsed) ? parsed : parsed?.items);
  } catch {
    return [];
  }
}

function writeLocal(userId: string | null, items: CartItem[]) {
  try {
    localStorage.setItem(localKey(userId), JSON.stringify(items));
  } catch {
    // Storage can be full or blocked; the in-memory cart still works.
  }
}

export const cartController = {
  async getCart(userId: string | null): Promise<CartItem[]> {
    if (!userId) return readLocal(null);
    try {
      const snap = await getDoc(doc(db, COLLECTION, userId));
      if (snap.exists()) return sanitizeCartItems(snap.data().items);
    } catch (err) {
      logger.error('Could not load the saved cart', err);
    }
    return readLocal(userId);
  },

  async updateCart(userId: string | null, items: CartItem[]) {
    const clean = sanitizeCartItems(items);
    writeLocal(userId, clean);
    if (!userId) return;
    try {
      if (clean.length === 0) {
        await deleteDoc(doc(db, COLLECTION, userId));
      } else {
        await setDoc(doc(db, COLLECTION, userId), {
          userId,
          items: clean,
          total: clean.reduce<number>((sum, item) => sum + item.price * item.quantity, 0),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      logger.error('Could not save the cart', err);
    }
  },
};

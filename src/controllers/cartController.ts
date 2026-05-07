import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './lib/firebase';
import { Cart, CartItem } from '../models/types';
import { logger } from '../services/loggerService';

const COLLECTION = 'cart';

export const cartController = {
  async getCart(userId: string): Promise<Cart | null> {
    const docRef = doc(db, COLLECTION, userId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
       // Check localStorage as fallback
       const local = localStorage.getItem(`cart_${userId}`);
       if (local) return JSON.parse(local);
       return null;
    }
    return snap.data() as Cart;
  },

  async updateCart(userId: string, items: CartItem[]) {
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cartData = {
      userId,
      items,
      total,
      updatedAt: serverTimestamp()
    };

    // Save to Firestore
    try {
      await setDoc(doc(db, COLLECTION, userId), cartData);
    } catch (err) {
      logger.error("Failed to save cart to Firestore", err);
    }
    
    // Fallback/Mirror to localStorage
    localStorage.setItem(`cart_${userId}`, JSON.stringify(cartData));
    return cartData;
  },

  async checkout(userId: string) {
    const { doc, getDoc, setDoc, deleteDoc, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('./lib/firebase');

    const cartRef = doc(db, COLLECTION, userId);
    const cartSnap = await getDoc(cartRef);
    if (!cartSnap.exists()) throw new Error("Cart not found");

    const cart = cartSnap.data() as Cart;
    const tickets = [];

    // Assuming we have access to user info, but we can just use userId for now
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userEmail = userDoc.exists() ? userDoc.data()?.email : 'customer@example.com';

    for (const item of cart.items || []) {
      for (let i = 0; i < item.quantity; i++) {
        const ticketId = crypto.randomUUID();
        const ticket = {
          eventId: item.eventId,
          ticketType: item.ticketType,
          buyerEmail: userEmail,
          buyerId: userId,
          status: 'VALID',
          price: item.price,
          quantity: 1,
          ticketImageUrl: item.ticketImageUrl,
          createdAt: serverTimestamp()
        };
        await setDoc(doc(db, 'tickets', ticketId), ticket);
        tickets.push({ id: ticketId, ...ticket });
      }
    }

    await deleteDoc(cartRef);
    localStorage.removeItem(`cart_${userId}`);
    
    return { success: true, tickets };
  }
};

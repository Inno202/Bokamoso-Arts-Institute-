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
    // Calls server-side checkout logic for payment stub and ticket generation
    const res = await fetch('/api/cart/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Checkout failed');
    }

    // Clear local storage on success
    localStorage.removeItem(`cart_${userId}`);
    return res.json(); // { success: true, tickets: [...] }
  }
};

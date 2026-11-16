import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '../views/components/AuthProvider';
import { cartController, MAX_PER_EVENT } from '../controllers/cartController';
import { CartItem } from '../models/types';
import { totalsByCurrency, type CurrencyCode } from '../models/currency';

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  totalItems: number;
  /** One total per currency: rand and pula are never added together. */
  totals: Array<{ currency: CurrencyCode; total: number }>;
  addToCart: (item: CartItem) => void;
  removeFromCart: (eventId: string, ticketType: string) => void;
  updateQuantity: (eventId: string, ticketType: string, delta: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

const sameLine = (a: CartItem, eventId: string, ticketType: string) =>
  a.eventId === eventId && a.ticketType === ticketType;

/** One cart for the whole app, so the navbar badge and the bag always agree. */
export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid ?? null;
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const itemsRef = useRef(items);
  const uidRef = useRef(uid);
  uidRef.current = uid;

  // The bag is loaded once per account. Sign-in state can briefly report
  // "loading" again (for example when the session refreshes); reloading then
  // would replace changes the visitor had just made with an older saved copy.
  const loadedFor = useRef<string | null | undefined>(undefined);
  const edits = useRef(0);

  useEffect(() => {
    if (authLoading || loadedFor.current === uid) return;
    loadedFor.current = uid;
    let cancelled = false;
    const editsAtStart = edits.current;
    setLoading(true);
    cartController.getCart(uid).then(loaded => {
      if (cancelled) return;
      // Anything changed while loading wins over the saved copy.
      if (edits.current === editsAtStart) {
        itemsRef.current = loaded;
        setItems(loaded);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [uid, authLoading]);

  const commit = useCallback((update: (current: CartItem[]) => CartItem[]) => {
    edits.current += 1;
    const next = update(itemsRef.current);
    itemsRef.current = next;
    setItems(next);
    void cartController.updateCart(uidRef.current, next);
  }, []);

  const addToCart = useCallback((item: CartItem) => commit(current => {
    const exists = current.some(i => sameLine(i, item.eventId, item.ticketType));
    return exists
      ? current.map(i => sameLine(i, item.eventId, item.ticketType)
          ? { ...i, quantity: Math.min(i.quantity + item.quantity, MAX_PER_EVENT) }
          : i)
      : [...current, item];
  }), [commit]);

  const removeFromCart = useCallback((eventId: string, ticketType: string) =>
    commit(current => current.filter(i => !sameLine(i, eventId, ticketType))), [commit]);

  const updateQuantity = useCallback((eventId: string, ticketType: string, delta: number) =>
    commit(current => current.map(i => sameLine(i, eventId, ticketType)
      ? { ...i, quantity: Math.max(1, Math.min(i.quantity + delta, MAX_PER_EVENT)) }
      : i)), [commit]);

  const clearCart = useCallback(() => commit(() => []), [commit]);

  const value = useMemo<CartContextType>(() => ({
    items,
    loading,
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    totals: totalsByCurrency(items.map(item => ({ amount: item.price * item.quantity, currency: item.currency }))),
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  }), [items, loading, addToCart, removeFromCart, updateQuantity, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
};

/** Flat ticketing fee per order, in rand. */
export const TICKETING_FEE = 15;

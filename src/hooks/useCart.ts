import { useState, useEffect } from 'react';
import { useAuth } from '../views/components/AuthProvider';
import { cartController } from '../controllers/cartController';
import { CartItem } from '../models/types';

export const useCart = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      cartController.getCart(user.uid).then(cart => {
        if (cart) setItems(cart.items);
        setLoading(false);
      });
    } else {
      // Guest cart load from local storage
      const local = localStorage.getItem('guest_cart');
      if (local) setItems(JSON.parse(local));
      setLoading(false);
    }
  }, [user]);

  const saveCart = async (newItems: CartItem[]) => {
    setItems(newItems);
    if (user) {
      await cartController.updateCart(user.uid, newItems);
    } else {
      localStorage.setItem('guest_cart', JSON.stringify(newItems));
    }
  };

  const addToCart = (item: CartItem) => {
    const existing = items.find(i => i.eventId === item.eventId && i.ticketType === item.ticketType);
    if (existing) {
      const newItems = items.map(i => 
        (i.eventId === item.eventId && i.ticketType === item.ticketType) 
        ? { ...i, quantity: Math.min(i.quantity + item.quantity, 10) } 
        : i
      );
      saveCart(newItems);
    } else {
      saveCart([...items, item]);
    }
  };

  const removeFromCart = (eventId: string, ticketType: string) => {
    const newItems = items.filter(i => !(i.eventId === eventId && i.ticketType === ticketType));
    saveCart(newItems);
  };

  const updateQuantity = (eventId: string, ticketType: string, delta: number) => {
    const newItems = items.map(i => {
      if (i.eventId === eventId && i.ticketType === ticketType) {
        return { ...i, quantity: Math.max(1, Math.min(i.quantity + delta, 10)) };
      }
      return i;
    });
    saveCart(newItems);
  };

  const clearCart = () => {
    saveCart([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return { items, loading, addToCart, removeFromCart, updateQuantity, clearCart, totalItems };
};

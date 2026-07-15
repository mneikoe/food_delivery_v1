import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { api } from '../api/api';
import { useAuth } from './AuthContext';

interface CartContextType {
  cartCount: number;
  cartTotal: number;
  refreshCart: () => void;
  incrementCartCount: () => void;
  decrementCartCount: () => void;
}

const CartContext = createContext<CartContextType>({
  cartCount: 0,
  cartTotal: 0,
  refreshCart: () => {},
  incrementCartCount: () => {},
  decrementCartCount: () => {},
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  const fetchingRef = useRef(false);

  const refreshCart = useCallback(async () => {
    if (!token || fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const response = await api.get('/user/cart');
      const cart = response.data;
      if (cart && Array.isArray(cart.items)) {
        const count = cart.items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
        setCartCount(count);
        setCartTotal(cart.subtotal || 0);
      } else {
        setCartCount(0);
        setCartTotal(0);
      }
    } catch {
      setCartCount(0);
      setCartTotal(0);
    } finally {
      fetchingRef.current = false;
    }
  }, [token]);

  const incrementCartCount = useCallback(() => {
    setCartCount(prev => prev + 1);
  }, []);

  const decrementCartCount = useCallback(() => {
    setCartCount(prev => Math.max(0, prev - 1));
  }, []);

  return (
    <CartContext.Provider value={{ cartCount, cartTotal, refreshCart, incrementCartCount, decrementCartCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}

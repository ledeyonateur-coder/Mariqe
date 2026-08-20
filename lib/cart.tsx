"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { products, type Product } from "@/data/products";
import { useStockOverrides, withLiveStock } from "@/lib/stock";

export type CartLine = {
  productId: string;
  quantity: number;
};

export type CartLineWithProduct = CartLine & { product: Product };

type CartContextValue = {
  lines: CartLineWithProduct[];
  totalCount: number;
  totalPrice: number;
  addItem: (productId: string, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "mariqe-cart";

function readStoredLines(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (line): line is CartLine =>
        typeof line?.productId === "string" && typeof line?.quantity === "number" && line.quantity > 0
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [rawLines, setRawLines] = useState<CartLine[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const stockOverrides = useStockOverrides();

  useEffect(() => {
    setRawLines(readStoredLines());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rawLines));
  }, [rawLines, hydrated]);

  const addItem = useCallback((productId: string, quantity = 1) => {
    setRawLines((current) => {
      const existing = current.find((line) => line.productId === productId);
      if (existing) {
        return current.map((line) =>
          line.productId === productId ? { ...line, quantity: line.quantity + quantity } : line
        );
      }
      return [...current, { productId, quantity }];
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((productId: string) => {
    setRawLines((current) => current.filter((line) => line.productId !== productId));
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setRawLines((current) => {
      if (quantity <= 0) return current.filter((line) => line.productId !== productId);
      return current.map((line) => (line.productId === productId ? { ...line, quantity } : line));
    });
  }, []);

  const clear = useCallback(() => setRawLines([]), []);

  const lines = useMemo<CartLineWithProduct[]>(() => {
    return rawLines
      .map((line) => {
        const product = products.find((p) => p.id === line.productId);
        return product ? { ...line, product: withLiveStock(product, stockOverrides) } : null;
      })
      .filter((line): line is CartLineWithProduct => line !== null);
  }, [rawLines, stockOverrides]);

  const totalCount = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines]);
  const totalPrice = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity * line.product.price, 0),
    [lines]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      totalCount,
      totalPrice,
      addItem,
      removeItem,
      setQuantity,
      clear,
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }),
    [lines, totalCount, totalPrice, addItem, removeItem, setQuantity, clear, isOpen]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}

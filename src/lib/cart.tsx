"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Product } from "./types";

export type CartLine = Pick<Product, "id" | "name" | "unit" | "price" | "image_url"> & { qty: number };

type CartState = {
  lines: CartLine[];
  note: string;
  count: number;
  total: number;
  ready: boolean;
  qtyOf: (id: string) => number;
  add: (p: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  setNote: (note: string) => void;
  /** Replace stored prices/names with fresh ones from the database; drops products that no longer exist. */
  sync: (fresh: Product[]) => void;
  clear: () => void;
};

const CartContext = createContext<CartState | null>(null);
const KEY = "um-cart-v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [note, setNote] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { lines?: CartLine[]; note?: string };
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from storage once
        setLines(Array.isArray(saved.lines) ? saved.lines : []);
        setNote(typeof saved.note === "string" ? saved.note : "");
      }
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ lines, note }));
    } catch {}
  }, [lines, note, ready]);

  const add = useCallback((p: Omit<CartLine, "qty">, qty = 1) => {
    setLines((ls) => {
      const i = ls.findIndex((l) => l.id === p.id);
      if (i === -1) return [...ls, { ...p, qty: Math.min(qty, 99) }];
      const next = [...ls];
      next[i] = { ...next[i], ...p, qty: Math.min(next[i].qty + qty, 99) };
      return next;
    });
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setLines((ls) =>
      qty <= 0 ? ls.filter((l) => l.id !== id) : ls.map((l) => (l.id === id ? { ...l, qty: Math.min(qty, 99) } : l)),
    );
  }, []);

  const sync = useCallback((fresh: Product[]) => {
    const byId = new Map(fresh.map((p) => [p.id, p]));
    setLines((ls) =>
      ls.flatMap((l) => {
        const p = byId.get(l.id);
        return p ? [{ ...l, name: p.name, unit: p.unit, price: p.price, image_url: p.image_url }] : [];
      }),
    );
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setNote("");
  }, []);

  const value = useMemo<CartState>(() => {
    const count = lines.reduce((s, l) => s + l.qty, 0);
    const total = lines.reduce((s, l) => s + l.qty * l.price, 0);
    return {
      lines,
      note,
      count,
      total,
      ready,
      qtyOf: (id) => lines.find((l) => l.id === id)?.qty ?? 0,
      add,
      setQty,
      setNote,
      sync,
      clear,
    };
  }, [lines, note, ready, add, setQty, sync, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

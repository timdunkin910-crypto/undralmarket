"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { Category, Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ProductGrid } from "./product-grid";
import { EmptyState } from "./empty-state";

type Filters = { c: string; q: string; sale: boolean; mn: boolean };

// Lower-case and fold ё/ү/ө so "суу" typed on a Russian keyboard still finds "сүү".
function norm(s: string) {
  return s.toLowerCase().replace(/ё/g, "е").replace(/ү/g, "у").replace(/ө/g, "о").trim();
}

export function CatalogBrowser({
  categories,
  products,
  canOrder,
  initial,
}: {
  categories: Category[];
  products: Product[];
  canOrder: boolean;
  initial: Filters;
}) {
  const [f, setF] = useState<Filters>(initial);
  const q = useDeferredValue(f.q);

  // Keep the URL shareable without a server round-trip
  useEffect(() => {
    const p = new URLSearchParams();
    if (f.c) p.set("c", f.c);
    if (f.q) p.set("q", f.q);
    if (f.sale) p.set("sale", "1");
    if (f.mn) p.set("mn", "1");
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
  }, [f]);

  const cat = categories.find((c) => c.slug === f.c);
  const shown = useMemo(() => {
    const nq = norm(q);
    return products.filter(
      (p) =>
        (!cat || p.category_id === cat.id) &&
        (!nq || norm(p.name).includes(nq)) &&
        (!f.sale || p.is_deal || (p.old_price != null && p.old_price > p.price)) &&
        (!f.mn || p.is_mongolian),
    );
  }, [products, cat, q, f.sale, f.mn]);

  const chip = (on: boolean) =>
    cn(
      "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium whitespace-nowrap",
      on ? "bg-forest text-white" : "bg-mint-soft text-forest hover:bg-mint",
    );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{cat ? cat.name : "Ангилал & хайлт"}</h1>

      <form role="search" onSubmit={(e) => e.preventDefault()} className="relative">
        <label htmlFor="q" className="sr-only">Бараа хайх</label>
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          id="q"
          type="search"
          inputMode="search"
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Талх, сүү, мах… хайх"
          value={f.q}
          onChange={(e) => setF({ ...f, q: e.target.value })}
          className="h-12 w-full rounded-xl border bg-mint-soft pr-12 pl-11 text-base outline-none focus:border-brand focus:bg-white focus:ring-3 focus:ring-mint"
        />
        {f.q && (
          <button
            type="button"
            onClick={() => setF({ ...f, q: "" })}
            className="absolute top-1/2 right-1 grid size-11 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground"
            aria-label="Хайлт цэвэрлэх"
          >
            <X className="size-5" aria-hidden />
          </button>
        )}
      </form>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Шүүлтүүр">
        <button type="button" aria-pressed={f.sale} className={chip(f.sale)} onClick={() => setF({ ...f, sale: !f.sale })}>
          🏷️ Хямдралтай
        </button>
        <button type="button" aria-pressed={f.mn} className={chip(f.mn)} onClick={() => setF({ ...f, mn: !f.mn })}>
          🇲🇳 Монгол үйлдвэр
        </button>
      </div>

      <nav aria-label="Ангилал сонгох" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <button type="button" aria-pressed={!f.c} className={chip(!f.c)} onClick={() => setF({ ...f, c: "" })}>
          Бүгд
        </button>
        {categories.map((c) => (
          <button key={c.id} type="button" aria-pressed={f.c === c.slug} className={chip(f.c === c.slug)} onClick={() => setF({ ...f, c: c.slug })}>
            <span aria-hidden>{c.emoji}</span> {c.name}
          </button>
        ))}
      </nav>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {shown.length} бараа
      </p>

      <ProductGrid
        products={shown}
        categories={categories}
        canOrder={canOrder}
        empty={
          products.length === 0 ? (
            <EmptyState title="Дэлгүүрийн бараа удахгүй нэмэгдэнэ" text="Одоогоор каталог хоосон байна." />
          ) : (
            <EmptyState title="Олдсонгүй" text="Өөр үгээр хайж эсвэл шүүлтүүрээ цуцлаад үзээрэй." />
          )
        }
      />
    </div>
  );
}

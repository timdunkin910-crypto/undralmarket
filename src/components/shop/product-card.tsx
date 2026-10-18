"use client";

import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { useCart } from "@/lib/cart";
import { mnt } from "@/lib/format";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ProductImage } from "./product-image";

export function ProductCard({ product: p, emoji, canOrder }: { product: Product; emoji?: string; canOrder: boolean }) {
  const { qtyOf, add, setQty } = useCart();
  const qty = qtyOf(p.id);
  const onSale = p.old_price != null && p.old_price > p.price;

  return (
    <article
      className={cn("relative flex w-full min-w-0 flex-col rounded-2xl border bg-white p-2 pb-2.5", p.sold_out && "opacity-70")}
      aria-label={p.name}
    >
      <Link href={`/product/${p.id}`} className="block rounded-xl">
        <ProductImage src={p.image_url} alt={p.name} emoji={emoji} className={cn(p.sold_out && "grayscale")} />
        <span className="mt-2 line-clamp-2 min-h-[2.6em] text-[15px] leading-tight font-medium">{p.name}</span>
      </Link>
      <div className="pointer-events-none absolute top-3.5 left-3.5 flex flex-col items-start gap-1">
        {p.sold_out ? (
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-muted-foreground ring-1 ring-border">Дууссан</span>
        ) : (
          <>
            {onSale && (
              <span className="rounded-full bg-lime px-2 py-0.5 text-xs font-bold text-forest">
                −{Math.round((1 - p.price / p.old_price!) * 100)}%
              </span>
            )}
            {p.fresh_today && <span className="rounded-full bg-mint px-2 py-0.5 text-xs font-semibold text-forest">Шинэ</span>}
          </>
        )}
      </div>
      <span className="text-[13px] text-muted-foreground">{p.unit}</span>
      <div className="mt-auto flex items-end justify-between gap-1 pt-2">
        <div className="min-w-0">
          {onSale && <s className="tabular block text-xs text-muted-foreground">{mnt(p.old_price!)}</s>}
          <span className="tabular block text-[17px] leading-tight font-bold">{mnt(p.price)}</span>
        </div>
        {!p.sold_out && canOrder && qty === 0 && (
          <button
            type="button"
            onClick={() => add({ id: p.id, name: p.name, unit: p.unit, price: p.price, image_url: p.image_url })}
            aria-label={`${p.name} сагсанд нэмэх`}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-strong text-white hover:bg-forest"
          >
            <Plus className="size-5" aria-hidden />
          </button>
        )}
      </div>
      {!p.sold_out && canOrder && qty > 0 && (
        <div
          className="mt-2 flex h-11 w-full items-center justify-between rounded-full bg-brand-strong text-white"
          role="group"
          aria-label={`${p.name} — сагсанд ${qty}`}
        >
          <button type="button" onClick={() => setQty(p.id, qty - 1)} aria-label="Нэгийг хасах" className="grid size-11 place-items-center rounded-full hover:bg-forest">
            <Minus className="size-4" aria-hidden />
          </button>
          <span className="tabular text-sm font-bold" aria-live="polite">{qty}</span>
          <button type="button" onClick={() => setQty(p.id, qty + 1)} aria-label="Нэгийг нэмэх" className="grid size-11 place-items-center rounded-full hover:bg-forest">
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </article>
  );
}

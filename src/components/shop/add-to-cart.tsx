"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, ShoppingBasket } from "lucide-react";
import { useCart } from "@/lib/cart";
import { mnt } from "@/lib/format";
import type { Product } from "@/lib/types";
import { QtyStepper } from "./qty-stepper";

export function AddToCart({ product: p, canOrder, signedIn }: { product: Product; canOrder: boolean; signedIn: boolean }) {
  const { add, qtyOf } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const inCart = qtyOf(p.id);

  if (p.sold_out) {
    return <p className="rounded-xl bg-zinc-100 p-4 font-medium text-zinc-700">Энэ бараа одоогоор дууссан байна.</p>;
  }
  if (!canOrder) {
    return (
      <div className="rounded-xl bg-mint-soft p-4 text-sm">
        {signedIn ? (
          "Бүртгэл баталгаажсаны дараа захиалах боломжтой."
        ) : (
          <>
            Захиалахын тулд{" "}
            <Link href="/signup" className="font-semibold text-brand-strong underline">бүртгүүлэх</Link> эсвэл{" "}
            <Link href="/login" className="font-semibold text-brand-strong underline">нэвтрэх</Link> хэрэгтэй.
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-3">
      <div className="flex gap-3">
        <QtyStepper value={qty} onChange={(n) => setQty(Math.max(1, n))} min={1} name={p.name} size="lg" />
        <button
          type="button"
          onClick={() => {
            add({ id: p.id, name: p.name, unit: p.unit, price: p.price, image_url: p.image_url }, qty);
            setAdded(true);
            setQty(1);
            setTimeout(() => setAdded(false), 1800);
          }}
          className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-strong px-4 text-base font-semibold text-white hover:bg-forest"
        >
          {added ? <Check className="size-5" aria-hidden /> : <ShoppingBasket className="size-5" aria-hidden />}
          {added ? "Нэмэгдлээ" : `Сагсанд нэмэх · ${mnt(p.price * qty)}`}
        </button>
      </div>
      <p role="status" className="text-sm text-muted-foreground">
        {inCart > 0 && (
          <>
            Сагсанд {inCart} ширхэг байна ·{" "}
            <Link href="/cart" className="font-semibold text-brand-strong">Сагс руу очих</Link>
          </>
        )}
      </p>
    </div>
  );
}

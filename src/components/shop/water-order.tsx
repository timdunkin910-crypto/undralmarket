"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { mnt } from "@/lib/format";
import type { Product } from "@/lib/types";
import { QtyStepper } from "./qty-stepper";

export function WaterOrder({ product: p, canOrder, signedIn }: { product: Product; canOrder: boolean; signedIn: boolean }) {
  const { add, qtyOf } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);

  if (p.sold_out) return <p className="rounded-xl bg-zinc-100 p-4 font-medium text-zinc-700">19 л ус түр дууссан байна.</p>;

  return (
    <div className="flex flex-col gap-4 rounded-3xl border p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-lg font-bold">{p.name}</p>
          <p className="tabular text-muted-foreground">{mnt(p.price)} / сав</p>
        </div>
        <QtyStepper value={qty} onChange={(n) => setQty(Math.max(1, Math.min(10, n)))} min={1} name={p.name} size="lg" />
      </div>
      <p className="rounded-xl bg-mint-soft p-3 text-sm">♻️ Хоосон савны тоог дараагийн алхамд сонгоно — ажилтан авч явна.</p>
      {canOrder ? (
        <button
          type="button"
          onClick={() => {
            const missing = qty - qtyOf(p.id);
            if (missing > 0) add({ id: p.id, name: p.name, unit: p.unit, price: p.price, image_url: p.image_url }, missing);
            router.push("/checkout");
          }}
          className="h-14 rounded-xl bg-brand-strong text-base font-semibold text-white hover:bg-forest"
        >
          Үргэлжлүүлэх · {mnt(p.price * qty)}
        </button>
      ) : (
        <p className="text-sm">
          {signedIn ? (
            "Бүртгэл баталгаажсаны дараа захиалах боломжтой."
          ) : (
            <Link href="/login?next=/water" className="font-semibold text-brand-strong underline">Захиалахын тулд нэвтэрнэ үү</Link>
          )}
        </p>
      )}
    </div>
  );
}

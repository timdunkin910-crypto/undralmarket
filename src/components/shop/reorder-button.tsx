"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/client";
import { useCart } from "@/lib/cart";
import type { OrderItem, Product } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Puts the items of a past order back into the cart at today's prices (sold-out items skipped). */
export function ReorderButton({ items, className, label = "Дахин захиалах" }: { items: OrderItem[]; className?: string; label?: string }) {
  const { add } = useCart();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function reorder() {
    const sb = getBrowserClient();
    const ids = items.map((i) => i.product_id).filter((x): x is string => !!x);
    if (!sb || ids.length === 0) return;
    setBusy(true);
    const { data } = await sb.from("products").select("*").in("id", ids).eq("active", true);
    const fresh = new Map(((data as Product[]) ?? []).map((p) => [p.id, p]));
    let skipped = 0;
    for (const it of items) {
      const p = it.product_id ? fresh.get(it.product_id) : undefined;
      if (!p || p.sold_out) {
        skipped++;
        continue;
      }
      add({ id: p.id, name: p.name, unit: p.unit, price: p.price, image_url: p.image_url }, it.qty);
    }
    setBusy(false);
    if (skipped === items.length) {
      setMsg("Эдгээр бараа одоогоор дууссан байна.");
      return;
    }
    router.push(skipped ? "/cart?skipped=" + skipped : "/cart");
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={reorder}
        disabled={busy}
        className={cn(
          "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-strong px-4 font-semibold text-white hover:bg-forest disabled:opacity-60",
          className,
        )}
      >
        <RotateCcw className="size-4" aria-hidden />
        {busy ? "Түр хүлээнэ үү…" : label}
      </button>
      {msg && <p role="status" className="text-sm text-muted-foreground">{msg}</p>}
    </div>
  );
}

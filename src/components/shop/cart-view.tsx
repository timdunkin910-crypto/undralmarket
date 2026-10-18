"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ShoppingBasket, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart";
import { mnt } from "@/lib/format";
import { getBrowserClient } from "@/lib/supabase/client";
import type { Product, ResidentStatus } from "@/lib/types";
import { QtyStepper } from "./qty-stepper";
import { ProductImage } from "./product-image";
import { EmptyState } from "./empty-state";

export function CartView({ minOrder, status, skipped }: { minOrder: number; status: ResidentStatus | null; skipped: number }) {
  const cart = useCart();
  const [soldOut, setSoldOut] = useState<Set<string>>(new Set());
  const [changed, setChanged] = useState(false);

  // Refresh prices/stock from the database once — the cart in localStorage may be stale.
  const { ready, sync, lines } = cart;
  const synced = useRef(false);
  useEffect(() => {
    const sb = getBrowserClient();
    if (!ready || synced.current || !sb || lines.length === 0) return;
    synced.current = true;
    const ids = lines.map((l) => l.id);
    sb.from("products")
      .select("*")
      .in("id", ids)
      .eq("active", true)
      .then(({ data }) => {
        const fresh = (data as Product[]) ?? [];
        setSoldOut(new Set(fresh.filter((p) => p.sold_out).map((p) => p.id)));
        setChanged(fresh.length < ids.length);
        sync(fresh);
      });
  }, [ready, lines, sync]);

  if (!cart.ready) return <div className="h-40 animate-pulse rounded-2xl bg-mint-soft" aria-label="Ачаалж байна" />;

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Сагс</h1>
        <EmptyState
          icon={<ShoppingBasket className="size-7" aria-hidden />}
          title="Сагс хоосон байна"
          text="Талх, сүү гэх мэт өдөр тутмын бараагаа сонгоорой."
          action={{ href: "/categories", label: "Бараа үзэх" }}
        />
      </div>
    );
  }

  const available = cart.lines.filter((l) => !soldOut.has(l.id));
  const total = available.reduce((s, l) => s + l.price * l.qty, 0);
  const short = Math.max(0, minOrder - total);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-bold">Сагс</h1>

      {(skipped > 0 || changed) && (
        <p role="status" className="rounded-xl bg-mint p-3 text-sm text-forest">
          Зарим бараа дууссан эсвэл хасагдсан тул сагснаас хасагдлаа.
        </p>
      )}

      <ul className="divide-y rounded-2xl border bg-white">
        {cart.lines.map((l) => {
          const out = soldOut.has(l.id);
          return (
            <li key={l.id} className="flex gap-3 p-3">
              <Link href={`/product/${l.id}`} className="w-16 shrink-0">
                <ProductImage src={l.image_url} alt={l.name} sizes="64px" className={out ? "grayscale" : ""} />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex justify-between gap-2">
                  <p className="min-w-0 leading-tight font-medium">
                    {l.name}
                    <span className="block text-sm font-normal text-muted-foreground">
                      {l.unit} · {mnt(l.price)}
                    </span>
                  </p>
                  <span className="tabular shrink-0 font-bold">{mnt(l.price * l.qty)}</span>
                </div>
                {out ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-muted-foreground">Дууссан — захиалгад орохгүй</span>
                    <button type="button" onClick={() => cart.setQty(l.id, 0)} className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground">
                      <Trash2 className="size-4" aria-hidden /> Хасах
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <QtyStepper value={l.qty} onChange={(n) => cart.setQty(l.id, n)} name={l.name} />
                    <button
                      type="button"
                      onClick={() => cart.setQty(l.id, 0)}
                      className="grid size-11 place-items-center rounded-xl text-muted-foreground hover:bg-mint-soft"
                      aria-label={`${l.name} сагснаас хасах`}
                    >
                      <Trash2 className="size-5" aria-hidden />
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="note" className="text-sm font-semibold">Ажилтанд үлдээх тэмдэглэл</label>
        <textarea
          id="note"
          maxLength={300}
          rows={2}
          value={cart.note}
          onChange={(e) => cart.setNote(e.target.value)}
          placeholder="Жишээ нь: Хаалганы хонх эвдэрсэн, утсаар залгаарай"
          className="rounded-xl border bg-white p-3 text-base outline-none focus:border-brand focus:ring-3 focus:ring-mint"
        />
      </div>

      <div className="rounded-2xl bg-mint-soft p-4">
        {short > 0 && (
          <div className="mb-3">
            <p className="text-sm font-medium">
              Доод хэмжээ {mnt(minOrder)} — дахиад <b className="tabular">{mnt(short)}</b>-ийн бараа нэмээрэй
            </p>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-white"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={minOrder}
              aria-valuenow={total}
              aria-label="Доод хэмжээнд хүрэх"
            >
              <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, (total / minOrder) * 100)}%` }} />
            </div>
          </div>
        )}
        <div className="flex items-center justify-between text-lg font-bold">
          <span>Нийт</span>
          <span className="tabular">{mnt(total)}</span>
        </div>
        <p className="text-sm text-muted-foreground">Хүргэлт үнэгүй</p>
      </div>

      {/* Sticky action above the tab bar on phones */}
      <div className="pb-safe fixed inset-x-0 bottom-16 z-30 border-t bg-white p-3 md:static md:border-0 md:bg-transparent md:p-0">
        {status === "approved" ? (
          short > 0 || available.length === 0 ? (
            <button disabled className="h-14 w-full rounded-xl bg-brand-strong text-base font-semibold text-white opacity-50">
              Захиалах · {mnt(total)}
            </button>
          ) : (
            <Link
              href="/checkout"
              className="flex h-14 w-full items-center justify-center rounded-xl bg-brand-strong text-base font-semibold text-white hover:bg-forest"
            >
              Захиалах · {mnt(total)}
            </Link>
          )
        ) : status ? (
          <p className="rounded-xl bg-mint p-3 text-center text-sm font-medium text-forest">
            Бүртгэл баталгаажсаны дараа захиалах боломжтой.
          </p>
        ) : (
          <Link href="/login?next=/cart" className="flex h-14 w-full items-center justify-center rounded-xl bg-brand-strong text-base font-semibold text-white">
            Захиалахын тулд нэвтрэх
          </Link>
        )}
      </div>
      <div className="h-20 md:hidden" aria-hidden />
    </div>
  );
}

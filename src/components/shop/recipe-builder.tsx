"use client";

import Link from "next/link";
import { useState } from "react";
import { Minus, Plus, ShoppingBasket } from "lucide-react";
import { mnt } from "@/lib/format";
import { itemState, ITEM_STATE_LABEL, picksTotal, scaledQty } from "@/lib/recipes";
import type { Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAddBundle } from "./recipe-card";
import { useToast } from "./toast";

const SERVINGS = [2, 4, 6];

/** Recipe page: servings stepper, tick-off ingredient checklist and "Сонгосон орцыг сагслах". */
export function RecipeBuilder({ recipe, minOrder, canOrder, signedIn }: { recipe: Recipe; minOrder: number; canOrder: boolean; signedIn: boolean }) {
  // Start from the step closest to the recipe's own servings (ties round up)
  const [servings, setServings] = useState(() =>
    SERVINGS.reduce((best, s) => (Math.abs(s - recipe.servings) <= Math.abs(best - recipe.servings) ? s : best)),
  );
  // Everything required and in stock starts ticked; optional extras start unticked
  const [checked, setChecked] = useState(
    () => new Set(recipe.items.filter((i) => !i.optional && itemState(i) === "ok").map((i) => i.id)),
  );
  const [toast, show] = useToast("bottom-40 md:bottom-6");
  const addBundle = useAddBundle(minOrder, show);

  const factor = servings / recipe.servings;
  const rows = recipe.items.map((item) => ({ item, state: itemState(item), qty: scaledQty(item.qty, factor) }));
  const picks = rows.filter((r) => r.state === "ok" && checked.has(r.item.id)).map((r) => ({ product: r.item.product!, qty: r.qty }));
  const soldOut = rows.filter((r) => r.state === "sold_out" && !r.item.optional).length;
  const total = picksTotal(picks);
  const step = SERVINGS.indexOf(servings);

  function toggle(id: number) {
    setChecked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section aria-labelledby="ingredients" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="ingredients" className="text-xl font-bold">Орц</h2>
        <div role="group" aria-label="Хэдэн хүнд" className="inline-flex h-11 items-center rounded-xl border bg-white">
          <button
            type="button"
            onClick={() => setServings(SERVINGS[step - 1])}
            disabled={step === 0}
            aria-label="Цөөн хүнд"
            className="grid h-full w-11 place-items-center rounded-l-xl text-forest hover:bg-mint-soft disabled:opacity-40"
          >
            <Minus className="size-5" aria-hidden />
          </button>
          <output className="tabular min-w-16 text-center font-semibold" aria-live="polite">
            {servings} хүн
          </output>
          <button
            type="button"
            onClick={() => setServings(SERVINGS[step + 1])}
            disabled={step === SERVINGS.length - 1}
            aria-label="Олон хүнд"
            className="grid h-full w-11 place-items-center rounded-r-xl text-forest hover:bg-mint-soft disabled:opacity-40"
          >
            <Plus className="size-5" aria-hidden />
          </button>
        </div>
      </div>
      <p className="-mt-2 text-sm text-muted-foreground">
        Гэртээ байгаа орцынхоо сонголтыг арилгаарай.
        {servings !== recipe.servings && ` Хэмжээ нь ${recipe.servings} хүнд зориулагдсан.`}
      </p>

      <ul className="flex flex-col divide-y rounded-2xl border bg-white">
        {rows.map(({ item, state, qty }) => {
          const p = item.product;
          const off = state !== "ok";
          return (
            <li key={item.id}>
              <label className={cn("flex min-h-14 items-center gap-3 px-3 py-2.5", off ? "opacity-50" : "cursor-pointer hover:bg-mint-soft")}>
                <input
                  type="checkbox"
                  checked={checked.has(item.id)}
                  disabled={off}
                  onChange={() => toggle(item.id)}
                  className="size-5 shrink-0 accent-brand-strong"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">
                    {item.label}
                    {item.optional && <span className="text-sm font-normal text-muted-foreground"> · нэмэлт</span>}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {/* "Гурил 2кг" already carries its unit — don't print "2кг" twice */}
                    {[item.amount, p && !off && `${p.name.includes(p.unit) ? p.name : `${p.name} ${p.unit}`}${qty > 1 ? ` × ${qty}` : ""}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <span className="tabular shrink-0 text-right font-semibold">{off ? ITEM_STATE_LABEL[state] : mnt(p!.price * qty)}</span>
              </label>
            </li>
          );
        })}
      </ul>

      <p className="flex items-center justify-between rounded-2xl bg-mint-soft px-4 py-3 font-bold">
        <span>Сонгосон орц ({picks.length})</span>
        <span className="tabular text-lg">{mnt(total)}</span>
      </p>

      <div className="pb-safe fixed inset-x-0 bottom-16 z-30 border-t bg-white p-3 md:static md:border-0 md:p-0">
        {canOrder ? (
          <button
            type="button"
            onClick={() => addBundle(recipe.name, picks, soldOut)}
            disabled={picks.length === 0}
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand-strong px-4 text-base font-semibold text-white enabled:hover:bg-forest disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
          >
            <ShoppingBasket className="size-5" aria-hidden />
            {picks.length === 0 ? "Орц сонгоогүй байна" : `Сонгосон орцыг сагслах · ${mnt(total)}`}
          </button>
        ) : signedIn ? (
          <p className="rounded-xl bg-mint p-3 text-center text-sm font-medium text-forest">Бүртгэл баталгаажсаны дараа сагслах боломжтой.</p>
        ) : (
          <Link
            href={`/login?next=${encodeURIComponent(`/recipes/${recipe.slug}`)}`}
            className="flex h-14 w-full items-center justify-center rounded-xl bg-brand-strong text-base font-semibold text-white"
          >
            Сагслахын тулд нэвтрэх
          </Link>
        )}
      </div>
      {toast}
    </section>
  );
}

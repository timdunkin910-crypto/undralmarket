"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback } from "react";
import { Clock, ShoppingBasket, Users } from "lucide-react";
import { useCart } from "@/lib/cart";
import { mnt } from "@/lib/format";
import { bundlePicks, itemState, ITEM_STATE_LABEL, picksTotal, type BundlePick } from "@/lib/recipes";
import type { Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Adds picked ingredients at their current prices and reports it (incl. sold-out skips and the minimum order). */
export function useAddBundle(minOrder: number, show: (text: string) => void) {
  const cart = useCart();
  return useCallback(
    (recipeName: string, picks: BundlePick[], soldOut: number) => {
      if (picks.length === 0) {
        show(soldOut > 0 ? `${recipeName}: орцууд дууссан байна` : "Сагслах орц сонгоогүй байна");
        return;
      }
      for (const { product: p, qty } of picks) {
        cart.add({ id: p.id, name: p.name, unit: p.unit, price: p.price, image_url: p.image_url }, qty);
      }
      const short = minOrder - (cart.total + picksTotal(picks));
      show(
        [
          `${recipeName}: ${picks.length} орц сагсанд нэмэгдлээ`,
          soldOut > 0 && `${soldOut} орц дууссан тул нэмэгдсэнгүй`,
          short > 0 && `доод хэмжээнд ${mnt(short)} дутуу`,
        ]
          .filter(Boolean)
          .join(" · "),
      );
    },
    [cart, minOrder, show],
  );
}

export function RecipeChips({ recipe: r, className }: { recipe: Recipe; className?: string }) {
  const chip = "inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-forest";
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      <span className={chip}>
        <Clock className="size-3.5" aria-hidden /> {r.time_min} мин
      </span>
      <span className={chip}>
        <Users className="size-3.5" aria-hidden /> {r.servings} хүн
      </span>
    </div>
  );
}

/** Recipe photo, or its emoji on mint. */
export function RecipeArt({ recipe: r, sizes, priority, emojiClass }: { recipe: Recipe; sizes: string; priority?: boolean; emojiClass: string }) {
  return r.image_url ? (
    <Image src={r.image_url} alt="" fill sizes={sizes} priority={priority} className="object-cover" />
  ) : (
    <span className={cn("leading-none", emojiClass)} aria-hidden>
      {r.emoji}
    </span>
  );
}

export function RecipeCard({
  recipe: r,
  canOrder,
  signedIn,
  onAdd,
}: {
  recipe: Recipe;
  canOrder: boolean;
  signedIn: boolean;
  onAdd: (recipe: Recipe) => void;
}) {
  const { picks } = bundlePicks(r);
  const href = `/recipes/${r.slug}`;

  return (
    <article className="flex h-full w-full min-w-0 flex-col overflow-hidden rounded-[20px] border bg-white">
      <Link href={href} tabIndex={-1} aria-hidden className="relative grid h-40 place-items-center overflow-hidden bg-mint-soft">
        <RecipeArt recipe={r} sizes="(max-width: 768px) 85vw, 400px" emojiClass="text-[84px]" />
        <RecipeChips recipe={r} className="absolute bottom-3 left-3.5" />
      </Link>
      <div className="flex flex-1 flex-col gap-3 px-4 pt-4 pb-5 sm:px-5">
        <h3 className="text-xl leading-tight font-bold">
          <Link href={href} className="hover:text-brand-strong">{r.name}</Link>
        </h3>
        <ul className="flex flex-col text-sm" aria-label={`${r.name} — орц`}>
          {r.items.map((item) => {
            const state = itemState(item);
            return (
              <li key={item.id} className={cn("flex justify-between gap-3 border-b border-dashed py-1.5", state !== "ok" && "opacity-50")}>
                <span className="min-w-0 truncate">
                  {item.product?.name ?? item.label}
                  {item.optional && <span className="text-muted-foreground"> · нэмэлт</span>}
                </span>
                <span className="tabular shrink-0 whitespace-nowrap">
                  {state === "ok" ? `${item.qty > 1 ? `${item.qty} × ` : ""}${mnt(item.product!.price * item.qty)}` : ITEM_STATE_LABEL[state]}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-1.5">
          <div>
            <span className="block text-xs text-muted-foreground">Багцын үнэ</span>
            <b className="tabular text-lg">{mnt(picksTotal(picks))}</b>
          </div>
          {canOrder ? (
            <button
              type="button"
              onClick={() => onAdd(r)}
              disabled={picks.length === 0}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-strong px-4 font-semibold text-white enabled:hover:bg-forest disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600"
            >
              <ShoppingBasket className="size-5" aria-hidden /> Багцаар сагслах
            </button>
          ) : signedIn ? (
            <span className="text-sm text-muted-foreground">Бүртгэл баталгаажсаны дараа сагсална</span>
          ) : (
            <Link href={`/login?next=${encodeURIComponent(href)}`} className="inline-flex h-11 items-center rounded-xl border px-4 font-semibold text-brand-strong">
              Нэвтэрч сагслах
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

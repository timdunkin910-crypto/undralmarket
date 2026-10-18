// Recipe bundle rules shared by the home cards, the recipe page and the admin.
import type { Product, Recipe, RecipeItem } from "./types";

/** "missing" = not sold here (no linked product, or the shop hid it); "sold_out" = linked but out of stock. */
export type ItemState = "ok" | "sold_out" | "missing";

export function itemState(item: RecipeItem): ItemState {
  if (!item.product) return "missing";
  return item.product.sold_out ? "sold_out" : "ok";
}

export const ITEM_STATE_LABEL: Record<Exclude<ItemState, "ok">, string> = {
  sold_out: "Дууссан",
  missing: "Дэлгүүрт байхгүй",
};

/** Product units for a different number of servings — never less than one pack. */
export function scaledQty(qty: number, factor: number) {
  return Math.max(1, Math.round(qty * factor));
}

export type BundlePick = { product: Product; qty: number };

/** What "Багцаар сагслах" adds: every required ingredient that is in stock. */
export function bundlePicks(recipe: Recipe) {
  const picks: BundlePick[] = [];
  let soldOut = 0;
  for (const item of recipe.items) {
    if (item.optional) continue;
    const state = itemState(item);
    if (state === "ok") picks.push({ product: item.product!, qty: item.qty });
    else if (state === "sold_out") soldOut++;
  }
  return { picks, soldOut };
}

export function picksTotal(picks: BundlePick[]) {
  return picks.reduce((s, p) => s + p.product.price * p.qty, 0);
}

export type RecipeFilter = { id: string; label: string; test: (r: Recipe) => boolean };

export const RECIPE_FILTERS: RecipeFilter[] = [
  { id: "all", label: "Бүгд", test: () => true },
  { id: "national", label: "Үндэсний хоол", test: (r) => r.category === "Үндэсний хоол" },
  { id: "soup", label: "Шөл", test: (r) => r.category === "Шөл" },
  { id: "stirfry", label: "Хуурга", test: (r) => r.category === "Хуурга" },
  { id: "breakfast", label: "Өглөөний цай", test: (r) => r.category === "Өглөөний цай" },
  { id: "quick", label: "30 минутаас бага", test: (r) => r.time_min < 30 },
  { id: "kids", label: "Хүүхдэд", test: (r) => r.for_kids },
];

/** Same category first, then the rest, in the shop's order. */
export function similarRecipes(all: Recipe[], recipe: Recipe, limit = 8) {
  const others = all.filter((r) => r.id !== recipe.id);
  return [...others.filter((r) => r.category === recipe.category), ...others.filter((r) => r.category !== recipe.category)].slice(0, limit);
}

const LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z", и: "i", й: "i", к: "k", л: "l", м: "m",
  н: "n", о: "o", ө: "u", п: "p", р: "r", с: "s", т: "t", у: "u", ү: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh",
  щ: "sh", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

/** "Хайрсан гоймон" → "khairsan-goimon" for the recipe URL. */
export function slugify(name: string) {
  return [...name.toLowerCase()]
    .map((c) => LATIN[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

import "server-only";
import { cache } from "react";
import { createClient, supabaseConfigured } from "./supabase/server";
import { DEMO_CATEGORIES, DEMO_PRODUCTS } from "./demo-data";
import type { Category, Order, Product, Recipe, Resident, Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  building_name: "Манай байр",
  district: "Улаанбаатар",
  entrances: 4,
  floors: 16,
  apts_per_floor: 4,
  open_time: "08:00:00",
  close_time: "23:00:00",
  min_order: 5000,
  delivery_enabled: true,
  shop_phone: "9997-7961",
  bank_name: "Хаан банк",
  bank_account: "5302289287",
  bank_holder: "О.Цолмонбаяр",
};

export const getSettings = cache(async (): Promise<Settings> => {
  if (!supabaseConfigured) return DEFAULT_SETTINGS;
  const sb = await createClient();
  const { data } = await sb.from("public_settings").select("*").maybeSingle();
  return (data as Settings) ?? DEFAULT_SETTINGS;
});

export const getCategories = cache(async (): Promise<Category[]> => {
  if (!supabaseConfigured) return DEMO_CATEGORIES;
  const sb = await createClient();
  const { data } = await sb.from("categories").select("*").order("sort");
  return (data as Category[]) ?? [];
});

export type ProductQuery = {
  categoryId?: number;
  q?: string;
  sale?: boolean;
  mongolian?: boolean;
  fresh?: boolean;
  ids?: string[];
  limit?: number;
};

/** Same filters as the Supabase query, applied to the demo catalog. */
function demoProducts(opts: ProductQuery): Product[] {
  const q = opts.q?.toLowerCase();
  const list = DEMO_PRODUCTS.filter(
    (p) =>
      (!opts.categoryId || p.category_id === opts.categoryId) &&
      (!q || p.name.toLowerCase().includes(q)) &&
      (!opts.sale || p.is_deal || p.old_price != null) &&
      (!opts.mongolian || p.is_mongolian) &&
      (!opts.fresh || p.fresh_today) &&
      (!opts.ids || opts.ids.includes(p.id)),
  ).sort((a, b) => (a.category_id ?? 0) - (b.category_id ?? 0) || a.sort - b.sort);
  return opts.limit ? list.slice(0, opts.limit) : list;
}

export async function getProducts(opts: ProductQuery = {}): Promise<Product[]> {
  if (!supabaseConfigured) return demoProducts(opts);
  const sb = await createClient();
  let query = sb.from("products").select("*").eq("active", true);
  if (opts.categoryId) query = query.eq("category_id", opts.categoryId);
  if (opts.q) query = query.ilike("name", `%${opts.q.replace(/[%_,()]/g, " ")}%`);
  if (opts.sale) query = query.or("is_deal.eq.true,old_price.not.is.null");
  if (opts.mongolian) query = query.eq("is_mongolian", true);
  if (opts.fresh) query = query.eq("fresh_today", true);
  if (opts.ids) query = query.in("id", opts.ids.length ? opts.ids : ["00000000-0000-0000-0000-000000000000"]);
  // In-stock first, then owner's ordering
  query = query.order("sold_out").order("sort").order("name");
  if (opts.limit) query = query.limit(opts.limit);
  const { data } = await query;
  return (data as Product[]) ?? [];
}

export async function getProduct(id: string): Promise<Product | null> {
  if (!supabaseConfigured) return DEMO_PRODUCTS.find((p) => p.id === id) ?? null;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const sb = await createClient();
  const { data } = await sb.from("products").select("*").eq("id", id).eq("active", true).maybeSingle();
  return (data as Product) ?? null;
}

export const RECIPE_SELECT = "*, items:recipe_items(*, product:products(*))";

/** Ingredient order isn't guaranteed by the embed, so sort it here. */
export function sortRecipeItems(recipes: Recipe[]) {
  for (const r of recipes) r.items.sort((a, b) => a.sort - b.sort);
  return recipes;
}

/** Active recipes with each ingredient's live product (price, stock). */
export const getRecipes = cache(async (): Promise<Recipe[]> => {
  if (!supabaseConfigured) return [];
  const sb = await createClient();
  const { data } = await sb.from("recipes").select(RECIPE_SELECT).eq("active", true).order("sort").order("name");
  return sortRecipeItems((data as Recipe[]) ?? []);
});

export async function getRecipe(slug: string): Promise<Recipe | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  return (await getRecipes()).find((r) => r.slug === slug) ?? null;
}

/** The signed-in resident with their apartment, or null. */
export const getMe = cache(async (): Promise<Resident | null> => {
  if (!supabaseConfigured) return null;
  const sb = await createClient();
  const { data: claims } = await sb.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return null;
  const { data } = await sb
    .from("residents")
    .select("*, apartment:apartments(*)")
    .eq("id", uid)
    .maybeSingle();
  return (data as Resident) ?? null;
});

export async function getTabBalance(apartmentId: string): Promise<number> {
  const sb = await createClient();
  const { data } = await sb.from("apartment_balances").select("balance").eq("apartment_id", apartmentId).maybeSingle();
  return data?.balance ?? 0;
}

/** Orders for the resident's apartment (RLS restricts to their own apartment). */
export async function getMyOrders(limit = 20): Promise<Order[]> {
  const sb = await createClient();
  const { data } = await sb
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as Order[]) ?? [];
}

/** "Байнга авдаг": products this apartment buys most, from the last 30 orders. */
export async function getUsualProducts(): Promise<{ products: Product[]; lastOrder: Order | null }> {
  const orders = await getMyOrders(30);
  const counts = new Map<string, number>();
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    for (const it of o.order_items ?? []) {
      if (it.product_id) counts.set(it.product_id, (counts.get(it.product_id) ?? 0) + it.qty);
    }
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => id);
  const products = top.length ? await getProducts({ ids: top }) : [];
  products.sort((a, b) => top.indexOf(a.id) - top.indexOf(b.id));
  const lastOrder = orders.find((o) => o.status !== "cancelled") ?? null;
  return { products, lastOrder };
}

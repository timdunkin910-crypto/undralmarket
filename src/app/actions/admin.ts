"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMe, RECIPE_SELECT, sortRecipeItems } from "@/lib/data";
import { apartmentResidentIds, sendPush } from "@/lib/push";
import { slugify } from "@/lib/recipes";
import { RECIPE_CATEGORIES, RECIPE_DIFFICULTIES } from "@/lib/types";
import type { OrderStatus, Product, Recipe, RecipeDifficulty, ResidentStatus, Role } from "@/lib/types";

type Result = { ok: true } | { error: string };

async function staff() {
  const me = await getMe();
  if (!me || me.status !== "approved" || (me.role !== "staff" && me.role !== "owner")) throw new Error("FORBIDDEN");
  return me;
}
async function owner() {
  const me = await staff();
  if (me.role !== "owner") throw new Error("FORBIDDEN");
  return me;
}
const fail = (e: unknown): Result => ({
  error: e instanceof Error && e.message === "FORBIDDEN" ? "Эрх хүрэхгүй байна." : "Хадгалж чадсангүй. Дахин оролдоно уу.",
});

const PUSH_TEXT: Partial<Record<OrderStatus, (id: number, staff: string) => { title: string; body: string }>> = {
  preparing: (id) => ({ title: "Захиалга хүлээн авлаа", body: `#${id} захиалгыг бэлтгэж байна.` }),
  delivering: (id, s) => ({ title: "Хүргэлтэнд гарлаа", body: `${s} таны #${id} захиалгыг авчирч байна.` }),
  delivered: (id) => ({ title: "Хүргэгдлээ", body: `#${id} захиалга хүргэгдлээ. Баярлалаа!` }),
  cancelled: (id) => ({ title: "Захиалга цуцлагдлаа", body: `#${id} захиалгыг дэлгүүр цуцаллаа. Асуух зүйл байвал залгаарай.` }),
};

export async function setOrderStatus(id: number, status: OrderStatus): Promise<Result> {
  try {
    const me = await staff();
    const sb = await createClient();
    const { data, error } = await sb
      .from("orders")
      .update({ status, staff_name: me.name })
      .eq("id", id)
      .select("apartment_id, fulfilment")
      .single();
    if (error) throw error;
    const text = PUSH_TEXT[status];
    // Pickup orders: "delivering" means ready at the counter
    const msg =
      data.fulfilment === "pickup" && status === "delivering"
        ? { title: "Захиалга бэлэн боллоо", body: `#${id} захиалгаа лангуунаас аваарай.` }
        : text?.(id, me.name);
    if (msg) {
      after(async () => sendPush(await apartmentResidentIds(data.apartment_id), { ...msg, url: `/orders/${id}`, tag: `order-${id}` }));
    }
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setOrderPaid(id: number, paid: boolean): Promise<Result> {
  try {
    await staff();
    const sb = await createClient();
    const { error } = await sb.from("orders").update({ paid }).eq("id", id);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ───────── Products ─────────
export type ProductInput = {
  id?: string;
  name: string;
  unit: string;
  price: number;
  old_price: number | null;
  category_id: number | null;
  image_url: string | null;
  is_mongolian: boolean;
  is_deal: boolean;
  fresh_today: boolean;
  sold_out: boolean;
  active: boolean;
};

export async function saveProduct(input: ProductInput): Promise<{ product: Product } | { error: string }> {
  try {
    await staff();
    const name = input.name.trim();
    if (!name) return { error: "Нэр оруулна уу." };
    if (!Number.isInteger(input.price) || input.price < 0) return { error: "Үнэ буруу байна." };
    if (input.old_price != null && input.old_price <= input.price) return { error: "Хуучин үнэ одоогийн үнээс их байх ёстой." };
    const sb = await createClient();
    const row = {
      name,
      unit: input.unit.trim() || "1ш",
      price: input.price,
      old_price: input.old_price,
      category_id: input.category_id,
      image_url: input.image_url,
      is_mongolian: input.is_mongolian,
      is_deal: input.is_deal,
      fresh_today: input.fresh_today,
      sold_out: input.sold_out,
      active: input.active,
    };
    const query = input.id ? sb.from("products").update(row).eq("id", input.id) : sb.from("products").insert(row);
    const { data, error } = await query.select().single();
    if (error) throw error;
    revalidatePath("/", "layout");
    return { product: data as Product };
  } catch (e) {
    return fail(e) as { error: string };
  }
}

export async function toggleProduct(id: string, field: "sold_out" | "fresh_today" | "is_deal" | "active", value: boolean): Promise<Result> {
  try {
    await staff();
    const sb = await createClient();
    const { error } = await sb.from("products").update({ [field]: value }).eq("id", id);
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Morning routine: clear yesterday's "fresh today" flags. */
export async function clearFreshToday(): Promise<Result> {
  try {
    await staff();
    const sb = await createClient();
    const { error } = await sb.from("products").update({ fresh_today: false }).eq("fresh_today", true);
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ───────── Recipes ─────────
export type RecipeItemInput = { product_id: string | null; label: string; amount: string; qty: number; optional: boolean };
export type RecipeInput = {
  id?: number;
  slug: string;
  name: string;
  emoji: string;
  image_url: string | null;
  category: string;
  time_min: number;
  servings: number;
  difficulty: RecipeDifficulty;
  for_kids: boolean;
  steps: string[];
  active: boolean;
  items: RecipeItemInput[];
};

export async function saveRecipe(input: RecipeInput): Promise<{ recipe: Recipe } | { error: string }> {
  try {
    await staff();
    const name = input.name.trim();
    if (!name) return { error: "Нэр оруулна уу." };
    const slug = slugify(input.slug.trim() || name);
    if (!slug) return { error: "Холбоос (slug)-д латин үсэг эсвэл тоо оруулна уу." };
    if (!(RECIPE_CATEGORIES as readonly string[]).includes(input.category)) return { error: "Ангилал сонгоно уу." };
    if (!RECIPE_DIFFICULTIES.includes(input.difficulty)) return { error: "Хүндрэл сонгоно уу." };
    if (!Number.isInteger(input.time_min) || input.time_min < 1 || input.time_min > 600) return { error: "Хугацаа 1–600 минут байна." };
    if (!Number.isInteger(input.servings) || input.servings < 1 || input.servings > 20) return { error: "Хүний тоо 1–20 байна." };
    const items = input.items
      .map((i) => ({ ...i, label: i.label.trim(), amount: i.amount.trim() }))
      .filter((i) => i.label || i.product_id);
    if (items.some((i) => !i.label)) return { error: "Орц бүрт нэр оруулна уу." };
    if (items.some((i) => !Number.isInteger(i.qty) || i.qty < 1 || i.qty > 20)) return { error: "Сагслах тоо 1–20 байна." };

    const sb = await createClient();
    const { data: id, error } = await sb.rpc("save_recipe", {
      p: {
        id: input.id ?? null,
        slug,
        name,
        emoji: input.emoji.trim() || "🍲",
        image_url: input.image_url,
        category: input.category,
        time_min: input.time_min,
        servings: input.servings,
        difficulty: input.difficulty,
        for_kids: input.for_kids,
        steps: input.steps.map((s) => s.trim()).filter(Boolean),
        active: input.active,
        items,
      },
    });
    if (error) {
      if (error.code === "23505") return { error: "Ийм холбоостой (slug) жор аль хэдийн байна." };
      throw error;
    }
    const { data, error: readError } = await sb.from("recipes").select(RECIPE_SELECT).eq("id", id).single();
    if (readError) throw readError;
    revalidatePath("/", "layout");
    return { recipe: sortRecipeItems([data as Recipe])[0] };
  } catch (e) {
    return fail(e) as { error: string };
  }
}

export async function toggleRecipe(id: number, active: boolean): Promise<Result> {
  try {
    await staff();
    const sb = await createClient();
    const { error } = await sb.from("recipes").update({ active }).eq("id", id);
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Stores the admin's order as sort = 1..n. */
export async function reorderRecipes(ids: number[]): Promise<Result> {
  try {
    await staff();
    const sb = await createClient();
    const results = await Promise.all(ids.map((id, i) => sb.from("recipes").update({ sort: i + 1 }).eq("id", id)));
    const failed = results.find((r) => r.error);
    if (failed) throw failed.error;
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ───────── Residents & Дэвтэр ─────────
export async function setResidentStatus(id: string, status: ResidentStatus): Promise<Result> {
  try {
    const me = await staff();
    if (id === me.id) return { error: "Өөрийгөө өөрчлөх боломжгүй." };
    const sb = await createClient();
    const { error } = await sb.from("residents").update({ status }).eq("id", id);
    if (error) throw error;
    if (status === "approved") {
      after(() => sendPush([id], { title: "Бүртгэл баталгаажлаа", body: "Одоо захиалга өгөх боломжтой боллоо!", url: "/" }));
    }
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setResidentRole(id: string, role: Role): Promise<Result> {
  try {
    const me = await owner();
    if (id === me.id) return { error: "Өөрийгөө өөрчлөх боломжгүй." };
    const sb = await createClient();
    const { error } = await sb.from("residents").update({ role }).eq("id", id);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setApartmentTab(apartmentId: string, enabled: boolean, limit: number): Promise<Result> {
  try {
    await owner();
    const sb = await createClient();
    const { error } = await sb
      .from("apartments")
      .update({ tab_enabled: enabled, tab_limit: Math.max(0, Math.round(limit)) })
      .eq("id", apartmentId);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function recordTabPayment(apartmentId: string, amount: number, note: string): Promise<Result> {
  try {
    const me = await staff();
    if (!Number.isInteger(amount) || amount <= 0) return { error: "Дүн буруу байна." };
    const sb = await createClient();
    const { error } = await sb.from("tab_entries").insert({
      apartment_id: apartmentId,
      amount: -amount,
      note: note.trim() || "Төлөлт",
      created_by: me.id,
    });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ───────── Settings ─────────
export type SettingsInput = {
  building_name: string;
  district: string;
  entrances: number;
  floors: number;
  apts_per_floor: number;
  open_time: string;
  close_time: string;
  min_order: number;
  shop_phone: string;
  bank_name: string;
  bank_account: string;
  bank_holder: string;
};

export async function saveSettings(input: SettingsInput): Promise<Result> {
  try {
    await owner();
    if (!/^\d{2}:\d{2}$/.test(input.open_time) || !/^\d{2}:\d{2}$/.test(input.close_time)) return { error: "Цагийг ЦЦ:ММ хэлбэрээр оруулна уу." };
    const sb = await createClient();
    const { error } = await sb.from("settings").update(input).eq("id", 1);
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Staff can pause delivery when busy (pickup keeps working). */
export async function setDeliveryEnabled(enabled: boolean): Promise<Result> {
  try {
    await staff();
    const sb = await createClient();
    // settings_owner_write only allows the owner; staff go through the narrow RPC
    const { error } = await sb.rpc("set_delivery_enabled", { p_on: enabled });
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function regenerateInviteCode(): Promise<{ code: string } | { error: string }> {
  try {
    await owner();
    const sb = await createClient();
    const { data, error } = await sb.rpc("regenerate_invite_code");
    if (error) throw error;
    return { code: data as string };
  } catch (e) {
    return fail(e) as { error: string };
  }
}

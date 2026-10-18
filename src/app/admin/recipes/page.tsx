import type { Metadata } from "next";
import { RecipeAdmin } from "@/components/admin/recipe-admin";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { RECIPE_SELECT, sortRecipeItems } from "@/lib/data";
import type { Product, Recipe } from "@/lib/types";

export const metadata: Metadata = { title: "Жор" };

export default async function AdminRecipesPage() {
  await requireStaff("/admin/recipes");
  const sb = await createClient();
  // Staff RLS also returns hidden recipes and products
  const [{ data: recipes }, { data: products }] = await Promise.all([
    sb.from("recipes").select(RECIPE_SELECT).order("sort").order("name"),
    sb.from("products").select("*").order("name"),
  ]);
  return <RecipeAdmin recipes={sortRecipeItems((recipes as Recipe[]) ?? [])} products={(products as Product[]) ?? []} />;
}

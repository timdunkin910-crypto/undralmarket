import type { Metadata } from "next";
import { ProductAdmin } from "@/components/admin/product-admin";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/auth";
import { getCategories } from "@/lib/data";
import type { Product } from "@/lib/types";

export const metadata: Metadata = { title: "Бараа" };

export default async function AdminProductsPage() {
  await requireStaff("/admin/products");
  const sb = await createClient();
  // Staff RLS also returns inactive (hidden) products
  const [{ data }, categories] = await Promise.all([
    sb.from("products").select("*").order("category_id").order("sort").order("name"),
    getCategories(),
  ]);
  return <ProductAdmin products={(data as Product[]) ?? []} categories={categories} />;
}

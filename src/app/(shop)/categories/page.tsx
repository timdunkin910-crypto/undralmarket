import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogBrowser } from "@/components/shop/catalog-browser";
import { getCategories, getMe, getProducts } from "@/lib/data";
import Loading from "../loading";

export const metadata: Metadata = { title: "Ангилал" };

export default function CategoriesPage(props: PageProps<"/categories">) {
  return (
    <Suspense fallback={<Loading />}>
      <Catalog searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Catalog({ searchParams }: { searchParams: PageProps<"/categories">["searchParams"] }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  // A small shop's whole catalog fits in one payload, so filtering happens instantly on the phone.
  const [categories, products, me] = await Promise.all([getCategories(), getProducts(), getMe()]);
  return (
    <CatalogBrowser
      categories={categories}
      products={products}
      canOrder={me?.status === "approved"}
      initial={{ c: one(sp.c), q: one(sp.q), sale: one(sp.sale) === "1", mn: one(sp.mn) === "1" }}
    />
  );
}

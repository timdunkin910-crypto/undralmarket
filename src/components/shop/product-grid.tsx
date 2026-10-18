import type { Category, Product } from "@/lib/types";
import { ProductCard } from "./product-card";
import { EmptyState } from "./empty-state";

export function ProductGrid({
  products,
  categories,
  canOrder,
  empty,
}: {
  products: Product[];
  categories: Category[];
  canOrder: boolean;
  empty?: React.ReactNode;
}) {
  if (products.length === 0) {
    return <>{empty ?? <EmptyState title="Бараа алга байна" text="Удахгүй шинэ бараа нэмэгдэнэ." />}</>;
  }
  const emoji = new Map(categories.map((c) => [c.id, c.emoji]));
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {products.map((p) => (
        <li key={p.id} className="flex">
          <ProductCard product={p} emoji={p.category_id ? emoji.get(p.category_id) : undefined} canOrder={canOrder} />
        </li>
      ))}
    </ul>
  );
}

/** Horizontal scroller used on the home page. */
export function ProductRail({ products, categories, canOrder }: { products: Product[]; categories: Category[]; canOrder: boolean }) {
  const emoji = new Map(categories.map((c) => [c.id, c.emoji]));
  return (
    <ul className="no-scrollbar -mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1">
      {products.map((p) => (
        <li key={p.id} className="flex w-[44%] shrink-0 snap-start sm:w-[30%] lg:w-[19%]">
          <ProductCard product={p} emoji={p.category_id ? emoji.get(p.category_id) : undefined} canOrder={canOrder} />
        </li>
      ))}
    </ul>
  );
}

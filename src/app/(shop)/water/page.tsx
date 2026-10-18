import type { Metadata } from "next";
import { Droplets } from "lucide-react";
import { WaterOrder } from "@/components/shop/water-order";
import { EmptyState } from "@/components/shop/empty-state";
import { getMe, getProducts } from "@/lib/data";

export const metadata: Metadata = { title: "19 л ус" };

export default async function WaterPage() {
  const [products, me] = await Promise.all([getProducts({ q: "19" }), getMe()]);
  const water = products.find((p) => /19\s*л/i.test(p.unit) || /19\s*л/i.test(p.name)) ?? null;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="grid size-14 place-items-center rounded-2xl bg-mint text-brand-strong">
          <Droplets className="size-8" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-bold">19 л ус дуудах</h1>
          <p className="text-sm text-muted-foreground">Хаалган дээр тань хүргээд хоосон савыг авч явна</p>
        </div>
      </div>
      {water ? (
        <WaterOrder product={water} canOrder={me?.status === "approved"} signedIn={!!me} />
      ) : (
        <EmptyState title="19 л ус одоогоор бүртгэгдээгүй байна" text="Дэлгүүр рүү залгаж захиална уу." />
      )}
    </div>
  );
}

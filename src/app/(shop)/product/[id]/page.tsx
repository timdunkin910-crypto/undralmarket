import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ProductImage } from "@/components/shop/product-image";
import { AddToCart } from "@/components/shop/add-to-cart";
import { getCategories, getMe, getProduct } from "@/lib/data";
import { mnt } from "@/lib/format";

export async function generateMetadata(props: PageProps<"/product/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const p = await getProduct(id);
  return { title: p?.name ?? "Бараа" };
}

export default async function ProductPage(props: PageProps<"/product/[id]">) {
  const { id } = await props.params;
  const [p, categories, me] = await Promise.all([getProduct(id), getCategories(), getMe()]);
  if (!p) notFound();
  const cat = categories.find((c) => c.id === p.category_id);
  const onSale = p.old_price != null && p.old_price > p.price;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={cat ? `/categories?c=${cat.slug}` : "/categories"}
        className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden /> {cat?.name ?? "Ангилал"}
      </Link>
      <div className="grid gap-6 md:grid-cols-2">
        <ProductImage
          src={p.image_url}
          alt={p.name}
          emoji={cat?.emoji}
          sizes="(max-width: 768px) 100vw, 400px"
          className={p.sold_out ? "rounded-3xl grayscale" : "rounded-3xl"}
          priority
        />
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {onSale && <span className="rounded-full bg-lime px-2.5 py-0.5 text-sm font-bold text-forest">Хямдрал</span>}
            {p.fresh_today && <span className="rounded-full bg-mint px-2.5 py-0.5 text-sm font-semibold text-forest">Өнөөдөр ирсэн</span>}
            {p.is_mongolian && <span className="rounded-full border px-2.5 py-0.5 text-sm font-medium">🇲🇳 Монгол үйлдвэр</span>}
          </div>
          <h1 className="text-2xl leading-tight font-bold">{p.name}</h1>
          <p className="text-muted-foreground">{p.unit}</p>
          <div className="flex items-baseline gap-3">
            <span className="tabular text-3xl font-bold">{mnt(p.price)}</span>
            {onSale && <s className="tabular text-muted-foreground">{mnt(p.old_price!)}</s>}
          </div>
          <AddToCart product={p} canOrder={me?.status === "approved"} signedIn={!!me} />
        </div>
      </div>
    </div>
  );
}

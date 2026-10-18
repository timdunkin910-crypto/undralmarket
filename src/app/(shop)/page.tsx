import Link from "next/link";
import { ChevronRight, Droplets, Sparkles, Tag } from "lucide-react";
import { StatusPill } from "@/components/shop/status-pill";
import { Countdown } from "@/components/shop/countdown";
import { ProductRail } from "@/components/shop/product-grid";
import { ReorderButton } from "@/components/shop/reorder-button";
import { EmptyState } from "@/components/shop/empty-state";
import { RecipeSection } from "@/components/shop/recipe-collection";
import { getCategories, getMe, getProducts, getRecipes, getSettings, getUsualProducts } from "@/lib/data";
import { aptLabel, mnt } from "@/lib/format";

export default async function HomePage() {
  const [settings, me, categories, fresh, deals, recipes] = await Promise.all([
    getSettings(),
    getMe(),
    getCategories(),
    getProducts({ fresh: true, limit: 12 }),
    getProducts({ sale: true, limit: 12 }),
    getRecipes(),
  ]);
  const canOrder = me?.status === "approved";
  const usual = canOrder ? await getUsualProducts() : null;

  return (
    <div className="flex flex-col gap-8">
      {/* Greeting + status */}
      <section aria-labelledby="hello" className="rounded-3xl bg-forest p-5 text-white">
        <h1 id="hello" className="text-xl leading-snug font-bold sm:text-2xl">
          {me?.apartment ? (
            <>Сайн байна уу, {aptLabel(me.apartment)}</>
          ) : (
            <>Сайн байна уу! Манай байрны дэлгүүрт тавтай морил</>
          )}
        </h1>
        <p className="mt-1 text-sm text-mint">
          {settings.delivery_enabled ? "Хаалган дээр тань үнэгүй хүргэнэ" : "Лангуунаас авах боломжтой"} · Доод хэмжээ {mnt(settings.min_order)}
        </p>
        <StatusPill
          className="mt-4"
          openTime={settings.open_time}
          closeTime={settings.close_time}
          deliveryEnabled={settings.delivery_enabled}
        />
        {!me && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/signup" className="inline-flex h-11 items-center rounded-xl bg-white px-4 font-semibold text-forest">
              Бүртгүүлэх
            </Link>
            <Link href="/login" className="inline-flex h-11 items-center rounded-xl border border-white/40 px-4 font-semibold">
              Нэвтрэх
            </Link>
          </div>
        )}
      </section>

      {/* 19L water */}
      <Link
        href="/water"
        className="flex items-center gap-4 rounded-3xl bg-brand-strong p-5 text-white hover:bg-forest"
      >
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/15">
          <Droplets className="size-8" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-bold">19 л ус дуудах</span>
          <span className="block text-sm text-mint">Хоосон савыг тань буцааж авна</span>
        </span>
        <ChevronRight className="size-6 shrink-0" aria-hidden />
      </Link>

      {/* Usual items */}
      {usual && (usual.products.length > 0 || usual.lastOrder) && (
        <section aria-labelledby="usual">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 id="usual" className="text-xl font-bold">Байнга авдаг</h2>
          </div>
          {usual.lastOrder?.order_items && usual.lastOrder.order_items.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-mint-soft p-4">
              <div className="min-w-0">
                <p className="font-semibold">Сүүлийн захиалгаа давтах</p>
                <p className="truncate text-sm text-muted-foreground">
                  {usual.lastOrder.order_items.map((i) => i.name).join(", ")}
                </p>
              </div>
              <ReorderButton items={usual.lastOrder.order_items} label="Нэг товшилтоор" />
            </div>
          )}
          {usual.products.length > 0 && <ProductRail products={usual.products} categories={categories} canOrder={canOrder} />}
        </section>
      )}

      {/* Categories */}
      <section aria-labelledby="cats">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 id="cats" className="text-xl font-bold">Ангилал</h2>
          <Link href="/categories" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-strong">
            Бүгд <ChevronRight className="size-4" aria-hidden />
          </Link>
        </div>
        {categories.length === 0 ? (
          <EmptyState title="Ангилал хараахан нэмэгдээгүй байна" />
        ) : (
          <ul className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-5 lg:grid-cols-10">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/categories?c=${c.slug}`} className="flex flex-col items-center gap-1.5 text-center text-xs leading-tight font-medium">
                  <span className="grid aspect-square w-full max-w-[72px] place-items-center rounded-full bg-mint-soft text-3xl" aria-hidden>
                    {c.emoji}
                  </span>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Fresh today */}
      <section aria-labelledby="fresh">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="size-5 text-brand-strong" aria-hidden />
          <h2 id="fresh" className="text-xl font-bold">Өнөөдөр шинээр ирсэн</h2>
        </div>
        {fresh.length > 0 ? (
          <ProductRail products={fresh} categories={categories} canOrder={canOrder} />
        ) : (
          <EmptyState title="Өнөөдрийн шинэ бараа удахгүй" text="Талх, сүү, мах ирэхэд энд харагдана." />
        )}
      </section>

      {recipes.length > 0 && <RecipeSection recipes={recipes} minOrder={settings.min_order} canOrder={canOrder} signedIn={!!me} />}

      {/* Daily deals */}
      <section aria-labelledby="deals" className="-mx-4 bg-forest px-4 py-6 text-white sm:mx-0 sm:rounded-3xl sm:px-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Tag className="size-5 text-lime" aria-hidden />
            <h2 id="deals" className="text-xl font-bold">Өнөөдрийн хямдрал</h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-mint">
            Дуусахад <Countdown openTime={settings.open_time} closeTime={settings.close_time} />
          </div>
        </div>
        {deals.length > 0 ? (
          <div className="text-foreground">
            <ProductRail products={deals} categories={categories} canOrder={canOrder} />
          </div>
        ) : (
          <p className="text-mint">Өнөөдөр хямдрал алга. Маргааш дахин шалгаарай!</p>
        )}
      </section>
    </div>
  );
}

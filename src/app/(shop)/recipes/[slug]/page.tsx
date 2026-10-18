import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChefHat, ChevronLeft, Clock, Users } from "lucide-react";
import { RecipeArt } from "@/components/shop/recipe-card";
import { RecipeBuilder } from "@/components/shop/recipe-builder";
import { RecipeRail } from "@/components/shop/recipe-collection";
import { getMe, getRecipe, getRecipes, getSettings } from "@/lib/data";
import { similarRecipes } from "@/lib/recipes";

export async function generateMetadata(props: PageProps<"/recipes/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const r = await getRecipe(slug);
  return { title: r?.name ?? "Жор" };
}

export default async function RecipePage(props: PageProps<"/recipes/[slug]">) {
  const { slug } = await props.params;
  const [recipe, all, settings, me] = await Promise.all([getRecipe(slug), getRecipes(), getSettings(), getMe()]);
  if (!recipe) notFound();
  const canOrder = me?.status === "approved";
  const similar = similarRecipes(all, recipe);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Link href="/#recipes" className="-mb-3 inline-flex min-h-11 items-center gap-1 self-start text-sm font-medium text-muted-foreground">
        <ChevronLeft className="size-4" aria-hidden /> Жорууд
      </Link>

      <div className="relative grid aspect-[16/9] place-items-center overflow-hidden rounded-3xl bg-mint-soft sm:aspect-[21/8]">
        <RecipeArt recipe={recipe} sizes="(max-width: 1024px) 100vw, 1024px" priority emojiClass="text-[clamp(96px,22vw,180px)]" />
      </div>

      <header className="flex flex-col gap-2">
        <span className="self-start rounded-full bg-mint px-2.5 py-0.5 text-sm font-semibold text-forest">
          {recipe.category}
          {recipe.for_kids && " · Хүүхдэд"}
        </span>
        <h1 className="text-3xl leading-tight font-bold">{recipe.name}</h1>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-muted-foreground">
          <li className="inline-flex items-center gap-1.5">
            <Clock className="size-4" aria-hidden /> {recipe.time_min} минут
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Users className="size-4" aria-hidden /> {recipe.servings} хүнд
          </li>
          <li className="inline-flex items-center gap-1.5">
            <ChefHat className="size-4" aria-hidden /> {recipe.difficulty}
          </li>
        </ul>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <RecipeBuilder recipe={recipe} minOrder={settings.min_order} canOrder={canOrder} signedIn={!!me} />

        {recipe.steps.length > 0 && (
          <section aria-labelledby="steps">
            <h2 id="steps" className="mb-4 text-xl font-bold">Хийх арга</h2>
            <ol className="flex flex-col gap-4">
              {recipe.steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="tabular grid size-8 shrink-0 place-items-center rounded-full bg-brand-strong text-sm font-bold text-white" aria-hidden>
                    {i + 1}
                  </span>
                  <p className="pt-1">{s}</p>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      {similar.length > 0 && (
        <section aria-labelledby="similar">
          <h2 id="similar" className="mb-3 text-xl font-bold">Төстэй жор</h2>
          <RecipeRail recipes={similar} minOrder={settings.min_order} canOrder={canOrder} signedIn={!!me} toastClass="bottom-40 md:bottom-6" />
        </section>
      )}

      {/* Room for the fixed "Сонгосон орцыг сагслах" bar on phones */}
      <div className="h-20 md:hidden" aria-hidden />
    </div>
  );
}

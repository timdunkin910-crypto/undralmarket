"use client";

import { useCallback, useState } from "react";
import { bundlePicks, RECIPE_FILTERS } from "@/lib/recipes";
import type { Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { RecipeCard, useAddBundle } from "./recipe-card";
import { useToast } from "./toast";

type Props = { recipes: Recipe[]; minOrder: number; canOrder: boolean; signedIn: boolean };

const HOME_LIMIT = 6;

/** Home page "Өнөөдөр юу хийх вэ?": filter chips, swipe rail on phones, 3-column grid (first 6) on desktop. */
export function RecipeSection({ recipes, minOrder, canOrder, signedIn }: Props) {
  const [filter, setFilter] = useState(RECIPE_FILTERS[0].id);
  const [expanded, setExpanded] = useState(false);
  const [toast, onAdd] = useBundleToast(minOrder);

  const active = RECIPE_FILTERS.find((f) => f.id === filter) ?? RECIPE_FILTERS[0];
  const shown = recipes.filter(active.test);
  const chip = (on: boolean) =>
    cn(
      "inline-flex h-10 shrink-0 items-center rounded-full px-4 text-sm font-medium whitespace-nowrap",
      on ? "bg-forest text-white" : "bg-mint-soft text-forest hover:bg-mint",
    );

  return (
    <section id="recipes" aria-labelledby="recipes-title" className="scroll-mt-20">
      <div className="mb-3">
        <h2 id="recipes-title" className="text-xl font-bold">Өнөөдөр юу хийх вэ?</h2>
        <p className="text-sm text-muted-foreground">Жорын бүх орцыг нэг товшилтоор сагсална</p>
      </div>

      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Жорын төрөл">
        {RECIPE_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={f.id === filter}
            className={chip(f.id === filter)}
            onClick={() => {
              setFilter(f.id);
              setExpanded(false);
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-2xl bg-mint-soft p-6 text-center text-muted-foreground">Энэ төрлийн жор одоогоор алга.</p>
      ) : (
        <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3">
          {shown.map((r, i) => (
            <li key={r.id} className={cn("flex w-[85%] shrink-0 snap-start sm:w-[60%] md:w-auto", i >= HOME_LIMIT && !expanded && "md:hidden")}>
              <RecipeCard recipe={r} canOrder={canOrder} signedIn={signedIn} onAdd={onAdd} />
            </li>
          ))}
        </ul>
      )}
      {!expanded && shown.length > HOME_LIMIT && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-4 hidden h-12 w-full items-center justify-center rounded-xl border bg-white font-semibold text-brand-strong hover:border-brand md:flex"
        >
          Бүх жор үзэх ({shown.length})
        </button>
      )}
      {toast}
    </section>
  );
}

/** "Төстэй жор": a plain swipe rail at every width. */
export function RecipeRail({ recipes, minOrder, canOrder, signedIn, toastClass }: Props & { toastClass?: string }) {
  const [toast, onAdd] = useBundleToast(minOrder, toastClass);
  return (
    <>
      <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
        {recipes.map((r) => (
          <li key={r.id} className="flex w-[85%] shrink-0 snap-start sm:w-[48%] lg:w-[32%]">
            <RecipeCard recipe={r} canOrder={canOrder} signedIn={signedIn} onAdd={onAdd} />
          </li>
        ))}
      </ul>
      {toast}
    </>
  );
}

function useBundleToast(minOrder: number, toastClass?: string) {
  const [toast, show] = useToast(toastClass);
  const addBundle = useAddBundle(minOrder, show);
  const onAdd = useCallback(
    (r: Recipe) => {
      const { picks, soldOut } = bundlePicks(r);
      addBundle(r.name, picks, soldOut);
    },
    [addBundle],
  );
  return [toast, onAdd] as const;
}

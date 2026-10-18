"use client";

import Image from "next/image";
import { useId, useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Camera, Link2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { reorderRecipes, saveRecipe, toggleRecipe, type RecipeInput, type RecipeItemInput } from "@/app/actions/admin";
import { mnt } from "@/lib/format";
import { slugify } from "@/lib/recipes";
import { RECIPE_CATEGORIES, RECIPE_DIFFICULTIES, type Product, type Recipe } from "@/lib/types";
import { uploadPhoto } from "@/lib/upload-image";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const EMPTY: RecipeInput = {
  slug: "",
  name: "",
  emoji: "🍲",
  image_url: null,
  category: RECIPE_CATEGORIES[0],
  time_min: 30,
  servings: 4,
  difficulty: "Амархан",
  for_kids: false,
  steps: [],
  active: true,
  items: [],
};

const NEW_ITEM: RecipeItemInput = { product_id: null, label: "", amount: "", qty: 1, optional: false };

function toInput(r: Recipe): RecipeInput {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    emoji: r.emoji,
    image_url: r.image_url,
    category: r.category,
    time_min: r.time_min,
    servings: r.servings,
    difficulty: r.difficulty,
    for_kids: r.for_kids,
    steps: r.steps,
    active: r.active,
    items: r.items.map((i) => ({ product_id: i.product_id, label: i.label, amount: i.amount, qty: i.qty, optional: i.optional })),
  };
}

// Same folding as the shop search: "суу" typed on a Russian keyboard still finds "сүү".
function norm(s: string) {
  return s.toLowerCase().replace(/ё/g, "е").replace(/ү/g, "у").replace(/ө/g, "о").trim();
}

export function RecipeAdmin({ recipes, products }: { recipes: Recipe[]; products: Product[] }) {
  const [rows, setRows] = useState(recipes);
  const [editing, setEditing] = useState<RecipeInput | null>(null);
  const [msg, setMsg] = useState("");
  const [, start] = useTransition();

  function flip(r: Recipe) {
    setMsg("");
    setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, active: !r.active } : x)));
    start(async () => {
      const res = await toggleRecipe(r.id, !r.active);
      if ("error" in res) {
        setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, active: r.active } : x)));
        setMsg(res.error);
      }
    });
  }

  function move(index: number, dir: -1 | 1) {
    const before = rows;
    const next = [...rows];
    [next[index], next[index + dir]] = [next[index + dir], next[index]];
    setMsg("");
    setRows(next);
    start(async () => {
      const res = await reorderRecipes(next.map((r) => r.id));
      if ("error" in res) {
        setRows(before);
        setMsg(res.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-2xl font-bold">Жор ({rows.length})</h1>
        <button type="button" onClick={() => setEditing({ ...EMPTY })} className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-strong px-4 font-semibold text-white">
          <Plus className="size-5" aria-hidden /> Жор нэмэх
        </button>
      </div>
      {msg && <p role="alert" className="text-sm font-medium text-destructive">{msg}</p>}

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-white p-8 text-center text-muted-foreground">Жор алга. «Жор нэмэх» дарж эхлүүлээрэй.</p>
      ) : (
        <ul className="divide-y rounded-2xl bg-white">
          {rows.map((r, i) => {
            const unlinked = r.items.filter((x) => !x.product).length;
            const soldOut = r.items.filter((x) => x.product?.sold_out).length;
            return (
              <li key={r.id} className={cn("flex flex-wrap items-center gap-3 p-3", !r.active && "opacity-60")}>
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-mint-soft text-2xl" aria-hidden>
                  {r.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{r.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {r.category} · {r.time_min} мин · {r.items.length} орц
                    {unlinked > 0 && <span className="text-amber-700"> · {unlinked} холбоогүй</span>}
                    {soldOut > 0 && <span className="text-amber-700"> · {soldOut} дууссан</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <label className="flex min-h-11 items-center gap-2 px-2 text-sm font-medium">
                    <Switch checked={r.active} onCheckedChange={() => flip(r)} aria-label={`${r.name}: харагдах`} className="scale-125" />
                    <span className="hidden sm:inline">Харагдах</span>
                  </label>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="grid size-11 place-items-center rounded-xl hover:bg-mint-soft disabled:opacity-30" aria-label={`${r.name} дээш`}>
                    <ArrowUp className="size-5" aria-hidden />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="grid size-11 place-items-center rounded-xl hover:bg-mint-soft disabled:opacity-30" aria-label={`${r.name} доош`}>
                    <ArrowDown className="size-5" aria-hidden />
                  </button>
                  <button type="button" onClick={() => setEditing(toInput(r))} className="grid size-11 place-items-center rounded-xl hover:bg-mint-soft" aria-label={`${r.name} засах`}>
                    <Pencil className="size-5" aria-hidden />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <RecipeForm
          initial={editing}
          products={products}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null);
            setRows((rs) => (rs.some((r) => r.id === saved.id) ? rs.map((r) => (r.id === saved.id ? saved : r)) : [...rs, saved]));
          }}
        />
      )}
    </div>
  );
}

function RecipeForm({
  initial,
  products,
  onClose,
  onSaved,
}: {
  initial: RecipeInput;
  products: Product[];
  onClose: () => void;
  onSaved: (r: Recipe) => void;
}) {
  const [r, setR] = useState(initial);
  const [stepsText, setStepsText] = useState(initial.steps.join("\n"));
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const set = <K extends keyof RecipeInput>(k: K, v: RecipeInput[K]) => setR((x) => ({ ...x, [k]: v }));
  const setItem = (i: number, patch: Partial<RecipeItemInput>) =>
    setR((x) => ({ ...x, items: x.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) }));

  async function upload(file: File) {
    setUploading(true);
    setError("");
    try {
      set("image_url", await uploadPhoto(file, "recipes/"));
    } catch {
      setError("Зураг хуулж чадсангүй.");
    } finally {
      setUploading(false);
    }
  }

  const field = "h-12 text-base";
  const select = "h-12 rounded-xl border bg-white px-3 text-base";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-forest/40 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="rf-title">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await saveRecipe({ ...r, steps: stepsText.split("\n") });
            if ("error" in res) setError(res.error);
            else onSaved(res.recipe);
          });
        }}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-t-3xl bg-white p-4 sm:rounded-3xl sm:p-5"
      >
        <div className="flex items-center justify-between">
          <h2 id="rf-title" className="text-xl font-bold">{r.id ? "Жор засах" : "Шинэ жор"}</h2>
          <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-xl hover:bg-mint-soft" aria-label="Хаах">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl bg-mint-soft text-5xl">
            {r.image_url ? (
              <Image src={r.image_url} alt="" fill sizes="96px" className="object-cover" />
            ) : (
              <span aria-hidden>{r.emoji || "🍲"}</span>
            )}
          </div>
          <label className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-xl border px-4 font-semibold focus-within:ring-3 focus-within:ring-mint">
            <Camera className="size-5" aria-hidden />
            {uploading ? "Хуулж байна…" : r.image_url ? "Зураг солих" : "Зураг нэмэх"}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
          {r.image_url && (
            <button type="button" onClick={() => set("image_url", null)} className="min-h-11 text-sm text-muted-foreground underline">
              Зураг арилгах
            </button>
          )}
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_5rem] gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rf-name">Нэр</Label>
            <Input id="rf-name" required value={r.name} onChange={(e) => set("name", e.target.value)} className={field} placeholder="Жишээ нь: Бууз" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rf-emoji">Эможи</Label>
            <Input id="rf-emoji" value={r.emoji} maxLength={8} onChange={(e) => set("emoji", e.target.value)} className={cn(field, "text-center text-2xl")} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rf-slug">Холбоос (хоосон бол нэрээс автоматаар)</Label>
          <Input id="rf-slug" value={r.slug} onChange={(e) => set("slug", e.target.value)} className={field} placeholder={slugify(r.name) || "buuz"} />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
            <Label htmlFor="rf-cat">Ангилал</Label>
            <select id="rf-cat" value={r.category} onChange={(e) => set("category", e.target.value)} className={select}>
              {RECIPE_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rf-time">Хугацаа (мин)</Label>
            <Input id="rf-time" type="number" inputMode="numeric" min={1} max={600} required value={r.time_min || ""} onChange={(e) => set("time_min", Number(e.target.value))} className={field} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rf-serv">Хэдэн хүнд</Label>
            <Input id="rf-serv" type="number" inputMode="numeric" min={1} max={20} required value={r.servings || ""} onChange={(e) => set("servings", Number(e.target.value))} className={field} />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
            <Label htmlFor="rf-diff">Хүндрэл</Label>
            <select id="rf-diff" value={r.difficulty} onChange={(e) => set("difficulty", e.target.value as RecipeInput["difficulty"])} className={select}>
              {RECIPE_DIFFICULTIES.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {(
            [
              ["for_kids", "Хүүхдэд тохиромжтой"],
              ["active", "Дэлгүүрт харагдана"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="flex min-h-11 items-center justify-between gap-3 rounded-xl px-2 hover:bg-mint-soft">
              <span className="font-medium">{label}</span>
              <Switch checked={r[k]} onCheckedChange={(v) => set(k, v)} className="scale-125" />
            </label>
          ))}
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-bold">Орц</legend>
          {r.items.length === 0 && <p className="text-sm text-muted-foreground">Орц нэмээгүй байна.</p>}
          {r.items.map((it, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-2xl border p-3">
              <div className="flex gap-2">
                <Input
                  value={it.label}
                  onChange={(e) => setItem(i, { label: e.target.value })}
                  placeholder="Орцын нэр, жишээ нь: Хонины мах"
                  aria-label={`${i + 1}-р орцын нэр`}
                  className={cn(field, "min-w-0 flex-1")}
                />
                <button
                  type="button"
                  onClick={() => setR((x) => ({ ...x, items: x.items.filter((_, j) => j !== i) }))}
                  className="grid size-12 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-mint-soft"
                  aria-label={`${it.label || `${i + 1}-р орц`} хасах`}
                >
                  <Trash2 className="size-5" aria-hidden />
                </button>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2 sm:grid-cols-[minmax(0,1fr)_5.5rem_auto]">
                <Input value={it.amount} onChange={(e) => setItem(i, { amount: e.target.value })} placeholder="Хэмжээ: 500 гр" aria-label={`${i + 1}-р орцын хэмжээ`} className={field} />
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={20}
                  value={it.qty || ""}
                  onChange={(e) => setItem(i, { qty: Number(e.target.value) })}
                  aria-label={`${i + 1}-р орц: сагслах ширхэг`}
                  title="Сагсанд нэмэх барааны тоо"
                  className={field}
                />
                <label className="col-span-2 flex min-h-11 items-center gap-2 px-1 text-sm font-medium sm:col-span-1">
                  <input type="checkbox" checked={it.optional} onChange={(e) => setItem(i, { optional: e.target.checked })} className="size-5 accent-brand-strong" />
                  Нэмэлт
                </label>
              </div>
              <ProductPicker
                products={products}
                value={it.product_id}
                onChange={(p) => setItem(i, { product_id: p?.id ?? null, ...(p && !it.label.trim() && { label: p.name }) })}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setR((x) => ({ ...x, items: [...x.items, { ...NEW_ITEM }] }))}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-dashed font-semibold text-brand-strong hover:border-brand"
          >
            <Plus className="size-5" aria-hidden /> Орц нэмэх
          </button>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rf-steps">Хийх арга (мөр бүр нэг алхам)</Label>
          <textarea
            id="rf-steps"
            rows={6}
            value={stepsText}
            onChange={(e) => setStepsText(e.target.value)}
            className="rounded-xl border bg-white p-3 text-base outline-none focus:border-brand focus:ring-3 focus:ring-mint"
          />
        </div>

        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
        <button type="submit" disabled={pending || uploading} className="h-14 shrink-0 rounded-xl bg-brand-strong text-base font-semibold text-white disabled:opacity-60">
          {pending ? "Хадгалж байна…" : "Хадгалах"}
        </button>
      </form>
    </div>
  );
}

/** Searchable product link for one ingredient. */
function ProductPicker({ products, value, onChange }: { products: Product[]; value: string | null; onChange: (p: Product | null) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const listId = useId();
  const current = products.find((p) => p.id === value);
  const matches = useMemo(() => {
    const nq = norm(q);
    return products.filter((p) => !nq || norm(p.name).includes(nq)).slice(0, 8);
  }, [products, q]);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={listId}
        className={cn(
          "flex min-h-11 items-center gap-2 rounded-xl px-3 text-left text-sm",
          current ? "bg-mint-soft text-forest" : "border border-dashed text-muted-foreground",
        )}
      >
        <Link2 className="size-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 truncate">
          {current ? `${current.name} · ${current.unit} · ${mnt(current.price)}${current.sold_out ? " · дууссан" : ""}${current.active ? "" : " · нуусан"}` : "Дэлгүүрийн бараатай холбох"}
        </span>
      </button>
      {open && (
        <div id={listId} className="flex flex-col gap-1 rounded-xl border p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Бараа хайх" aria-label="Бараа хайх" className="h-11 pl-9 text-base" />
          </div>
          <ul className="flex flex-col">
            {matches.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(p);
                    setOpen(false);
                    setQ("");
                  }}
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-2 text-left text-sm hover:bg-mint-soft"
                >
                  <span className="min-w-0 truncate">
                    {p.name} <span className="text-muted-foreground">· {p.unit}</span>
                  </span>
                  <span className="tabular shrink-0 text-muted-foreground">{p.sold_out ? "дууссан" : mnt(p.price)}</span>
                </button>
              </li>
            ))}
            {matches.length === 0 && <li className="px-2 py-2 text-sm text-muted-foreground">Олдсонгүй.</li>}
          </ul>
          {current && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="min-h-11 rounded-lg px-2 text-left text-sm font-medium text-destructive hover:bg-red-50"
            >
              Холбоосыг арилгах («Дэлгүүрт байхгүй» гэж харагдана)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

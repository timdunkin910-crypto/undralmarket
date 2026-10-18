"use client";

import { useMemo, useState, useTransition } from "react";
import { Camera, Pencil, Plus, Search, Sparkles, X } from "lucide-react";
import { clearFreshToday, saveProduct, toggleProduct, type ProductInput } from "@/app/actions/admin";
import { mnt } from "@/lib/format";
import { uploadPhoto } from "@/lib/upload-image";
import type { Category, Product } from "@/lib/types";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductImage } from "@/components/shop/product-image";
import { cn } from "@/lib/utils";

const EMPTY: ProductInput = {
  name: "",
  unit: "1ш",
  price: 0,
  old_price: null,
  category_id: null,
  image_url: null,
  is_mongolian: false,
  is_deal: false,
  fresh_today: false,
  sold_out: false,
  active: true,
};

const FLAG_LABEL = { sold_out: "Дууссан", fresh_today: "Өнөөдөр ирсэн", is_deal: "Хямдрал", active: "Харагдах" } as const;

export function ProductAdmin({ products, categories }: { products: Product[]; categories: Category[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<number | "all">("all");
  const [editing, setEditing] = useState<ProductInput | null>(null);
  const [rows, setRows] = useState(products);
  const [, start] = useTransition();
  const [msg, setMsg] = useState("");

  const emoji = new Map(categories.map((c) => [c.id, c.emoji]));
  const shown = useMemo(
    () => rows.filter((p) => (cat === "all" || p.category_id === cat) && (!q || p.name.toLowerCase().includes(q.toLowerCase()))),
    [rows, cat, q],
  );

  function flip(p: Product, field: "sold_out" | "fresh_today" | "is_deal" | "active") {
    const v = !p[field];
    setRows((rs) => rs.map((r) => (r.id === p.id ? { ...r, [field]: v } : r)));
    start(async () => {
      const r = await toggleProduct(p.id, field, v);
      if ("error" in r) {
        setRows((rs) => rs.map((x) => (x.id === p.id ? { ...x, [field]: !v } : x)));
        setMsg(r.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-2xl font-bold">Бараа ({rows.length})</h1>
        <button
          type="button"
          onClick={() =>
            confirm("Бүх барааны «Өнөөдөр ирсэн» тэмдгийг арилгах уу?") &&
            start(async () => {
              const r = await clearFreshToday();
              if ("ok" in r) setRows((rs) => rs.map((x) => ({ ...x, fresh_today: false })));
            })
          }
          className="inline-flex h-11 items-center gap-2 rounded-xl border bg-white px-4 font-semibold"
        >
          <Sparkles className="size-5" aria-hidden /> Шинэ өдөр эхлүүлэх
        </button>
        <button type="button" onClick={() => setEditing({ ...EMPTY })} className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-strong px-4 font-semibold text-white">
          <Plus className="size-5" aria-hidden /> Бараа нэмэх
        </button>
      </div>
      {msg && <p role="alert" className="text-sm font-medium text-destructive">{msg}</p>}

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Хайх" aria-label="Бараа хайх" className="h-11 bg-white pl-10 text-base" />
        </div>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value === "all" ? "all" : Number(e.target.value))}
          className="h-11 rounded-xl border bg-white px-3"
          aria-label="Ангилал"
        >
          <option value="all">Бүх ангилал</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
          ))}
        </select>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed bg-white p-8 text-center text-muted-foreground">
          {rows.length === 0 ? "Каталог хоосон байна. «Бараа нэмэх» дарж эхлүүлээрэй." : "Олдсонгүй."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">Бараа</th>
                <th className="p-3 font-medium">Үнэ</th>
                <th className="p-3 text-center font-medium">Дууссан</th>
                <th className="p-3 text-center font-medium">Өнөөдөр ирсэн</th>
                <th className="p-3 text-center font-medium">Хямдрал</th>
                <th className="p-3 text-center font-medium">Харагдах</th>
                <th className="p-3"><span className="sr-only">Засах</span></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {shown.map((p) => (
                <tr key={p.id} className={cn(!p.active && "opacity-50")}>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <ProductImage src={p.image_url} alt="" emoji={p.category_id ? emoji.get(p.category_id) : undefined} sizes="48px" className="w-12 shrink-0 [&_span]:text-2xl" />
                      <div className="min-w-0">
                        <p className="font-semibold">{p.name}</p>
                        <p className="text-muted-foreground">{p.unit}{p.is_mongolian && " · 🇲🇳"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="tabular p-3 font-semibold whitespace-nowrap">
                    {mnt(p.price)}
                    {p.old_price && <s className="block text-xs font-normal text-muted-foreground">{mnt(p.old_price)}</s>}
                  </td>
                  {(["sold_out", "fresh_today", "is_deal", "active"] as const).map((f) => (
                    <td key={f} className="p-3 text-center">
                      <Switch checked={p[f]} onCheckedChange={() => flip(p, f)} aria-label={`${p.name}: ${FLAG_LABEL[f]}`} className="scale-125" />
                    </td>
                  ))}
                  <td className="p-3 text-right">
                    <button type="button" onClick={() => setEditing({ ...p })} className="grid size-11 place-items-center rounded-xl hover:bg-mint-soft" aria-label={`${p.name} засах`}>
                      <Pencil className="size-5" aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ProductForm
          initial={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null);
            setRows((rs) => (rs.some((r) => r.id === saved.id) ? rs.map((r) => (r.id === saved.id ? saved : r)) : [saved, ...rs]));
          }}
        />
      )}
    </div>
  );
}

function ProductForm({
  initial,
  categories,
  onClose,
  onSaved,
}: {
  initial: ProductInput;
  categories: Category[];
  onClose: () => void;
  onSaved: (p: Product) => void;
}) {
  const [p, setP] = useState(initial);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const set = <K extends keyof ProductInput>(k: K, v: ProductInput[K]) => setP((x) => ({ ...x, [k]: v }));

  async function upload(file: File) {
    setUploading(true);
    setError("");
    try {
      set("image_url", await uploadPhoto(file));
    } catch {
      setError("Зураг хуулж чадсангүй.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-forest/40 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="pf-title">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await saveProduct(p);
            if ("error" in r) setError(r.error);
            else onSaved(r.product);
          });
        }}
        className="flex max-h-[92vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 id="pf-title" className="text-xl font-bold">{p.id ? "Бараа засах" : "Шинэ бараа"}</h2>
          <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-xl hover:bg-mint-soft" aria-label="Хаах">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <ProductImage src={p.image_url} alt="" sizes="96px" className="w-24 shrink-0" />
          <label className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-xl border px-4 font-semibold focus-within:ring-3 focus-within:ring-mint">
            <Camera className="size-5" aria-hidden />
            {uploading ? "Хуулж байна…" : p.image_url ? "Зураг солих" : "Зураг авах"}
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
          {p.image_url && (
            <button type="button" onClick={() => set("image_url", null)} className="text-sm text-muted-foreground underline">
              Арилгах
            </button>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pf-name">Нэр</Label>
          <Input id="pf-name" required value={p.name} onChange={(e) => set("name", e.target.value)} className="h-12 text-base" placeholder="Жишээ нь: Сүү 1л" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pf-price">Үнэ (₮)</Label>
            <Input id="pf-price" type="number" inputMode="numeric" min={0} required value={p.price || ""} onChange={(e) => set("price", Number(e.target.value))} className="h-12 text-base" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pf-old">Хуучин үнэ (хямдрал)</Label>
            <Input id="pf-old" type="number" inputMode="numeric" min={0} value={p.old_price ?? ""} onChange={(e) => set("old_price", e.target.value ? Number(e.target.value) : null)} className="h-12 text-base" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pf-unit">Хэмжээ</Label>
            <Input id="pf-unit" value={p.unit} onChange={(e) => set("unit", e.target.value)} className="h-12 text-base" placeholder="1кг, 1л, 10ш" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pf-cat">Ангилал</Label>
            <select id="pf-cat" value={p.category_id ?? ""} onChange={(e) => set("category_id", e.target.value ? Number(e.target.value) : null)} className="h-12 rounded-xl border bg-white px-3 text-base">
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {(
            [
              ["sold_out", "Дууссан"],
              ["fresh_today", "Өнөөдөр шинээр ирсэн"],
              ["is_deal", "Өнөөдрийн хямдрал"],
              ["is_mongolian", "Монгол үйлдвэр"],
              ["active", "Дэлгүүрт харагдана"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="flex min-h-11 items-center justify-between gap-3 rounded-xl px-2 hover:bg-mint-soft">
              <span className="font-medium">{label}</span>
              <Switch checked={p[k]} onCheckedChange={(v) => set(k, v)} className="scale-125" />
            </label>
          ))}
        </div>

        {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
        <button type="submit" disabled={pending || uploading} className="h-14 rounded-xl bg-brand-strong text-base font-semibold text-white disabled:opacity-60">
          {pending ? "Хадгалж байна…" : "Хадгалах"}
        </button>
      </form>
    </div>
  );
}

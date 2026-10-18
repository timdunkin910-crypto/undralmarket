import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-5xl" aria-hidden>🧺</p>
      <h1 className="text-xl font-bold">Хуудас олдсонгүй</h1>
      <p className="text-muted-foreground">Энэ бараа эсвэл хуудас байхгүй байна.</p>
      <Link href="/" className="mt-2 inline-flex h-11 items-center rounded-xl bg-brand-strong px-5 font-semibold text-white">
        Нүүр хуудас
      </Link>
    </main>
  );
}

import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = { title: "Сүлжээ алга" };

export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-mint text-brand-strong">
        <WifiOff className="size-8" aria-hidden />
      </span>
      <h1 className="text-xl font-bold">Интернэт холболт алга байна</h1>
      <p className="max-w-xs text-muted-foreground">Холболт сэргэмэгц хуудсаа дахин ачаална уу. Сагс тань хадгалагдсан.</p>
      <p className="font-semibold">Яаралтай бол дэлгүүр рүү залгаарай.</p>
    </main>
  );
}

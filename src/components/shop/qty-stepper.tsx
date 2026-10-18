"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function QtyStepper({
  value,
  onChange,
  name,
  size = "md",
  min = 0,
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  name: string;
  size?: "md" | "lg";
  min?: number;
  className?: string;
}) {
  const h = size === "lg" ? "h-14" : "h-11";
  const w = size === "lg" ? "w-14" : "w-11";
  return (
    <div
      role="group"
      aria-label={`${name} — тоо ширхэг`}
      className={cn("inline-flex items-center rounded-xl border bg-white", h, className)}
    >
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label={`${name} — нэгийг хасах`}
        className={cn("grid h-full place-items-center rounded-l-xl text-forest hover:bg-mint-soft disabled:opacity-40", w)}
      >
        <Minus className="size-5" aria-hidden />
      </button>
      <output className="tabular min-w-8 text-center text-base font-semibold" aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= 99}
        aria-label={`${name} — нэгийг нэмэх`}
        className={cn("grid h-full place-items-center rounded-r-xl text-forest hover:bg-mint-soft disabled:opacity-40", w)}
      >
        <Plus className="size-5" aria-hidden />
      </button>
    </div>
  );
}

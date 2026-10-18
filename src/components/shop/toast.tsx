"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A short confirmation above the tab bar. The live region is always mounted so screen readers announce it.
 * `className` positions it (e.g. higher on pages with their own fixed action bar).
 */
export function useToast(className = "bottom-20 md:bottom-6") {
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((text: string) => {
    clearTimeout(timer.current);
    setToast({ text, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), 4000);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  const node = (
    <div role="status" aria-live="polite" className={cn("pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4", className)}>
      {toast && (
        <p
          key={toast.id}
          className="pointer-events-auto flex max-w-md animate-in items-center gap-2 rounded-xl bg-forest px-4 py-3 text-sm font-medium text-white shadow-lg fade-in slide-in-from-bottom-2"
        >
          <Check className="size-5 shrink-0 text-lime" aria-hidden />
          <span className="min-w-0">{toast.text}</span>
          <Link href="/cart" className="ml-1 inline-flex min-h-11 shrink-0 items-center font-semibold text-lime underline">
            Сагс
          </Link>
        </p>
      )}
    </div>
  );
  return [node, show] as const;
}

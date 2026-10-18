import Link from "next/link";
import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      aria-label="undralmarket.mn — нүүр хуудас"
      className={cn("flex min-w-0 items-center gap-2 text-lg font-bold tracking-tight", className)}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-white">
        <Leaf className="size-5" aria-hidden />
      </span>
      <span className="truncate">
        undral<span className="text-brand-strong">market</span>.mn
      </span>
    </Link>
  );
}

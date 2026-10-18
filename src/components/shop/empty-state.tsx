import Link from "next/link";
import { PackageOpen } from "lucide-react";

export function EmptyState({
  title,
  text,
  action,
  icon,
}: {
  title: string;
  text?: string;
  action?: { href: string; label: string };
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-10 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-mint text-brand-strong">
        {icon ?? <PackageOpen className="size-7" aria-hidden />}
      </span>
      <p className="text-base font-semibold">{title}</p>
      {text && <p className="max-w-xs text-sm text-muted-foreground">{text}</p>}
      {action && (
        <Link
          href={action.href}
          className="mt-2 inline-flex h-11 items-center rounded-xl bg-brand-strong px-5 font-semibold text-white hover:bg-forest"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}

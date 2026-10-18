"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { BarChart3, Boxes, ChefHat, ClipboardList, Settings, Store, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Захиалга", icon: ClipboardList },
  { href: "/admin/products", label: "Бараа", icon: Boxes },
  { href: "/admin/recipes", label: "Жор", icon: ChefHat },
  { href: "/admin/residents", label: "Оршин суугчид", icon: UsersRound },
  { href: "/admin/summary", label: "Өдрийн тайлан", icon: BarChart3 },
  { href: "/admin/settings", label: "Тохиргоо", icon: Settings },
];

export function AdminNav() {
  return (
    <Suspense fallback={<AdminNavView pathname="" />}>
      <AdminNavLive />
    </Suspense>
  );
}

function AdminNavLive() {
  return <AdminNavView pathname={usePathname()} />;
}

function AdminNavView({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Удирдлагын цэс" className="no-scrollbar -mx-4 flex flex-1 gap-1 overflow-x-auto px-4 md:mx-0 md:px-0">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold",
              active ? "bg-forest text-white" : "text-forest hover:bg-mint-soft",
            )}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        );
      })}
      <Link href="/" className="ml-auto inline-flex h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-mint-soft">
        <Store className="size-5" aria-hidden /> Дэлгүүр рүү
      </Link>
    </nav>
  );
}

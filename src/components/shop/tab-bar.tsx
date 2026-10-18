"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { Home, LayoutGrid, ReceiptText, ShoppingBasket, UserRound } from "lucide-react";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Нүүр", icon: Home, match: (p: string) => p === "/" },
  { href: "/categories", label: "Ангилал", icon: LayoutGrid, match: (p: string) => p.startsWith("/categories") || p.startsWith("/product") },
  { href: "/cart", label: "Сагс", icon: ShoppingBasket, match: (p: string) => p.startsWith("/cart") || p.startsWith("/checkout") },
  { href: "/orders", label: "Захиалга", icon: ReceiptText, match: (p: string) => p.startsWith("/orders") },
  { href: "/me", label: "Би", icon: UserRound, match: (p: string) => p.startsWith("/me") },
];

// The pathname is request data, so the nav renders without an active tab in the
// prerendered shell and lights up once the pathname streams in.
function WithPathname({ render }: { render: (pathname: string) => React.ReactNode }) {
  return <>{render(usePathname())}</>;
}

/** Mobile bottom navigation; on ≥md screens the same links live in the header. */
export function TabBar() {
  return (
    <Suspense fallback={<TabBarView pathname="" />}>
      <WithPathname render={(p) => <TabBarView pathname={p} />} />
    </Suspense>
  );
}

export function DesktopNav() {
  return (
    <Suspense fallback={<DesktopNavView pathname="" />}>
      <WithPathname render={(p) => <DesktopNavView pathname={p} />} />
    </Suspense>
  );
}

function TabBarView({ pathname }: { pathname: string }) {
  const { count } = useCart();
  return (
    <nav
      aria-label="Үндсэн цэс"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                  active ? "text-brand-strong" : "text-muted-foreground",
                )}
              >
                <Icon className="size-6" aria-hidden strokeWidth={active ? 2.4 : 2} />
                {label}
                {href === "/cart" && count > 0 && (
                  <span
                    className="tabular absolute top-2 left-1/2 ml-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand-strong px-1 text-[11px] font-bold text-white"
                    aria-label={`Сагсанд ${count} бараа`}
                  >
                    {count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function DesktopNavView({ pathname }: { pathname: string }) {
  const { count } = useCart();
  return (
    <nav aria-label="Үндсэн цэс" className="hidden items-center gap-1 md:flex">
      {TABS.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium hover:bg-mint-soft",
              active && "bg-mint-soft text-brand-strong",
            )}
          >
            <Icon className="size-5" aria-hidden />
            {label}
            {href === "/cart" && count > 0 && (
              <span className="tabular rounded-full bg-brand-strong px-1.5 text-xs font-bold text-white">{count}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

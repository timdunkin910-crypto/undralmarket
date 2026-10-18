import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireStaff } from "@/lib/auth";

export const metadata: Metadata = { title: { default: "Дэлгүүр", template: "%s · Дэлгүүр" } };

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-full flex-col bg-mint-soft">
      <header className="sticky top-0 z-30 border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
          <Logo href="/admin" />
          <AdminNav />
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 p-4">
        <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-white" aria-busy="true" />}>
          <StaffOnly>{children}</StaffOnly>
        </Suspense>
      </main>
    </div>
  );
}

async function StaffOnly({ children }: { children: React.ReactNode }) {
  await requireStaff();
  return <>{children}</>;
}

import { Suspense } from "react";
import { Clock3, Phone } from "lucide-react";
import { Logo } from "@/components/logo";
import { DesktopNav, TabBar } from "@/components/shop/tab-bar";
import { StatusPill } from "@/components/shop/status-pill";
import { getMe, getSettings } from "@/lib/data";
import { supabaseConfigured } from "@/lib/supabase/server";

// The header and tab bar are a static shell that paints instantly on slow mobile data;
// everything that depends on the signed-in resident streams in inside <Suspense>.
export default function ShopLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        Үндсэн агуулга руу шилжих
      </a>
      <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Logo />
          <DesktopNav />
          <Suspense fallback={<span className="size-11 md:hidden" />}>
            <CallButton />
          </Suspense>
        </div>
      </header>

      {!supabaseConfigured && (
        <div role="alert" className="bg-lime px-4 py-2 text-center text-sm font-medium text-forest">
          Туршилтын горим: жишээ бараа харуулж байна. Захиалга өгөхийн тулд .env.local-д Supabase түлхүүрээ оруулна уу.
        </div>
      )}
      <Suspense fallback={null}>
        <AccountBanner />
      </Suspense>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-28 md:pb-12">
        <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
      <TabBar />
    </>
  );
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Ачаалж байна">
      <div className="h-32 animate-pulse rounded-3xl bg-mint-soft" />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-mint-soft" />
        ))}
      </div>
    </div>
  );
}

async function CallButton() {
  const settings = await getSettings();
  return (
    <a
      href={`tel:${settings.shop_phone.replace(/\D/g, "")}`}
      className="grid size-11 shrink-0 place-items-center rounded-xl bg-mint-soft text-forest md:hidden"
      aria-label={`Дэлгүүр рүү залгах ${settings.shop_phone}`}
    >
      <Phone className="size-5" aria-hidden />
    </a>
  );
}

async function AccountBanner() {
  const [me, settings] = await Promise.all([getMe(), getSettings()]);
  if (me?.status === "pending") {
    return (
      <div role="status" className="flex items-center justify-center gap-2 bg-mint px-4 py-2 text-center text-sm font-medium text-forest">
        <Clock3 className="size-4 shrink-0" aria-hidden />
        Таны бүртгэл хүлээгдэж байна. Эзэн баталгаажуулсны дараа захиалах боломжтой.
      </div>
    );
  }
  if (me?.status === "blocked") {
    return (
      <div role="alert" className="bg-forest px-4 py-2 text-center text-sm font-medium text-white">
        Таны бүртгэл хаагдсан байна. Дэлгүүртэй холбогдоно уу: {settings.shop_phone}
      </div>
    );
  }
  return null;
}

async function Footer() {
  const settings = await getSettings();
  return (
    <footer className="hidden border-t bg-mint-soft md:block">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-muted-foreground">
        <p>
          {settings.building_name} · {settings.district}. Зөвхөн манай байрны оршин суугчдад.
        </p>
        <div className="flex items-center gap-4">
          <StatusPill openTime={settings.open_time} closeTime={settings.close_time} deliveryEnabled={settings.delivery_enabled} />
          <a href={`tel:${settings.shop_phone.replace(/\D/g, "")}`} className="font-medium text-forest">
            ☎ {settings.shop_phone}
          </a>
        </div>
      </div>
    </footer>
  );
}

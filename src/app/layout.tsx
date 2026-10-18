import type { Metadata, Viewport } from "next";
import { Onest } from "next/font/google";
import { CartProvider } from "@/lib/cart";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "undralmarket.mn — манай байрны дэлгүүр", template: "%s · undralmarket.mn" },
  description: "Байрныхаа доод давхрын дэлгүүрээс захиалаад 15–30 минутад хаалган дээрээ авна.",
  applicationName: "undralmarket.mn",
  appleWebApp: { capable: true, title: "Ундрал", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#16A34A",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="mn" className={`${onest.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <CartProvider>{children}</CartProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}

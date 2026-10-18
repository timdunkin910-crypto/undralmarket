import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "undralmarket.mn — манай байрны дэлгүүр",
    short_name: "Ундрал",
    description: "Байрныхаа дэлгүүрээс захиалаад 15–30 минутад хаалган дээрээ аваарай.",
    lang: "mn",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#16A34A",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "19 л ус", url: "/water" },
      { name: "Захиалга", url: "/orders" },
    ],
  };
}

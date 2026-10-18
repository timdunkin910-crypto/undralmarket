import { ImageResponse } from "next/og";

/** Leaf mark on brand green, rendered to PNG for the PWA / home-screen icon. */
export function brandIcon(size: number, { maskable = false } = {}) {
  const leaf = Math.round(size * (maskable ? 0.5 : 0.62));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#16A34A",
          borderRadius: maskable ? 0 : size * 0.22,
        }}
      >
        <svg width={leaf} height={leaf} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}

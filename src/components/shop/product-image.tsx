import Image from "next/image";
import { cn } from "@/lib/utils";

/** Product photo or, when there is none, the category emoji on mint. */
export function ProductImage({
  src,
  alt,
  emoji = "🛒",
  sizes = "(max-width: 768px) 50vw, 240px",
  className,
  priority,
}: {
  src: string | null;
  alt: string;
  emoji?: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={cn("relative grid aspect-square place-items-center overflow-hidden rounded-xl bg-mint-soft", className)}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} className="object-contain p-[8%]" priority={priority} />
      ) : (
        <span className="text-[clamp(40px,12vw,64px)] leading-none" role="img" aria-label={alt}>
          {emoji}
        </span>
      )}
    </div>
  );
}

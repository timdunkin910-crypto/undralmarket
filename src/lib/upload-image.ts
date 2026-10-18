import { getBrowserClient } from "./supabase/client";

/** Shrinks a phone photo to ≤1000px WebP so it loads fast on mobile data. */
async function compress(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1000 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), "image/webp", 0.82));
}

/** Uploads a staff photo to the public "products" bucket and returns its URL. */
export async function uploadPhoto(file: File, folder = ""): Promise<string> {
  const sb = getBrowserClient();
  if (!sb) throw new Error("Supabase is not configured");
  const blob = await compress(file);
  const path = `${folder}${crypto.randomUUID()}.webp`;
  const { error } = await sb.storage.from("products").upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
  if (error) throw error;
  return sb.storage.from("products").getPublicUrl(path).data.publicUrl;
}

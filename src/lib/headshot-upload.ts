"use client";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/env";

/** Square-crop and shrink to 600px JPEG before upload. */
export async function squareJpeg(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const side = Math.min(bmp.width, bmp.height);
    const c = document.createElement("canvas");
    c.width = c.height = Math.min(600, side);
    c.getContext("2d")!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob((b) => res(b ?? file), "image/jpeg", 0.86));
  } catch {
    return file;
  }
}

/** Upload a headshot to the signed-in user's folder and return its public URL. */
export async function uploadHeadshot(file: File, userId: string): Promise<string> {
  const blob = await squareJpeg(file);
  if (supabaseConfigured) {
    const sb = createClient();
    const path = `${userId}/avatar-${crypto.randomUUID()}.jpg`;
    const { error } = await sb.storage.from("agent-photos").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
    if (error) throw new Error(error.message);
    return sb.storage.from("agent-photos").getPublicUrl(path).data.publicUrl;
  }
  const fd = new FormData();
  fd.append("file", blob, "avatar.jpg");
  const r = await fetch("/api/demo/photos", { method: "POST", body: fd });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error);
  return j.url as string;
}

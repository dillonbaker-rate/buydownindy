"use client";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/env";

/** Upload a cropped headshot (a square JPEG from HeadshotCropper) to the signed-in user's folder and return its public URL. */
export async function uploadHeadshot(blob: Blob, userId: string): Promise<string> {
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

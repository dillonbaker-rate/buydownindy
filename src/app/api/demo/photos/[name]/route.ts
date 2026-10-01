import { promises as fs } from "node:fs";
import path from "node:path";
import { UPLOADS } from "@/lib/demo-store";
import { demoMode } from "@/lib/supabase/env";

const MIME: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!demoMode || !/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(name)) return new Response("Not found", { status: 404 });
  try {
    const buf = await fs.readFile(path.join(UPLOADS, name));
    return new Response(buf, { headers: { "content-type": MIME[name.split(".")[1]], "cache-control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

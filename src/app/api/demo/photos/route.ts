import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { UPLOADS } from "@/lib/demo-store";
import { demoMode } from "@/lib/supabase/env";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// Local demo photo upload (stands in for Supabase Storage). Dev only.
export async function POST(req: Request) {
  if (!demoMode) return NextResponse.json({ error: "Not available." }, { status: 404 });
  const file = (await req.formData()).get("file");
  if (!(file instanceof Blob) || !TYPES[file.type] || file.size > 10 * 1024 * 1024)
    return NextResponse.json({ error: "Use a JPG, PNG or WebP under 10 MB." }, { status: 400 });
  const name = `${crypto.randomUUID()}.${TYPES[file.type]}`;
  await fs.mkdir(UPLOADS, { recursive: true });
  await fs.writeFile(path.join(UPLOADS, name), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ url: `/api/demo/photos/${name}`, path: `demo/${name}` });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { recordEvent, SITE_EVENTS } from "@/lib/site-events";

const Body = z.object({ name: z.enum(SITE_EVENTS) });

// Public: record an anonymous usage count (e.g. a calculator was used). No personal data is stored.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Unknown event." }, { status: 400 });
  await recordEvent(parsed.data.name);
  return NextResponse.json({ ok: true });
}

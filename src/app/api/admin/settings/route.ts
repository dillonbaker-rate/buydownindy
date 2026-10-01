import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAgent } from "@/lib/data";
import { setMarketingEnabled } from "@/lib/marketing";
import { isAdmin } from "@/lib/rates";

const Body = z.object({ marketingEnabled: z.boolean() });

// Admin: turn the website & newsletter tools on or off for agents.
export async function PUT(req: Request) {
  const me = await getCurrentAgent();
  if (!me || !isAdmin(me.email)) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const err = await setMarketingEnabled(parsed.data.marketingEnabled);
  return err ? NextResponse.json({ error: err }, { status: 400 }) : NextResponse.json({ ok: true });
}

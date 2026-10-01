import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAgent } from "@/lib/data";
import { canUseMarketing, createApiKey } from "@/lib/marketing";

const Body = z.object({ name: z.string().trim().min(1).max(60).default("My website") });

// Create an API key for the signed-in agent. The full key is returned once.
export async function POST(req: Request) {
  const me = await getCurrentAgent();
  if (!me?.agent) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const can = await canUseMarketing(me.email, me.agent);
  if (!can.ok) return NextResponse.json({ error: can.reason }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Give the key a short name." }, { status: 400 });
  const res = await createApiKey(me.userId, parsed.data.name);
  return "error" in res ? NextResponse.json({ error: res.error }, { status: 500 }) : NextResponse.json(res);
}

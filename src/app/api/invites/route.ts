import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAgent } from "@/lib/data";
import { createInvite } from "@/lib/invites";

const Body = z.object({
  clientName: z.string().trim().min(1).max(120),
  clientEmail: z.string().trim().regex(/^\S+@\S+\.\S+$/).max(200).optional().or(z.literal("")),
  clientPhone: z.string().trim().max(40).optional().or(z.literal("")),
});

// Create a personal invite link for one of the signed-in agent's clients.
export async function POST(req: Request) {
  const me = await getCurrentAgent();
  if (!me?.agent) return NextResponse.json({ error: "Sign in and finish your profile first." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your client's name (and a valid email if you add one)." }, { status: 400 });
  const res = await createInvite(me.userId, parsed.data);
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: 500 });
  return NextResponse.json({ code: res.code, url: `${new URL(req.url).origin}/i/${res.code}` });
}

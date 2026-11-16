import { NextResponse } from "next/server";
import { z } from "zod";
import { mustAcceptTerms } from "@/lib/agent-terms-gate";
import { getCurrentAgent } from "@/lib/data";
import { claimListing } from "@/lib/handoff";

const Body = z.object({ confirmed: z.literal(true) });

// Agent: take a hidden listing that was sent to them. It moves to their account and goes live for 30 days.
// The database re-checks the link, that it was sent to this agent's email, and that they have a profile.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const me = await getCurrentAgent();
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!me.agent) return NextResponse.json({ error: "Finish your agent profile first." }, { status: 403 });
  if (mustAcceptTerms(me.agent, me.email)) return NextResponse.json({ error: "Please accept the Agent Terms on My listings first." }, { status: 403 });
  if (!Body.safeParse(await req.json().catch(() => null)).success)
    return NextResponse.json({ error: "Confirm this is your listing and you can use the photos." }, { status: 400 });
  const r = await claimListing((await params).token);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true, id: r.id });
}

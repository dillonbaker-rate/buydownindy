import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAgent } from "@/lib/data";
import { isSuperAdmin, LEAD_STATUSES, updateLead } from "@/lib/leads";

const Body = z.object({
  status: z.enum(LEAD_STATUSES.map((s) => s.value) as [string, ...string[]]).optional(),
  notes: z.string().max(4000).nullable().optional(),
});

// Super admin: update a lead's status or notes.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentAgent();
  if (!me || !isSuperAdmin(me.email)) return NextResponse.json({ error: "Super admin only." }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const err = await updateLead((await params).id, parsed.data as Parameters<typeof updateLead>[1]);
  return err ? NextResponse.json({ error: err }, { status: 400 }) : NextResponse.json({ ok: true });
}

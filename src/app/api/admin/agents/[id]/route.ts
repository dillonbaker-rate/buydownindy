import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAgent } from "@/lib/data";
import { saveDemoAgent } from "@/lib/demo-store";
import { isAdmin } from "@/lib/rates";
import { demoMode } from "@/lib/supabase/env";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const Body = z.object({ status: z.enum(["verified", "rejected", "pending"]) });

// Admin: set an agent's license verification status.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentAgent();
  if (!me || !isAdmin(me.email)) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad status." }, { status: 400 });
  const { status } = parsed.data;
  const patch = { verification_status: status, verified_at: status === "verified" ? new Date().toISOString() : null };
  if (demoMode) {
    await saveDemoAgent({ verificationStatus: status, verifiedAt: patch.verified_at });
    return NextResponse.json({ ok: true });
  }
  const { id } = await params;
  // RLS (public.is_admin) allows this with the admin's own session; the service key also works if set.
  const sb = createAdminClient() ?? (await createClient());
  const { data, error } = await sb.from("agents").update(patch).eq("id", id).select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data?.length) return NextResponse.json({ error: "Not allowed. Run migration 0003 in Supabase." }, { status: 403 });
  return NextResponse.json({ ok: true });
}

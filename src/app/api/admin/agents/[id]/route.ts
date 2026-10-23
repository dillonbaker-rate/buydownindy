import { after, NextResponse } from "next/server";
import { z } from "zod";
import { sendAgentVerifiedEmail } from "@/lib/agent-email";
import { getCurrentAgent } from "@/lib/data";
import { resetDemoAgent, saveDemoAgent } from "@/lib/demo-store";
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
  const { data: before } = await sb.from("agents").select("verification_status").eq("id", id).maybeSingle();
  const { data, error } = await sb.from("agents").update(patch).eq("id", id).select("id, name, email");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data?.length) return NextResponse.json({ error: "Not allowed. Run migration 0003 in Supabase." }, { status: 403 });
  // Tell the agent once, when they first become verified (no email for rejected or back to pending).
  const agent = data[0];
  if (status === "verified" && before?.verification_status !== "verified" && agent.email)
    after(() => sendAgentVerifiedEmail({ name: agent.name ?? "", email: agent.email }));
  return NextResponse.json({ ok: true });
}

// Admin: permanently delete an applicant whose license couldn't be verified — their sign-in account,
// profile and listings. Only agents marked "Can't verify" (rejected) can be deleted.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentAgent();
  if (!me || !isAdmin(me.email)) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  if (demoMode) {
    await resetDemoAgent();
    return NextResponse.json({ ok: true });
  }
  const { id } = await params;
  const sb = await createClient();
  const { data: agent } = await sb.from("agents").select("verification_status").eq("id", id).maybeSingle();
  if (!agent) return NextResponse.json({ error: "Agent not found." }, { status: 404 });
  if (agent.verification_status !== "rejected")
    return NextResponse.json({ error: "Mark the agent \"Can't verify\" before deleting." }, { status: 400 });
  // Runs as the signed-in admin; the database function re-checks admin rights (migration 0011).
  const { error } = await sb.rpc("admin_delete_agent", { target: id });
  if (error) {
    const missing = /admin_delete_agent/.test(error.message) && /find|exist|schema cache/i.test(error.message);
    return NextResponse.json({ error: missing ? "Run migration 0011 in Supabase to turn on deleting." : error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

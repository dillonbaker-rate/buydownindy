import { NextResponse } from "next/server";
import { AGENT_TERMS_VERSION } from "@/content/agent-terms";
import { saveDemoAgent } from "@/lib/demo-store";
import { demoMode } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { logTermsAcceptance } from "@/lib/agent-terms-gate";

// The signed-in agent accepts the current Agent Terms.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (body?.version !== AGENT_TERMS_VERSION) return NextResponse.json({ error: "These terms have changed. Reload the page." }, { status: 409 });
  const at = new Date().toISOString();
  if (demoMode) {
    await saveDemoAgent({ termsVersion: AGENT_TERMS_VERSION, termsAcceptedAt: at });
    return NextResponse.json({ ok: true });
  }
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { error } = await sb.from("agents").update({ terms_version: AGENT_TERMS_VERSION, terms_accepted_at: at }).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await logTermsAcceptance(sb, user.id, user.email ?? null, at, req);
  return NextResponse.json({ ok: true });
}

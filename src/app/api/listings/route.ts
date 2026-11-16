import { NextResponse } from "next/server";
import { AgentContact, contactRow, ListingInput, toRow } from "@/lib/listing-schema";
import { demoCreate } from "@/lib/demo-store";
import { demoMode } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { agentFromRow, LISTING_DAYS } from "@/lib/types";
import { mustAcceptTerms } from "@/lib/agent-terms-gate";
import { isAdmin } from "@/lib/rates";

const expiry = () => new Date(Date.now() + LISTING_DAYS * 86_400_000).toISOString();

// Publish a listing. RLS ensures agent_id = the signed-in user.
// Admins can post it hidden ({ hidden: true }): off the map, to hand off to an agent later.
export async function POST(req: Request) {
  const raw = await req.json().catch(() => null);
  const hidden = raw?.hidden === true;
  const contact = AgentContact.safeParse(raw ?? {});
  if (!contact.success) return NextResponse.json({ error: contact.error.issues[0]?.message ?? "Check the agent's details." }, { status: 400 });
  if (demoMode) {
    const parsed = ListingInput.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: "Check the listing details.", issues: parsed.error.issues }, { status: 400 });
    return NextResponse.json({ id: await demoCreate(parsed.data, hidden, hidden ? contact.data : {}) });
  }
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to post a listing." }, { status: 401 });
  const { data: me } = await sb.from("agents").select("*").eq("id", user.id).maybeSingle();
  if (me && mustAcceptTerms(agentFromRow(me), user.email))
    return NextResponse.json({ error: "Please accept the Agent Terms on My listings first." }, { status: 403 });

  if (hidden && !isAdmin(user.email)) return NextResponse.json({ error: "Only admins can post hidden listings." }, { status: 403 });
  const parsed = ListingInput.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Check the listing details.", issues: parsed.error.issues }, { status: 400 });

  const { data, error } = await sb
    .from("listings")
    .insert({ ...toRow(parsed.data), ...(hidden ? contactRow(contact.data) : {}), agent_id: user.id, status: hidden ? "draft" : "live", expires_at: expiry() })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id });
}

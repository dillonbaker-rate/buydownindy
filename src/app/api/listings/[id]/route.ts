import { NextResponse } from "next/server";
import { AgentContact, contactRow, ListingInput, StatusAction, toRow } from "@/lib/listing-schema";
import { demoDelete, demoUpdate } from "@/lib/demo-store";
import { demoMode } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { LISTING_DAYS } from "@/lib/types";
import { isAdmin } from "@/lib/rates";

type Ctx = { params: Promise<{ id: string }> };
const expiry = () => new Date(Date.now() + LISTING_DAYS * 86_400_000).toISOString();

async function authed() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return { sb, user };
}

// Edit a listing (full wizard payload) or change its status: { action: renew | pending | sold | live | draft }.
// "draft" hides the listing (admins only).
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  if (demoMode) {
    const body = await req.json().catch(() => null);
    const act = StatusAction.safeParse(body);
    const input = act.success ? null : ListingInput.safeParse(body);
    if (input && !input.success) return NextResponse.json({ error: "Check the listing details.", issues: input.error.issues }, { status: 400 });
    const contact = AgentContact.safeParse(body ?? {});
    const ok = await demoUpdate(id, act.success ? { action: act.data.action } : { input: input!.data!, contact: contact.success ? contact.data : {} });
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }
  const { sb, user } = await authed();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => null);

  let patch: Record<string, unknown>;
  const act = StatusAction.safeParse(body);
  if (act.success) {
    const a = act.data.action;
    if (a === "draft" && !isAdmin(user.email)) return NextResponse.json({ error: "Only admins can hide listings." }, { status: 403 });
    patch =
      a === "renew"
        ? { expires_at: expiry() }
        : a === "live"
          ? { status: "live" }
          : { status: a };
    // Moving back to live after expiry would hide it again immediately; give it a fresh window.
    if (a === "live") {
      const { data: cur } = await sb.from("listings").select("expires_at, status").eq("id", id).single();
      if (cur && new Date(cur.expires_at) < new Date()) patch.expires_at = expiry();
      // A hidden listing the admin puts live themselves: its private agent link and email no longer apply.
      if (cur?.status === "draft") Object.assign(patch, { handoff_token: null, handoff_email: null });
    }
  } else {
    const parsed = ListingInput.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Check the listing details.", issues: parsed.error.issues }, { status: 400 });
    patch = toRow(parsed.data);
  }

  const { data, error } = await sb.from("listings").update(patch).eq("id", id).eq("agent_id", user.id).select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data?.length) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  // Admins editing a hidden listing can also change who it's for (the listing agent's name and email).
  if (!act.success && isAdmin(user.email)) {
    const contact = AgentContact.safeParse(body ?? {});
    if (!contact.success) return NextResponse.json({ error: contact.error.issues[0]?.message ?? "Check the agent's details." }, { status: 400 });
    const fields = contactRow(contact.data);
    if (Object.keys(fields).length) {
      const { error: e2 } = await sb.from("listings").update(fields).eq("id", id).eq("agent_id", user.id).eq("status", "draft");
      if (e2) return NextResponse.json({ error: e2.message }, { status: 400 });
    }
  }
  return NextResponse.json({ ok: true });
}

// Delete the signed-in agent's own listing and its uploaded photos.
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (demoMode) return (await demoDelete(id)) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Listing not found." }, { status: 404 });
  const { sb, user } = await authed();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { data, error } = await sb.from("listings").delete().eq("id", id).eq("agent_id", user.id).select("id, photos");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  // RLS hides rows it won't let you delete, so nothing deleted = not yours, or migration 0008 not run yet.
  if (!data?.length) return NextResponse.json({ error: "Couldn't delete that listing." }, { status: 404 });
  const paths = ((data[0].photos ?? []) as { path?: string }[]).map((p) => p.path).filter((p): p is string => !!p);
  if (paths.length) await sb.storage.from("listing-photos").remove(paths);
  return NextResponse.json({ ok: true });
}

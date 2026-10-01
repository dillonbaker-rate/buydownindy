import { NextResponse } from "next/server";
import { ListingInput, StatusAction, toRow } from "@/lib/listing-schema";
import { createClient } from "@/lib/supabase/server";
import { LISTING_DAYS } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };
const expiry = () => new Date(Date.now() + LISTING_DAYS * 86_400_000).toISOString();

async function authed() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return { sb, user };
}

// Edit a listing (full wizard payload) or change its status: { action: renew | pending | sold | live }.
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const { sb, user } = await authed();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => null);

  let patch: Record<string, unknown>;
  const act = StatusAction.safeParse(body);
  if (act.success) {
    const a = act.data.action;
    patch =
      a === "renew"
        ? { expires_at: expiry() }
        : a === "live"
          ? { status: "live" }
          : { status: a };
    // Moving back to live after expiry would hide it again immediately; give it a fresh window.
    if (a === "live") {
      const { data: cur } = await sb.from("listings").select("expires_at").eq("id", id).single();
      if (cur && new Date(cur.expires_at) < new Date()) patch.expires_at = expiry();
    }
  } else {
    const parsed = ListingInput.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Check the listing details.", issues: parsed.error.issues }, { status: 400 });
    patch = toRow(parsed.data);
  }

  const { data, error } = await sb.from("listings").update(patch).eq("id", id).eq("agent_id", user.id).select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data?.length) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

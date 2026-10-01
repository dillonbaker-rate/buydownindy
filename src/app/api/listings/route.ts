import { NextResponse } from "next/server";
import { ListingInput, toRow } from "@/lib/listing-schema";
import { demoCreate } from "@/lib/demo-store";
import { demoMode } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { LISTING_DAYS } from "@/lib/types";

const expiry = () => new Date(Date.now() + LISTING_DAYS * 86_400_000).toISOString();

// Publish a listing. RLS ensures agent_id = the signed-in user.
export async function POST(req: Request) {
  if (demoMode) {
    const parsed = ListingInput.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Check the listing details.", issues: parsed.error.issues }, { status: 400 });
    return NextResponse.json({ id: await demoCreate(parsed.data) });
  }
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to post a listing." }, { status: 401 });

  const parsed = ListingInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the listing details.", issues: parsed.error.issues }, { status: 400 });

  const { data, error } = await sb
    .from("listings")
    .insert({ ...toRow(parsed.data), agent_id: user.id, status: "live", expires_at: expiry() })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id });
}

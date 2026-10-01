import { NextResponse } from "next/server";
import { parsePmms } from "@/lib/pmms";
import { createAdminClient } from "@/lib/supabase/server";

// Weekly: pull the latest Freddie Mac PMMS 30-year average and store it as a RateSnapshot.
// Scheduled in vercel.json (Thursdays, after Freddie Mac's noon ET release). Vercel sends
// `Authorization: Bearer $CRON_SECRET`.
const PMMS_CSV = "https://www.freddiemac.com/pmms/docs/PMMS_history.csv";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY not set" }, { status: 500 });

  const r = await fetch(PMMS_CSV, { cache: "no-store" });
  if (!r.ok) return NextResponse.json({ error: `PMMS fetch failed: ${r.status}` }, { status: 502 });
  const latest = parsePmms(await r.text());
  if (!latest) return NextResponse.json({ error: "Could not parse PMMS CSV" }, { status: 502 });

  const { error } = await admin
    .from("rate_snapshots")
    .upsert({ week_of: latest.weekOf, rate_30yr: latest.rate, source: "Freddie Mac PMMS" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, ...latest });
}

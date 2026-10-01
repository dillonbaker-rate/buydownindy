import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { parsePmms } from "./pmms";
import { indyToday, type RateInfo } from "./rate-info";
import { supabaseConfigured } from "./supabase/env";
import { createAdminClient, createClient } from "./supabase/server";

// Last-resort fallback if neither a daily entry nor PMMS is reachable (the design's sample).
const SAMPLE: RateInfo = { source: "pmms", date: "2026-09-24", rates: { Conventional: 6.25, FHA: 6.25, VA: 6.25 } };
const PMMS_CSV = "https://www.freddiemac.com/pmms/docs/PMMS_history.csv";

export interface DailyRates {
  date: string;
  conventional: number;
  fha: number;
  va: number;
}

// ── Daily rates Dillon enters ──────────────────────────────────────────
// Stored in Supabase (`daily_rates`). In local demo mode (no Supabase) they go to .data/daily-rates.json.
const DEMO_FILE = path.join(process.cwd(), ".data", "daily-rates.json");

export async function getLatestDaily(): Promise<DailyRates | null> {
  if (!supabaseConfigured) {
    try {
      const all = JSON.parse(await fs.readFile(DEMO_FILE, "utf8")) as DailyRates[];
      return all.sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
    } catch {
      return null;
    }
  }
  const sb = await createClient();
  const { data } = await sb
    .from("daily_rates")
    .select("rate_date, conventional, fha, va")
    .order("rate_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data
    ? { date: data.rate_date, conventional: Number(data.conventional), fha: Number(data.fha), va: Number(data.va) }
    : null;
}

export async function saveDaily(d: DailyRates, userId: string | null): Promise<string | null> {
  if (!supabaseConfigured) {
    let all: DailyRates[] = [];
    try {
      all = JSON.parse(await fs.readFile(DEMO_FILE, "utf8"));
    } catch {}
    all = [d, ...all.filter((x) => x.date !== d.date)];
    await fs.mkdir(path.dirname(DEMO_FILE), { recursive: true });
    await fs.writeFile(DEMO_FILE, JSON.stringify(all, null, 2));
    return null;
  }
  const admin = createAdminClient();
  if (!admin) return "SUPABASE_SERVICE_ROLE_KEY is not set.";
  const { error } = await admin
    .from("daily_rates")
    .upsert({ rate_date: d.date, conventional: d.conventional, fha: d.fha, va: d.va, entered_by: userId });
  return error?.message ?? null;
}

// ── Freddie Mac PMMS (weekly) ──────────────────────────────────────────
async function getPmms(): Promise<{ weekOf: string; rate: number } | null> {
  if (supabaseConfigured) {
    const sb = await createClient();
    const { data } = await sb
      .from("rate_snapshots")
      .select("week_of, rate_30yr")
      .order("week_of", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return { weekOf: data.week_of, rate: Number(data.rate_30yr) };
  }
  // No snapshot yet (or demo mode): read Freddie Mac's CSV directly, cached for 6 hours.
  try {
    const r = await fetch(PMMS_CSV, { next: { revalidate: 21600 } });
    return r.ok ? parsePmms(await r.text()) : null;
  } catch {
    return null;
  }
}

/**
 * The rate the site uses: today's daily entry if Dillon entered one for today (Indianapolis time),
 * otherwise the latest Freddie Mac PMMS weekly average for every loan type.
 */
export async function getRateInfo(): Promise<RateInfo> {
  const daily = await getLatestDaily();
  if (daily && daily.date === indyToday()) {
    return { source: "daily", date: daily.date, rates: { Conventional: daily.conventional, FHA: daily.fha, VA: daily.va } };
  }
  const p = await getPmms();
  if (!p) return SAMPLE;
  return { source: "pmms", date: p.weekOf, rates: { Conventional: p.rate, FHA: p.rate, VA: p.rate } };
}

/** Who may enter daily rates: emails in ADMIN_EMAILS. In local demo mode, anyone on localhost. */
export function isRateAdmin(email: string | null | undefined): boolean {
  if (!supabaseConfigured) return process.env.NODE_ENV !== "production";
  const list = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!email && list.includes(email.toLowerCase());
}

import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { demoMode, supabaseConfigured } from "./supabase/env";
import { createClient } from "./supabase/server";

// Anonymous usage counts (Supabase `site_events`, migration 0010; .data/events.json in local demo mode).
export const SITE_EVENTS = ["calc_payment", "calc_buydown"] as const;
export type SiteEvent = (typeof SITE_EVENTS)[number];

const FILE = path.join(process.cwd(), ".data", "events.json");
type Row = { name: SiteEvent; created_at: string };

async function readDemo(): Promise<Row[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return [];
  }
}

export async function recordEvent(name: SiteEvent): Promise<void> {
  if (demoMode) {
    const all = await readDemo();
    all.push({ name, created_at: new Date().toISOString() });
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(all));
    return;
  }
  if (!supabaseConfigured) return;
  const { error } = await (await createClient()).from("site_events").insert({ name });
  if (error) console.error("recordEvent", error.message);
}

/** How many times `name` happened since `since` (all time when omitted). Null if the table isn't there yet. */
export async function countEvents(name: SiteEvent, since?: Date): Promise<number | null> {
  if (demoMode) return (await readDemo()).filter((r) => r.name === name && (!since || new Date(r.created_at) >= since)).length;
  if (!supabaseConfigured) return null;
  let q = (await createClient()).from("site_events").select("id", { count: "exact", head: true }).eq("name", name);
  if (since) q = q.gte("created_at", since.toISOString());
  const { count, error } = await q;
  return error ? null : (count ?? 0);
}

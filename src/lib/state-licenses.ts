import "server-only";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { demoAgent, saveDemoAgent } from "./demo-store";
import { indyDate, matchLicense, normalizeLicense, type MatchResult, type StateLicense } from "./state-licenses-shared";
import { demoMode, supabaseConfigured } from "./supabase/env";
import { createAdminClient, createClient } from "./supabase/server";

// Indiana licensee list (migration 0017): imported monthly by an admin from the state's bulk download, and used to
// verify agents automatically on sign-up (and pending agents after each import) when the match is clear.

export interface ImportInfo {
  id: string;
  fileName: string | null;
  rows: number;
  agentsVerified: number;
  startedAt: string;
  finishedAt: string | null;
}

// ── Demo storage ─────────────────────────────────────────────────────────
const FILE = path.join(process.cwd(), ".data", "state-licenses.json");
type Demo = { licenses: Record<string, StateLicense & { batch: string }>; imports: ImportInfo[] };
async function readDemo(): Promise<Demo> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return { licenses: {}, imports: [] };
  }
}
async function writeDemo(d: Demo) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(d));
}

const missingTable = (msg: string) => /state_licen/.test(msg);
const SETUP = "Run migration 0017 in Supabase first.";

// ── Import (admin session; row-level security allows admins) ─────────────
export async function startImport(fileName: string): Promise<{ id: string } | { error: string }> {
  const id = `${new Date().toISOString().slice(0, 10)}-${randomUUID().slice(0, 8)}`;
  if (demoMode) {
    const d = await readDemo();
    d.imports.unshift({ id, fileName, rows: 0, agentsVerified: 0, startedAt: new Date().toISOString(), finishedAt: null });
    await writeDemo(d);
    return { id };
  }
  const { error } = await (await createClient()).from("state_license_imports").insert({ id, file_name: fileName });
  return error ? { error: missingTable(error.message) ? SETUP : error.message } : { id };
}

export async function addRows(batch: string, rows: StateLicense[]): Promise<string | null> {
  // The same license twice in one file: keep the last.
  const unique = [...new Map(rows.map((r) => [normalizeLicense(r.license_number), { ...r, license_number: normalizeLicense(r.license_number) }])).values()];
  if (demoMode) {
    const d = await readDemo();
    for (const r of unique) d.licenses[r.license_number] = { ...r, batch };
    await writeDemo(d);
    return null;
  }
  const now = new Date().toISOString();
  const { error } = await (await createClient())
    .from("state_licenses")
    .upsert(unique.map((r) => ({ ...r, batch, imported_at: now })), { onConflict: "license_number" });
  return error ? (missingTable(error.message) ? SETUP : error.message) : null;
}

/** Finish an import: drop licenses the new file no longer has, record the count, and verify pending agents that now match. */
export async function finishImport(batch: string): Promise<{ rows: number; agentsVerified: number } | { error: string }> {
  if (demoMode) {
    const d = await readDemo();
    for (const [k, v] of Object.entries(d.licenses)) if (v.batch !== batch) delete d.licenses[k];
    const rows = Object.keys(d.licenses).length;
    await writeDemo(d);
    const agentsVerified = await verifyPendingAgents();
    const d2 = await readDemo();
    const imp = d2.imports.find((i) => i.id === batch);
    if (imp) Object.assign(imp, { rows, agentsVerified, finishedAt: new Date().toISOString() });
    await writeDemo(d2);
    return { rows, agentsVerified };
  }
  const sb = await createClient();
  const { error: delErr } = await sb.from("state_licenses").delete().neq("batch", batch);
  if (delErr) return { error: delErr.message };
  const { count } = await sb.from("state_licenses").select("license_number", { count: "exact", head: true });
  const agentsVerified = await verifyPendingAgents(sb);
  await sb
    .from("state_license_imports")
    .update({ rows: count ?? 0, agents_verified: agentsVerified, finished_at: new Date().toISOString() })
    .eq("id", batch);
  return { rows: count ?? 0, agentsVerified };
}

export async function lastImport(): Promise<ImportInfo | null | "not-set-up"> {
  if (demoMode) return (await readDemo()).imports.find((i) => i.finishedAt) ?? null;
  if (!supabaseConfigured) return null;
  const { data, error } = await (await createClient())
    .from("state_license_imports")
    .select("*")
    .not("finished_at", "is", null)
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return missingTable(error.message) ? "not-set-up" : null;
  return data
    ? { id: data.id, fileName: data.file_name, rows: data.rows, agentsVerified: data.agents_verified, startedAt: data.started_at, finishedAt: data.finished_at }
    : null;
}

// ── Matching ─────────────────────────────────────────────────────────────
async function lookup(sb: SupabaseClient | null, licenseNumber: string): Promise<StateLicense | null> {
  const key = normalizeLicense(licenseNumber);
  if (!key) return null;
  if (demoMode) return (await readDemo()).licenses[key] ?? null;
  if (!sb) return null;
  const { data } = await sb.from("state_licenses").select("*").eq("license_number", key).maybeSingle();
  return (data as StateLicense) ?? null;
}

/**
 * Check an agent against the state list and, on a clear match, mark them verified. Returns the result, or null
 * when the list isn't loaded / the license isn't on it (the agent stays pending). `sb` must be allowed to read the
 * list and set verification: the service-key client (sign-up) or an admin's session (after an import).
 */
export async function verifyFromStateList(
  agent: { id: string; name: string; licenseNumber: string | null | undefined },
  sb: SupabaseClient | null = createAdminClient(),
): Promise<MatchResult | null> {
  if (!agent.licenseNumber) return null;
  const r = await lookup(sb, agent.licenseNumber);
  if (!r) return null;
  const m = matchLicense(agent.name, r, indyDate());
  if (!m.ok) return m;
  if (demoMode) {
    await saveDemoAgent({ verificationStatus: "verified", verifiedAt: new Date().toISOString() });
    return m;
  }
  const { error } = await sb!.from("agents").update({ verification_status: "verified", verified_at: new Date().toISOString() }).eq("id", agent.id);
  if (error) {
    console.error("[state-licenses] verify", error.message);
    return { ok: false, reason: error.message };
  }
  return m;
}

/** After an import: verify every pending agent whose license now clearly matches. Returns how many were verified. */
export async function verifyPendingAgents(sb?: SupabaseClient): Promise<number> {
  if (demoMode) {
    const a = await demoAgent();
    if ((a.verificationStatus ?? "pending") !== "pending") return 0;
    return (await verifyFromStateList({ id: a.id, name: a.name, licenseNumber: a.licenseNumber }, null))?.ok ? 1 : 0;
  }
  const client = sb ?? createAdminClient();
  if (!client) return 0;
  const { data } = await client.from("agents").select("id, name, license_number").eq("verification_status", "pending").not("license_number", "is", null);
  let n = 0;
  for (const a of data ?? []) {
    const m = await verifyFromStateList({ id: a.id, name: a.name, licenseNumber: a.license_number }, client);
    if (m?.ok) n++;
  }
  return n;
}

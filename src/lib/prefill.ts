import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { demoMode, supabaseConfigured } from "./supabase/env";
import { createAdminClient, createClient } from "./supabase/server";
import { COUNTIES } from "./types";

// Agent profiles prepared ahead of time (migration 0016, table agent_prefills; .data/prefills.json in demo mode).
// The admin (or Grok) fills them in by email; when that agent signs up, their profile form opens pre-filled.

const text = (max: number) => z.string().trim().max(max).nullish();
export const PrefillInput = z.object({
  email: z.string().trim().toLowerCase().email("Enter the agent's email."),
  name: text(120),
  brokerage: text(120),
  phone: text(40),
  teamName: text(120),
  officePhone: text(40),
  officeAddress: text(200),
  licenseNumber: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || /^[A-Z0-9-]{6,14}$/.test(v), "Indiana license numbers look like RB14012345.")
    .nullish(),
  mlsId: text(40),
  licensedSince: z.number().int().min(1950).max(new Date().getFullYear()).nullish(),
  counties: z.array(z.enum(COUNTIES)).nullish(),
  website: z
    .string()
    .trim()
    .max(300)
    .refine((u) => !u || /^https?:\/\/\S+\.\S+/i.test(u), "Use a full link starting with https://")
    .nullish(),
  instagram: text(100),
  facebook: text(200),
  linkedin: text(200),
  bio: text(600),
  /** The admin checked the license on mylicense.in.gov: the agent is verified when they save with the same number. */
  licenseVerified: z.boolean().optional(),
  /** Admin-only notes, e.g. where the details came from. */
  notes: text(2000),
});
export type PrefillInput = z.infer<typeof PrefillInput>;

export interface Prefill extends Omit<PrefillInput, "licenseVerified" | "notes"> {
  licenseVerified: boolean;
  notes?: string | null;
  updatedAt?: string;
  usedAt?: string | null;
}

const toRow = (p: PrefillInput) => {
  const r: Record<string, unknown> = { email: p.email, updated_at: new Date().toISOString() };
  const map: [keyof PrefillInput, string][] = [
    ["name", "name"],
    ["brokerage", "brokerage"],
    ["phone", "phone"],
    ["teamName", "team_name"],
    ["officePhone", "office_phone"],
    ["officeAddress", "office_address"],
    ["licenseNumber", "license_number"],
    ["mlsId", "mls_id"],
    ["licensedSince", "licensed_since"],
    ["counties", "counties"],
    ["website", "website"],
    ["instagram", "instagram"],
    ["facebook", "facebook"],
    ["linkedin", "linkedin"],
    ["bio", "bio"],
    ["licenseVerified", "license_verified"],
    ["notes", "notes"],
  ];
  for (const [k, col] of map) if (p[k] !== undefined) r[col] = p[k] === "" ? null : p[k];
  return r;
};

export const fromRow = (r: Record<string, unknown>): Prefill => ({
  email: r.email as string,
  name: (r.name as string) ?? null,
  brokerage: (r.brokerage as string) ?? null,
  phone: (r.phone as string) ?? null,
  teamName: (r.team_name as string) ?? null,
  officePhone: (r.office_phone as string) ?? null,
  officeAddress: (r.office_address as string) ?? null,
  licenseNumber: (r.license_number as string) ?? null,
  mlsId: (r.mls_id as string) ?? null,
  licensedSince: (r.licensed_since as number) ?? null,
  counties: (r.counties as Prefill["counties"]) ?? [],
  website: (r.website as string) ?? null,
  instagram: (r.instagram as string) ?? null,
  facebook: (r.facebook as string) ?? null,
  linkedin: (r.linkedin as string) ?? null,
  bio: (r.bio as string) ?? null,
  licenseVerified: !!r.license_verified,
  notes: (r.notes as string) ?? null,
  updatedAt: r.updated_at as string,
  usedAt: (r.used_at as string) ?? null,
});

// ── Demo storage ─────────────────────────────────────────────────────────
const FILE = path.join(process.cwd(), ".data", "prefills.json");
async function readDemo(): Promise<Record<string, Record<string, unknown>>> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return {};
  }
}
async function writeDemo(all: Record<string, Record<string, unknown>>) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(all, null, 2));
}

/** Admin: create or update a prepared profile (only the fields given change). */
export async function savePrefill(p: PrefillInput, client?: "service"): Promise<string | null> {
  const row = toRow(p);
  if (demoMode) {
    const all = await readDemo();
    all[p.email] = { ...(all[p.email] ?? { created_at: new Date().toISOString(), counties: [] }), ...row };
    await writeDemo(all);
    return null;
  }
  const sb = client === "service" ? createAdminClient() : await createClient();
  if (!sb) return "The server needs SUPABASE_SERVICE_ROLE_KEY.";
  const { error } = await sb.from("agent_prefills").upsert(row, { onConflict: "email" });
  return error ? (/agent_prefills/.test(error.message) ? "Run migration 0016 in Supabase first." : error.message) : null;
}

/** Admin: every prepared profile, newest first. Null when migration 0016 hasn't run. */
export async function listPrefills(client?: "service"): Promise<Prefill[] | null> {
  if (demoMode) return Object.values(await readDemo()).map(fromRow).sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  if (!supabaseConfigured) return [];
  const sb = client === "service" ? createAdminClient() : await createClient();
  if (!sb) return null;
  const { data, error } = await sb.from("agent_prefills").select("*").order("updated_at", { ascending: false });
  return error ? null : data.map(fromRow);
}

export async function getPrefill(email: string, client?: "service"): Promise<Prefill | null> {
  const key = email.trim().toLowerCase();
  if (demoMode) {
    const r = (await readDemo())[key];
    return r ? fromRow(r) : null;
  }
  if (!supabaseConfigured) return null;
  const sb = client === "service" ? createAdminClient() : await createClient();
  if (!sb) return null;
  const { data } = await sb.from("agent_prefills").select("*").eq("email", key).maybeSingle();
  return data ? fromRow(data) : null;
}

export async function deletePrefill(email: string): Promise<string | null> {
  const key = email.trim().toLowerCase();
  if (demoMode) {
    const all = await readDemo();
    delete all[key];
    await writeDemo(all);
    return null;
  }
  const { error } = await (await createClient()).from("agent_prefills").delete().eq("email", key);
  return error?.message ?? null;
}

/** The signed-in agent's own prepared profile (unused), without admin notes. */
export async function myPrefill(email: string): Promise<Prefill | null> {
  if (demoMode) {
    const p = await getPrefill(email);
    return p && !p.usedAt ? { ...p, notes: null } : null;
  }
  if (!supabaseConfigured) return null;
  const { data, error } = await (await createClient()).rpc("my_prefill");
  return error || !data ? null : fromRow(data as Record<string, unknown>);
}

/** After the agent saves their profile: mark the prepared profile used. Needs the service key (or demo mode). */
export async function markPrefillUsed(email: string): Promise<void> {
  const key = email.trim().toLowerCase();
  if (demoMode) {
    const all = await readDemo();
    if (all[key]) all[key].used_at = new Date().toISOString();
    await writeDemo(all);
    return;
  }
  await createAdminClient()?.from("agent_prefills").update({ used_at: new Date().toISOString() }).eq("email", key);
}

/** Same license number, ignoring case, spaces and dashes. */
export const sameLicense = (a?: string | null, b?: string | null) =>
  !!a && !!b && a.replace(/[\s-]/g, "").toUpperCase() === b.replace(/[\s-]/g, "").toUpperCase();

import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { LENDER } from "@/content/lender";
import { DEMO_AGENT } from "./demo-store";
import { demoMode, supabaseConfigured } from "./supabase/env";
import { createClient } from "./supabase/server";

// Leads inbox for the super admin. Supabase `leads` (+ migration 0004); .data/leads.json in local demo mode.

import type { Lead, LeadStatus } from "./leads-shared";
export { LEAD_STATUSES, type Lead, type LeadStatus } from "./leads-shared";
import { LEAD_STATUSES as LEAD_STATUSES_LIST } from "./leads-shared";

/** Super admin: the lender's own email, plus SUPER_ADMIN_EMAILS. (The database checks public.admins.) */
export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!supabaseConfigured) return process.env.NODE_ENV !== "production" || process.env.LOCAL_PROD_DEMO === "1";
  const list = (process.env.SUPER_ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  list.push(LENDER.email.toLowerCase());
  return !!email && list.includes(email.toLowerCase());
}

// ── Local demo storage ──────────────────────────────────────────────────
const FILE = path.join(process.cwd(), ".data", "leads.json");
async function readDemo(): Promise<Lead[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return [];
  }
}
async function writeDemo(all: Lead[]) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(all, null, 2));
}
export async function saveDemoLead(l: Omit<Lead, "id" | "status" | "notes" | "invitedBy"> & { invitedBy?: string | null }) {
  const all = await readDemo();
  all.unshift({ ...l, id: crypto.randomUUID(), status: "new", notes: null, invitedBy: l.invitedBy ?? null });
  await writeDemo(all);
}

type Row = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  message: string | null;
  topic: string | null;
  listing_id: string | null;
  listing_label: string | null;
  answers: Lead["answers"] | null;
  consent_at: string;
  consent_text: string;
  invite_code: string | null;
  status: string | null;
  notes: string | null;
};

export async function listLeads(): Promise<Lead[]> {
  if (demoMode) return readDemo();
  const sb = await createClient();
  const { data, error } = await sb.from("leads").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) {
    console.error("listLeads", error.message);
    return [];
  }
  const rows = data as Row[];
  // Which agent invited each buyer (if they came through an invite link).
  const codes = [...new Set(rows.map((r) => r.invite_code).filter((c): c is string => !!c))];
  const byCode = new Map<string, string>();
  if (codes.length) {
    const { data: inv } = await sb
      .from("client_invites")
      .select("code, agent:agents(name, brokerage)")
      .in("code", codes);
    for (const i of (inv ?? []) as unknown as { code: string; agent: { name: string; brokerage: string } | null }[])
      if (i.agent) byCode.set(i.code, `${i.agent.name}, ${i.agent.brokerage}`);
  }
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    name: r.name,
    email: r.email,
    phone: r.phone,
    message: r.message,
    topic: r.topic === "points" ? "points" : "general",
    listingId: r.listing_id,
    listingLabel: r.listing_label,
    answers: r.answers ?? [],
    consentAt: r.consent_at,
    consentText: r.consent_text,
    inviteCode: r.invite_code,
    invitedBy: r.invite_code ? (byCode.get(r.invite_code) ?? null) : null,
    status: (LEAD_STATUSES_LIST.some((s) => s.value === r.status) ? r.status : "new") as LeadStatus,
    notes: r.notes,
  }));
}

export async function updateLead(id: string, patch: { status?: LeadStatus; notes?: string | null }): Promise<string | null> {
  if (demoMode) {
    const all = await readDemo();
    const l = all.find((x) => x.id === id);
    if (!l) return "Lead not found.";
    Object.assign(l, patch);
    await writeDemo(all);
    return null;
  }
  const sb = await createClient();
  const { data, error } = await sb
    .from("leads")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error) return error.message;
  return data?.length ? null : "Not allowed. Run migration 0004 in Supabase.";
}

export async function countNewLeads(): Promise<number> {
  if (demoMode) return (await readDemo()).filter((l) => l.status === "new").length;
  const sb = await createClient();
  const { count } = await sb.from("leads").select("id", { count: "exact", head: true }).eq("status", "new");
  return count ?? 0;
}

export const DEMO_INVITER = `${DEMO_AGENT.name}, ${DEMO_AGENT.brokerage}`;

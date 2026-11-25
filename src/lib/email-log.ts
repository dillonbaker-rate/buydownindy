import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { demoMode, supabaseConfigured } from "./supabase/env";
import { createAdminClient, createClient } from "./supabase/server";

// A copy of every email the site sends (Supabase `email_log`, migration 0013; .data/emails.json in local demo mode).
// Shown on the admin Emails page. Logging never fails a send.

export const EMAIL_KINDS: Record<string, string> = {
  lead: "New lead",
  "new-agent": "New agent sign-up",
  "agent-verified": "Agent verified",
  handoff: "Listing sent to agent",
  "rate-stale": "Rate out of date",
  test: "Test",
};

export interface EmailLogEntry {
  id: string;
  kind: string;
  to: string[];
  replyTo: string | null;
  subject: string;
  html: string;
  text: string | null;
  status: "sent" | "failed" | "skipped";
  resendId: string | null;
  error: string | null;
  createdAt: string;
}

const FILE = path.join(process.cwd(), ".data", "emails.json");

async function readDemo(): Promise<EmailLogEntry[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return [];
  }
}

export async function logEmail(e: Omit<EmailLogEntry, "id" | "createdAt">): Promise<void> {
  try {
    if (demoMode) {
      const all = await readDemo();
      all.unshift({ ...e, id: String(Date.now()), createdAt: new Date().toISOString() });
      await fs.mkdir(path.dirname(FILE), { recursive: true });
      await fs.writeFile(FILE, JSON.stringify(all.slice(0, 200)));
      return;
    }
    const sb = createAdminClient();
    if (!sb) return;
    const { error } = await sb.from("email_log").insert({
      kind: e.kind,
      to_addresses: e.to,
      reply_to: e.replyTo,
      subject: e.subject,
      html: e.html,
      text_body: e.text,
      status: e.status,
      resend_id: e.resendId,
      error: e.error,
    });
    if (error && !/email_log/.test(error.message)) console.error("[email-log]", error.message);
  } catch (err) {
    console.error("[email-log]", err);
  }
}

type Row = {
  id: number;
  kind: string;
  to_addresses: string[];
  reply_to: string | null;
  subject: string;
  html: string;
  text_body: string | null;
  status: EmailLogEntry["status"];
  resend_id: string | null;
  error: string | null;
  created_at: string;
};

const fromRow = (r: Row): EmailLogEntry => ({
  id: String(r.id),
  kind: r.kind,
  to: r.to_addresses,
  replyTo: r.reply_to,
  subject: r.subject,
  html: r.html,
  text: r.text_body,
  status: r.status,
  resendId: r.resend_id,
  error: r.error,
  createdAt: r.created_at,
});

export type EmailSummary = Omit<EmailLogEntry, "html" | "text">;
const summary = (e: EmailLogEntry): EmailSummary => ({
  id: e.id,
  kind: e.kind,
  to: e.to,
  replyTo: e.replyTo,
  subject: e.subject,
  status: e.status,
  resendId: e.resendId,
  error: e.error,
  createdAt: e.createdAt,
});

/** Recent emails, newest first (without bodies), or null when the table isn't there yet. */
export async function listEmails(limit = 200): Promise<EmailSummary[] | null> {
  if (demoMode) return (await readDemo()).slice(0, limit).map(summary);
  if (!supabaseConfigured) return [];
  const { data, error } = await (await createClient())
    .from("email_log")
    .select("id, kind, to_addresses, reply_to, subject, status, resend_id, error, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return null;
  return (data as Row[]).map((r) => summary(fromRow({ ...r, html: "", text_body: null })));
}

export async function getEmail(id: string): Promise<EmailLogEntry | null> {
  if (demoMode) return (await readDemo()).find((e) => e.id === id) ?? null;
  if (!supabaseConfigured || !/^\d+$/.test(id)) return null;
  const { data } = await (await createClient()).from("email_log").select("*").eq("id", Number(id)).maybeSingle();
  return data ? fromRow(data as Row) : null;
}

import "server-only";
import { logEmail } from "./email-log";

// Email via Resend (https://resend.com).
// Env: RESEND_API_KEY, LEAD_NOTIFY_FROM (a sender on a Resend-verified domain), LEAD_NOTIFY_TO (Dillon's inbox,
// comma-separated). No key = email off. A failed email is logged and never fails the request that sent it.

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** The live site's address: NEXT_PUBLIC_SITE_URL, else Vercel's production domain, else localhost. */
export function siteUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
  return url.replace(/\/$/, "");
}

/** Dillon's notification inbox(es) from LEAD_NOTIFY_TO. */
export function notifyTo(): string[] {
  return (process.env.LEAD_NOTIFY_TO ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

/** Send through Resend and keep a copy in the email log. `kind` labels it on the admin Emails page (see EMAIL_KINDS). */
export async function sendEmail(
  kind: string,
  msg: { to: string[]; subject: string; html: string; text: string; replyTo?: string },
): Promise<void> {
  const entry = { kind, to: msg.to, replyTo: msg.replyTo ?? null, subject: msg.subject, html: msg.html, text: msg.text };
  const key = process.env.RESEND_API_KEY;
  if (!key || !msg.to.length) {
    console.info(`[${kind}] skipped: RESEND_API_KEY or recipient not set`);
    await logEmail({ ...entry, status: "skipped", resendId: null, error: !key ? "Email is off (RESEND_API_KEY not set)." : "No recipient." });
    return;
  }
  const from = process.env.LEAD_NOTIFY_FROM || "BuyDown Indy <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to: msg.to, reply_to: msg.replyTo, subject: msg.subject, html: msg.html, text: msg.text }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[${kind}] Resend error`, res.status, body);
      await logEmail({ ...entry, status: "failed", resendId: null, error: `Resend ${res.status}: ${body.slice(0, 300)}` });
      return;
    }
    const j = (await res.json().catch(() => ({}))) as { id?: string };
    await logEmail({ ...entry, status: "sent", resendId: j.id ?? null, error: null });
  } catch (e) {
    console.error(`[${kind}] send failed`, e);
    await logEmail({ ...entry, status: "failed", resendId: null, error: e instanceof Error ? e.message : String(e) });
  }
}

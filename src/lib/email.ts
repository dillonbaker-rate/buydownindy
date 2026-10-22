import "server-only";

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

export async function sendEmail(
  tag: string,
  msg: { to: string[]; subject: string; html: string; text: string; replyTo?: string },
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !msg.to.length) {
    console.info(`[${tag}] skipped: RESEND_API_KEY or recipient not set`);
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
    if (!res.ok) console.error(`[${tag}] Resend error`, res.status, await res.text().catch(() => ""));
  } catch (e) {
    console.error(`[${tag}] send failed`, e);
  }
}

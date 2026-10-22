import "server-only";
import { esc, notifyTo, sendEmail, siteUrl } from "./email";

// New-lead email to Dillon, called after a lead is saved (see ./email for the Resend settings).

export interface LeadForEmail {
  name: string;
  email: string;
  phone: string;
  message: string | null;
  topic: "general" | "points";
  listingId: string | null;
  listingLabel: string | null;
  answers: { question: string; answer: string }[];
  consentAt: string;
  consentText: string;
}

export function leadEmail(lead: LeadForEmail, siteUrl: string) {
  const about = lead.listingLabel ?? "General inquiry";
  const points = lead.topic === "points";
  const subject = `New lead: ${lead.name} · ${about}${points ? " (points)" : ""}`;
  const listingUrl = lead.listingId ? `${siteUrl.replace(/\/$/, "")}/listing/${lead.listingId}` : null;
  const tel = lead.phone.replace(/[^0-9+]/g, "");
  const when = new Date(lead.consentAt).toLocaleString("en-US", { timeZone: "America/Indiana/Indianapolis", dateStyle: "medium", timeStyle: "short" });

  const row = (k: string, v: string) =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #e1e6ec;color:#5a636e;font-size:13px;width:42%;vertical-align:top">${k}</td><td style="padding:8px 12px;border-bottom:1px solid #e1e6ec;color:#1c2530;font-size:14px;font-weight:600;vertical-align:top">${v}</td></tr>`;
  const table = (rows: string) =>
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e1e6ec;border-radius:12px">${rows}</table>`;
  const h = (t: string) => `<div style="font-size:16px;font-weight:700;color:#1c2530;margin:22px 0 8px">${t}</div>`;

  const html = `<!doctype html><html><body style="margin:0;background:#f4f7fa;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:16px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#fff;border-radius:16px">
<tr><td style="background:#1c5aa6;padding:18px 24px;border-radius:16px 16px 0 0;color:#fff">
  <div style="font-size:12px;opacity:.85">BuyDown Indy · new lead${points ? " · asked about points" : ""}</div>
  <div style="font-size:22px;font-weight:700;margin-top:2px">${esc(lead.name)}</div>
  <div style="font-size:14px;margin-top:2px">${esc(about)}</div>
</td></tr>
<tr><td style="padding:8px 24px 24px">
  ${h("Contact")}
  ${table(
    row("Phone", `<a href="tel:${esc(tel)}" style="color:#123f78">${esc(lead.phone)}</a>`) +
      row("Email", `<a href="mailto:${esc(lead.email)}" style="color:#123f78">${esc(lead.email)}</a>`) +
      (listingUrl ? row("Listing", `<a href="${esc(listingUrl)}" style="color:#123f78">${esc(about)}</a>`) : "") +
      (lead.message ? row("Message", esc(lead.message).replace(/\n/g, "<br>")) : ""),
  )}
  ${lead.answers.length ? h("Quiz answers") + table(lead.answers.map((a) => row(esc(a.question), esc(a.answer))).join("")) : ""}
  <p style="font-size:12px;color:#5a636e;line-height:1.5;margin:20px 0 0">Consent given ${esc(when)} (Indianapolis time): “${esc(lead.consentText)}”</p>
  <p style="font-size:12px;color:#5a636e;margin:8px 0 0">Reply to this email to answer ${esc(lead.name.split(" ")[0])} directly.</p>
</td></tr></table></td></tr></table></body></html>`;

  const text = [
    `New BuyDown Indy lead${points ? " (asked about points)" : ""}`,
    "",
    `${lead.name}`,
    `Phone: ${lead.phone}`,
    `Email: ${lead.email}`,
    `About: ${about}${listingUrl ? ` (${listingUrl})` : ""}`,
    ...(lead.message ? ["", `Message: ${lead.message}`] : []),
    ...(lead.answers.length ? ["", "Quiz answers:", ...lead.answers.map((a) => `- ${a.question} ${a.answer}`)] : []),
    "",
    `Consent given ${when}: "${lead.consentText}"`,
  ].join("\n");

  return { subject, html, text };
}

export async function sendLeadEmail(lead: LeadForEmail): Promise<void> {
  await sendEmail("lead-email", { to: notifyTo(), replyTo: lead.email, ...leadEmail(lead, siteUrl()) });
}

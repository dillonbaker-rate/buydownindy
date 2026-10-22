import "server-only";
import { esc, notifyTo, sendEmail, siteUrl } from "./email";

// Agent account emails: Dillon hears about each new agent sign-up, and an agent hears when Dillon verifies them.

export interface AgentForEmail {
  name: string;
  email: string;
  phone: string;
  brokerage: string;
  licenseNumber: string | null;
}

const row = (k: string, v: string) =>
  `<tr><td style="padding:8px 12px;border-bottom:1px solid #e1e6ec;color:#5a636e;font-size:13px;width:42%;vertical-align:top">${k}</td><td style="padding:8px 12px;border-bottom:1px solid #e1e6ec;color:#1c2530;font-size:14px;font-weight:600;vertical-align:top">${v}</td></tr>`;
const button = (href: string, label: string) =>
  `<a href="${esc(href)}" style="display:inline-block;background:#1c5aa6;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 20px;border-radius:10px">${label}</a>`;

function layout(kicker: string, title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#f4f7fa;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:16px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#fff;border-radius:16px">
<tr><td style="background:#1c5aa6;padding:18px 24px;border-radius:16px 16px 0 0;color:#fff">
  <div style="font-size:12px;opacity:.85">${kicker}</div>
  <div style="font-size:22px;font-weight:700;margin-top:2px">${title}</div>
</td></tr>
<tr><td style="padding:20px 24px 24px">${body}</td></tr></table></td></tr></table></body></html>`;
}

/** To Dillon: a new agent finished their profile and is waiting to be verified. */
export function newAgentEmail(a: AgentForEmail, site: string) {
  const admin = `${site}/agent/admin`;
  const tel = a.phone.replace(/[^0-9+]/g, "");
  const license = a.licenseNumber ?? "Not given";
  const subject = `New agent sign-up: ${a.name} · ${a.brokerage}`;
  const html = layout(
    "BuyDown Indy · new agent waiting for verification",
    esc(a.name),
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e1e6ec;border-radius:12px">${
      row("Brokerage", esc(a.brokerage)) +
      row("License #", esc(license)) +
      row("Phone", `<a href="tel:${esc(tel)}" style="color:#123f78">${esc(a.phone)}</a>`) +
      row("Email", `<a href="mailto:${esc(a.email)}" style="color:#123f78">${esc(a.email)}</a>`)
    }</table>
  <p style="font-size:14px;color:#1c2530;line-height:1.5;margin:20px 0 16px">Check the license on mylicense.in.gov, then verify or reject them on the admin page.</p>
  ${button(admin, "Review on the admin page")}`,
  );
  const text = [
    "New BuyDown Indy agent sign-up, waiting for verification",
    "",
    a.name,
    `Brokerage: ${a.brokerage}`,
    `License #: ${license}`,
    `Phone: ${a.phone}`,
    `Email: ${a.email}`,
    "",
    `Review: ${admin}`,
  ].join("\n");
  return { subject, html, text };
}

/** To the agent: Dillon verified their license. */
export function agentVerifiedEmail(a: Pick<AgentForEmail, "name">, site: string) {
  const first = a.name.trim().split(/\s+/)[0] || "there";
  const post = `${site}/agent/post`;
  const subject = "You're verified on BuyDown Indy";
  const html = layout(
    "BuyDown Indy",
    "You're verified",
    `<p style="font-size:15px;color:#1c2530;line-height:1.6;margin:0 0 16px">Hi ${esc(first)},</p>
  <p style="font-size:15px;color:#1c2530;line-height:1.6;margin:0 0 20px">Your real estate license is verified, so your BuyDown Indy profile is now marked verified. You can post listings with seller concessions and buyers will see what that money does for their rate and payment.</p>
  ${button(post, "Post a listing")}
  <p style="font-size:13px;color:#5a636e;line-height:1.5;margin:20px 0 0">Questions? Just reply to this email.</p>`,
  );
  const text = [
    `Hi ${first},`,
    "",
    "Your real estate license is verified, so your BuyDown Indy profile is now marked verified. You can post listings with seller concessions and buyers will see what that money does for their rate and payment.",
    "",
    `Post a listing: ${post}`,
    "",
    "Questions? Just reply to this email.",
  ].join("\n");
  return { subject, html, text };
}

export async function sendNewAgentEmail(a: AgentForEmail): Promise<void> {
  await sendEmail("agent-email", { to: notifyTo(), replyTo: a.email, ...newAgentEmail(a, siteUrl()) });
}

export async function sendAgentVerifiedEmail(a: Pick<AgentForEmail, "name" | "email">): Promise<void> {
  // Replies go to Dillon's notify inbox.
  await sendEmail("agent-email", { to: [a.email], replyTo: notifyTo()[0], ...agentVerifiedEmail(a, siteUrl()) });
}

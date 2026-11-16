import "server-only";
import { LENDER } from "@/content/lender";
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

/** To an agent: the admin prepared a hidden listing for them; the link previews it and lets them take it live. */
export function handoffEmail(h: { address: string; city: string; claimUrl: string; photo?: string; firstName?: string | null }) {
  const subject = `I built your listing on BuyDown Indy: ${h.address}`;
  const home = `${h.address}, ${h.city}`;
  // "Hey Jane," when we know the agent's name, otherwise "Hey there,".
  const hey = `Hey ${h.firstName?.trim() || "there"},`;
  const video = "https://youtu.be/v_CduvwuhkA";
  const p = (s: string) => `<p style="font-size:15px;color:#1c2530;line-height:1.75;margin:0 0 22px">${s}</p>`;
  const li = (s: string) => `<li style="font-size:15px;color:#1c2530;line-height:1.75;margin:0 0 12px">${s}</li>`;
  const photo = h.photo
    ? `<a href="${esc(h.claimUrl)}"><img src="${esc(h.photo)}" alt="${esc(home)}" width="552" style="display:block;width:100%;max-width:552px;height:auto;border-radius:12px;margin:0 0 26px" /></a>`
    : "";
  const html = layout(
    "BuyDown Indy",
        `<a href="${esc(h.claimUrl)}" style="color:#ffffff;text-decoration:none">${esc(home)}</a>`,
    `${photo}
  ${p(esc(hey))}
  ${p(`I saw the seller is offering a concession on <a href="${esc(h.claimUrl)}" style="color:#1c2530;text-decoration:none"><b>${esc(home)}</b></a>, so I built it out on BuyDown Indy for you. It shows buyers what that concession does to their <b>monthly payment</b> with a <b>2-1 buydown</b>, so your listing can <i>go toe to toe with the builders' rate incentives</i>.`)}
  <div style="background:#f4f7fa;border-left:4px solid #1c5aa6;border-radius:8px;padding:16px 18px;margin:0 0 22px">
    <div style="font-size:16px;font-weight:700;color:#1c2530;margin:0 0 8px">Why I Built This</div>
    <div style="font-size:15px;color:#1c2530;line-height:1.75">Buyers and sellers are <b>really confused by concessions</b>. Most people hear "seller credit" and have no idea what it actually does for them. Now they can <i>see it</i>, and understand how the math works <b>in seconds</b>.</div>
  </div>
  ${p("<b>It's private until you say go.</b> Taking it live is super easy:")}
  <ol style="margin:0 0 26px;padding-left:22px">
    ${li("<b>Sign in</b> with this email address")}
    ${li("<b>Change any details</b> you want")}
    ${li("Hit <b>Take it live</b>")}
  </ol>
  <div style="padding:18px 0 38px">${button(h.claimUrl, "See your listing")}</div>
  ${p(`Here's a quick walkthrough of how it works: <a href="${video}" style="color:#1c5aa6">watch the video</a>.`)}
  ${p("Any changes, just reply to this email and I'll handle it.")}
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px"><tr>
    <td style="vertical-align:middle;padding-right:14px"><img src="https://www.buydownindy.com/dillon-baker.jpg" alt="Dillon Baker" width="72" height="72" style="display:block;width:72px;height:72px;border-radius:50%" /></td>
    <td style="vertical-align:middle">
      <div style="font-size:15px;color:#1c2530;line-height:1.5"><b>Dillon Baker</b><br/>VP of Mortgage Lending<br/>Rate Mortgage</div>
      <div style="margin-top:8px;line-height:0"><a href="https://loanswithdillon.com/" style="text-decoration:none;margin-right:8px"><img src="https://img.icons8.com/ios-filled/100/1c5aa6/domain.png" alt="Website" width="24" height="24" style="display:inline-block;width:24px;height:24px;border:0" /></a><a href="https://www.instagram.com/loanswithdillon/" style="text-decoration:none;margin-right:8px"><img src="https://img.icons8.com/color/96/instagram-new--v1.png" alt="Instagram" width="24" height="24" style="display:inline-block;width:24px;height:24px;border:0" /></a><a href="https://www.linkedin.com/in/dillonbaker1/" style="text-decoration:none;margin-right:8px"><img src="https://img.icons8.com/color/96/linkedin.png" alt="LinkedIn" width="24" height="24" style="display:inline-block;width:24px;height:24px;border:0" /></a><a href="https://www.facebook.com/dillon.baker.58/" style="text-decoration:none;margin-right:8px"><img src="https://img.icons8.com/color/96/facebook-new.png" alt="Facebook" width="24" height="24" style="display:inline-block;width:24px;height:24px;border:0" /></a></div>
    </td>
  </tr></table>
  <p style="font-size:12px;color:#5a636e;line-height:1.5;margin:28px 0 0"><i>Payment examples are for illustration only and are not a quote, loan offer, or commitment to lend.</i></p>
  <p style="font-size:12px;color:#5a636e;line-height:1.5;margin:8px 0 0">Dillon Baker | VP of Mortgage Lending, Rate | NMLS #2681440 | Rate NMLS #2611 | Equal Housing Lender</p>`,
  );
  const text = [
    hey,
    "",
    `I saw the seller is offering a concession on ${home}, so I built it out on BuyDown Indy for you. It shows buyers what that concession does to their monthly payment with a 2-1 buydown, so your listing can go toe to toe with the builders' rate incentives.`,
    "",
    "WHY I BUILT THIS",
    "Buyers and sellers are really confused by concessions. Most people hear \"seller credit\" and have no idea what it actually does for them. Now they can see it, and understand how the math works in seconds.",
    "",
    "It's private until you say go. Taking it live is super easy:",
    "1. Sign in with this email address",
    "2. Change any details you want",
    "3. Hit Take it live",
    "",
    `See your listing: ${h.claimUrl}`,
    "",
    `Quick walkthrough video: ${video}`,
    "",
    "Any changes, just reply to this email and I'll handle it.",
    "",
    "Dillon Baker",
    "VP of Mortgage Lending",
    "Rate Mortgage",
    "loanswithdillon.com",
    "Instagram: https://www.instagram.com/loanswithdillon/",
    "LinkedIn: https://www.linkedin.com/in/dillonbaker1/",
    "Facebook: https://www.facebook.com/dillon.baker.58/",
    "",
    "Payment examples are for illustration only and are not a quote, loan offer, or commitment to lend.",
    "Dillon Baker | VP of Mortgage Lending, Rate | NMLS #2681440 | Rate NMLS #2611 | Equal Housing Lender",
  ].join("\n");
  return { subject, html, text };
}

export async function sendHandoffEmail(
  to: string,
  h: { address: string; city: string; claimPath: string; photo?: string; firstName?: string | null },
): Promise<void> {
  const claimUrl = `${siteUrl()}${h.claimPath}`;
  await sendEmail("handoff", { to: [to], replyTo: notifyTo()[0], ...handoffEmail({ ...h, claimUrl }) });
}

export async function sendNewAgentEmail(a: AgentForEmail): Promise<void> {
  await sendEmail("new-agent", { to: notifyTo(), replyTo: a.email, ...newAgentEmail(a, siteUrl()) });
}

export async function sendAgentVerifiedEmail(a: Pick<AgentForEmail, "name" | "email">): Promise<void> {
  // Replies go to Dillon's notify inbox.
  await sendEmail("agent-verified", { to: [a.email], replyTo: notifyTo()[0], ...agentVerifiedEmail(a, siteUrl()) });
}

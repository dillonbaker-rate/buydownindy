import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { FOOTER_LINE } from "@/content/disclosures";
import { LENDER } from "@/content/lender";
import { calc, kUsd, MIN_DOWN, pct, saving, typeFor, usd } from "./buydown";
import { DEMO_AGENT } from "./demo-store";
import { isSuperAdmin } from "./leads";
import { longDate, rateFor, type RateInfo } from "./rate-info";
import { isAdmin } from "./rates";
import { demoMode } from "./supabase/env";
import { createClient } from "./supabase/server";
import type { Agent, Listing } from "./types";

// Agent website & newsletter tools: a data API and an embeddable widget. No generated flyers or graphics:
// finished marketing pieces stay with Dillon/Rate.
// COMPLIANCE: off for agents until Rate compliance reviews (RESPA Section 8 co-marketing; Reg Z advertising
// trigger terms). Admins can always use them. Every output carries the disclosures below.

const DIR = path.join(process.cwd(), ".data");
const readJson = async <T>(f: string, d: T): Promise<T> => {
  try {
    return JSON.parse(await fs.readFile(path.join(DIR, f), "utf8"));
  } catch {
    return d;
  }
};
const writeJson = async (f: string, v: unknown) => {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(path.join(DIR, f), JSON.stringify(v, null, 2));
};

// ── On/off switch ────────────────────────────────────────────────────────
export async function marketingEnabled(): Promise<boolean> {
  if (demoMode) return (await readJson("settings.json", { marketing_enabled: false })).marketing_enabled;
  const sb = await createClient();
  const { data } = await sb.from("app_settings").select("value").eq("key", "marketing_enabled").maybeSingle();
  return data?.value === true;
}

export async function setMarketingEnabled(on: boolean): Promise<string | null> {
  if (demoMode) {
    await writeJson("settings.json", { ...(await readJson("settings.json", {})), marketing_enabled: on });
    return null;
  }
  const sb = await createClient();
  const { error } = await sb.from("app_settings").upsert({ key: "marketing_enabled", value: on, updated_at: new Date().toISOString() });
  return error?.message ?? null;
}

/** Admins always; other agents only when switched on and their license is verified. */
export async function canUseMarketing(email: string, agent: Agent | null): Promise<{ ok: boolean; reason?: string }> {
  if (isAdmin(email) || isSuperAdmin(email)) return { ok: true };
  if (!(await marketingEnabled())) return { ok: false, reason: "Marketing tools are coming soon. They're waiting on a compliance review." };
  if (agent?.verificationStatus !== "verified") return { ok: false, reason: "Marketing tools open up once your license is verified." };
  return { ok: true };
}

// ── API keys ────────────────────────────────────────────────────────────
export interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}
type DemoKey = ApiKeyRow & { agentId: string; hash: string };
const hashKey = (k: string) => createHash("sha256").update(k).digest("hex");

export async function createApiKey(agentId: string, name: string): Promise<{ key: string } | { error: string }> {
  const key = `bdi_${randomBytes(24).toString("base64url")}`;
  const prefix = key.slice(0, 10);
  if (demoMode) {
    const all = await readJson<DemoKey[]>("api_keys.json", []);
    all.unshift({ id: crypto.randomUUID(), agentId, name, prefix, hash: hashKey(key), createdAt: new Date().toISOString(), lastUsedAt: null, revokedAt: null });
    await writeJson("api_keys.json", all);
    return { key };
  }
  const sb = await createClient();
  const { error } = await sb.from("api_keys").insert({ agent_id: agentId, name, prefix, key_hash: hashKey(key) });
  return error ? { error: error.message } : { key };
}

export async function listApiKeys(agentId: string): Promise<ApiKeyRow[]> {
  if (demoMode)
    return (await readJson<DemoKey[]>("api_keys.json", []))
      .filter((k) => k.agentId === agentId)
      .map((k) => ({ id: k.id, name: k.name, prefix: k.prefix, createdAt: k.createdAt, lastUsedAt: k.lastUsedAt, revokedAt: k.revokedAt }));
  const sb = await createClient();
  const { data } = await sb.from("api_keys").select("*").eq("agent_id", agentId).order("created_at", { ascending: false });
  return (data ?? []).map((k) => ({ id: k.id, name: k.name, prefix: k.prefix, createdAt: k.created_at, lastUsedAt: k.last_used_at, revokedAt: k.revoked_at }));
}

export async function revokeApiKey(agentId: string, id: string): Promise<string | null> {
  if (demoMode) {
    const all = await readJson<DemoKey[]>("api_keys.json", []);
    const k = all.find((x) => x.id === id && x.agentId === agentId);
    if (!k) return "Key not found.";
    k.revokedAt = new Date().toISOString();
    await writeJson("api_keys.json", all);
    return null;
  }
  const sb = await createClient();
  const { error } = await sb.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id).eq("agent_id", agentId);
  return error?.message ?? null;
}

/** Check a request's "Authorization: Bearer bdi_…" key. */
export async function authorizeApiKey(header: string | null): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const key = header?.match(/^Bearer\s+(bdi_[A-Za-z0-9_-]+)$/)?.[1];
  if (!key) return { ok: false, status: 401, error: "Send your API key as: Authorization: Bearer bdi_…" };
  const hash = hashKey(key);
  let owner: { email: string; verified: boolean; admin: boolean } | null = null;
  if (demoMode) {
    const all = await readJson<DemoKey[]>("api_keys.json", []);
    const k = all.find((x) => x.hash === hash && !x.revokedAt);
    if (k) {
      k.lastUsedAt = new Date().toISOString();
      await writeJson("api_keys.json", all);
      owner = { email: DEMO_AGENT.email, verified: true, admin: true };
    }
  } else {
    const sb = await createClient();
    const { data } = await sb.rpc("verify_api_key", { p_hash: hash });
    const r = (data as { agent_email: string; verified: boolean; is_admin: boolean }[] | null)?.[0];
    if (r) owner = { email: r.agent_email, verified: r.verified, admin: r.is_admin };
  }
  if (!owner) return { ok: false, status: 401, error: "Invalid or revoked API key." };
  if (owner.admin || isAdmin(owner.email)) return { ok: true };
  if (!(await marketingEnabled())) return { ok: false, status: 403, error: "Marketing API isn't enabled yet." };
  if (!owner.verified) return { ok: false, status: 403, error: "Your license must be verified to use the API." };
  return { ok: true };
}

// ── The numbers every marketing output uses ─────────────────────────────
// COMPLIANCE: wording for ads that state payments/rates. Needs Rate compliance review; APR not shown.
export const MARKETING_DISCLAIMER = (rateLabel: string) =>
  `Estimated principal & interest only; taxes, insurance and mortgage insurance are extra. Based on a ${rateLabel} 30-year fixed rate and the listing's default down payment; the APR will be higher and your rate depends on credit and other factors. Temporary buydowns are paid by the seller, require a signed contract, and you qualify at the full rate. Not a commitment to lend. ${FOOTER_LINE}.`;

export function listingMarketing(l: Listing, info: RateInfo, origin: string) {
  const type = typeFor(l.loanTypes);
  const down = Math.max(l.defaultDownPct, MIN_DOWN[type]);
  const rate = rateFor(info, type);
  const c = calc(l.price, l.concession, type, down, 0, rate);
  const b = c.best;
  const rateLabel = `${pct(rate)} ${info.source === "daily" ? `(rate as of ${longDate(info.date)})` : `sample (Freddie Mac PMMS, week of ${longDate(info.date)})`}`;
  const url = `${origin}/listing/${l.id}`;
  return {
    id: l.id,
    address: l.address,
    city: l.city,
    zip: l.zip ?? null,
    price: l.price,
    beds: l.beds,
    baths: l.baths,
    sqft: l.sqft,
    concession: l.concession,
    concessionShort: kUsd(l.concession),
    photo: l.photos[0]?.url ? new URL(l.photos[0].url, origin).toString() : null,
    loanType: type,
    downPaymentPct: down,
    rate,
    rateSource: info.source === "daily" ? "Rate daily" : "Freddie Mac PMMS (sample)",
    rateDate: info.date,
    payments: {
      noConcession: Math.round(c.base),
      priceCut: Math.round(c.cut),
      priceCutSavings: saving(c.base, c.cut),
      best: b ? { option: b.name, year1: Math.round(b.y1), savings: saving(c.base, b.y1) } : null,
    },
    headline: b
      ? `${kUsd(l.concession)} off the price saves ${usd(saving(c.base, c.cut))}/mo. ${kUsd(l.concession)} toward a ${b.name} saves ${usd(saving(c.base, b.y1))}/mo in year 1.`
      : `Seller is offering ${usd(l.concession)} toward closing costs.`,
    disclaimer: MARKETING_DISCLAIMER(rateLabel),
    lender: { name: LENDER.name, title: LENDER.title, company: LENDER.company, nmls: LENDER.nmls, companyNmls: LENDER.companyNmls, phone: LENDER.mobilePhone, email: LENDER.email },
    listingAgent: { name: l.agentName, brokerage: l.brokerage },
    links: {
      listing: url,
      embed: `${origin}/embed/listing/${l.id}`,
    },
  };
}
export type ListingMarketing = ReturnType<typeof listingMarketing>;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Email-safe HTML snapshot for newsletters (tables + inline styles). Numbers are as of today. */
export function newsletterHtml(m: ListingMarketing): string {
  const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
  const best = m.payments.best;
  const F = "Arial,Helvetica,sans-serif";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;border:1px solid #e1e6ec;border-radius:12px;border-collapse:separate;font-family:${F};color:#1c2530">
<tr><td style="padding:0">${m.photo ? `<a href="${esc(m.links.listing)}"><img src="${esc(m.photo)}" alt="${esc(m.address)}" width="560" style="display:block;width:100%;max-width:560px;height:auto;border-radius:12px 12px 0 0"></a>` : ""}</td></tr>
<tr><td style="padding:16px 18px 6px"><div style="font-size:22px;font-weight:bold">${money(m.price)}</div><div style="font-size:14px;color:#5a636e">${esc(`${m.address}, ${m.city}, IN`)} · ${m.beds} bd · ${m.baths} ba</div>
<div style="display:inline-block;margin-top:8px;background:#1c5aa6;color:#ffffff;font-size:13px;font-weight:bold;padding:4px 10px;border-radius:999px">${m.concessionShort} from the seller</div></td></tr>
<tr><td style="padding:10px 18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3fb;border-radius:10px"><tr>
<td width="50%" style="padding:12px;vertical-align:top"><div style="font-size:12px;font-weight:bold">${m.concessionShort} price cut</div><div style="font-size:22px;font-weight:bold">${money(m.payments.priceCut)}/mo</div><div style="font-size:12px;color:#5a636e">saves ${money(m.payments.priceCutSavings)}/mo</div></td>
<td width="50%" style="padding:12px;vertical-align:top"><div style="font-size:12px;font-weight:bold">${best ? esc(best.option) + ", year 1" : "Closing cost credit"}</div><div style="font-size:22px;font-weight:bold;color:#1c5aa6">${best ? money(best.year1) + "/mo" : money(m.concession)}</div><div style="font-size:12px;color:#123f78;font-weight:bold">${best ? "saves " + money(best.savings) + "/mo" : "toward closing costs"}</div></td>
</tr></table></td></tr>
<tr><td style="padding:4px 18px 10px"><a href="${esc(m.links.listing)}" style="font-size:14px;font-weight:bold;color:#123f78">See all the options →</a></td></tr>
<tr><td style="padding:0 18px 14px;font-size:10px;line-height:1.4;color:#5a636e">${esc(m.disclaimer)} Listing: ${esc(`${m.listingAgent.name}, ${m.listingAgent.brokerage}`)}.</td></tr>
</table>`;
}

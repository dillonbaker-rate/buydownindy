import "server-only";
import { z } from "zod";
import { sendAgentVerifiedEmail, sendHandoffEmail } from "@/lib/agent-email";
import { siteUrl } from "@/lib/email";
import { claimPath, newHandoffToken } from "@/lib/handoff";
import { fromRow, LISTING_SELECT, type ListingRow } from "@/lib/data";
import { LEAD_STATUSES } from "@/lib/leads-shared";
import { listingMarketing } from "@/lib/marketing";
import { agentMetrics, leadMetrics, listingMetrics, type ListingRowLite } from "@/lib/metrics-shared";
import { paymentBreakdown } from "@/lib/payment";
import { getRateInfo, saveDaily } from "@/lib/rates";
import { indyToday } from "@/lib/rate-info";
import { createAdminClient } from "@/lib/supabase/server";
import { agentFromRow, LISTING_DAYS } from "@/lib/types";
import { ToolError, type Tool } from "./protocol";

// Full-admin tools for the BuyDown Indy MCP connector. Everything runs with the Supabase service key
// (bypasses row-level security), so this connector can read buyer leads and change or delete data.

export const MCP_INFO = {
  name: "buydown-indy",
  version: "1.0.0",
  instructions:
    "BuyDown Indy admin connector (www.buydownindy.com): Indianapolis-area listings where the seller pays concessions, " +
    "agent accounts and verification, buyer leads, daily rates and site metrics. Read tools are safe. Write tools change " +
    "the live site: confirm with the user before verifying or deleting agents, changing rates, or changing listings. " +
    "Lead records contain buyers' personal contact information; don't share them beyond what the user asks for.",
};

function db() {
  const sb = createAdminClient();
  if (!sb) throw new ToolError("The connector needs SUPABASE_SERVICE_ROLE_KEY set in Vercel.");
  return sb;
}

const DAY = 86_400_000;
const expiry = () => new Date(Date.now() + LISTING_DAYS * DAY).toISOString();

function tool<S extends z.ZodObject>(
  name: string,
  description: string,
  schema: S,
  annotations: Tool["annotations"],
  run: (args: z.infer<S>) => Promise<unknown>,
): Tool {
  const inputSchema = z.toJSONSchema(schema, { io: "input" }) as Record<string, unknown>;
  delete inputSchema.$schema;
  return {
    name,
    description,
    inputSchema,
    annotations,
    run: async (raw) => {
      const parsed = schema.safeParse(raw);
      if (!parsed.success) throw new ToolError(`Invalid arguments: ${parsed.error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ")}`);
      return run(parsed.data);
    },
  };
}

const READ = { readOnlyHint: true };
const WRITE = { readOnlyHint: false, destructiveHint: false };
const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true };

const leadOut = (r: Record<string, unknown>) => ({
  id: r.id,
  createdAt: r.created_at,
  status: r.status ?? "new",
  name: r.name,
  email: r.email,
  phone: r.phone,
  topic: r.topic === "points" ? "points" : "general",
  listing: r.listing_label ?? null,
  listingId: r.listing_id ?? null,
  message: r.message ?? null,
  quizAnswers: r.answers ?? [],
  notes: r.notes ?? null,
});

const agentOut = (r: Record<string, unknown>) => {
  const a = agentFromRow(r);
  return {
    id: a.id,
    name: a.name,
    email: a.email,
    phone: a.phone,
    brokerage: a.brokerage,
    team: a.teamName ?? null,
    licenseNumber: a.licenseNumber ?? null,
    mlsId: a.mlsId ?? null,
    counties: a.counties ?? [],
    verificationStatus: a.verificationStatus ?? "pending",
    verifiedAt: a.verifiedAt ?? null,
    createdAt: a.createdAt ?? null,
  };
};

const listingOut = (r: ListingRow) => {
  const l = fromRow(r);
  return {
    id: l.id,
    status: l.status,
    expiresAt: l.expiresAt,
    address: `${l.address}, ${l.city}, IN${l.zip ? " " + l.zip : ""}`,
    county: l.county,
    price: l.price,
    concession: l.concession,
    beds: l.beds,
    baths: l.baths,
    sqft: l.sqft,
    loanTypes: l.loanTypes,
    agent: { id: l.agentId, name: l.agentName, brokerage: l.brokerage },
    hiddenSentTo: l.handoffEmail ?? null,
    url: `${siteUrl()}/listing/${l.id}`,
  };
};

export const TOOLS: Tool[] = [
  // ── Read ────────────────────────────────────────────────────────────────
  tool("get_rates", "Today's 30-year fixed rates the site is using (Conventional, FHA, VA) and where they came from: Dillon's daily entry or the Freddie Mac weekly average.", z.object({}), READ, async () => {
    const info = await getRateInfo();
    return { source: info.source === "daily" ? "Daily rates entered by Dillon" : "Freddie Mac PMMS weekly average", date: info.date, rates: info.rates };
  }),

  tool(
    "search_listings",
    "Search listings in any status (live, pending, sold, draft = hidden). Filters are optional; newest first.",
    z.object({
      status: z.enum(["live", "pending", "sold", "draft", "all"]).default("all"),
      city: z.string().optional(),
      county: z.string().optional(),
      zip: z.string().optional(),
      minPrice: z.number().optional(),
      maxPrice: z.number().optional(),
      limit: z.number().int().min(1).max(100).default(25),
    }),
    READ,
    async (a) => {
      let q = db().from("listings").select(LISTING_SELECT).eq("is_sample", false).order("created_at", { ascending: false }).limit(a.limit);
      if (a.status !== "all") q = q.eq("status", a.status);
      if (a.city) q = q.ilike("city", a.city);
      if (a.county) q = q.ilike("county", a.county);
      if (a.zip) q = q.eq("zip", a.zip);
      if (a.minPrice != null) q = q.gte("price", a.minPrice);
      if (a.maxPrice != null) q = q.lte("price", a.maxPrice);
      const { data, error } = await q;
      if (error) throw new ToolError(error.message);
      return { count: data.length, listings: (data as ListingRow[]).map(listingOut) };
    },
  ),

  tool("get_listing", "One listing's full details, including the payment comparison buyers see (no concession vs price cut vs the best buydown).", z.object({ id: z.string() }), READ, async ({ id }) => {
    const { data, error } = await db().from("listings").select(LISTING_SELECT).eq("id", id).maybeSingle();
    if (error) throw new ToolError(error.message);
    if (!data) throw new ToolError("Listing not found.");
    const l = fromRow(data as ListingRow);
    const info = await getRateInfo();
    return { ...listingOut(data as ListingRow), taxesYr: l.taxesYr, insuranceYr: l.insuranceYr, hoaMo: l.hoaMo, photos: l.photos.map((p) => p.url), paymentComparison: listingMarketing(l, info, siteUrl()).payments };
  }),

  tool(
    "list_agents",
    "Agent accounts, newest first. Filter by verification status (pending = waiting for Dillon to verify their license).",
    z.object({ verificationStatus: z.enum(["pending", "verified", "rejected", "all"]).default("all"), limit: z.number().int().min(1).max(200).default(50) }),
    READ,
    async (a) => {
      let q = db().from("agents").select("*").order("created_at", { ascending: false }).limit(a.limit);
      if (a.verificationStatus !== "all") q = q.eq("verification_status", a.verificationStatus);
      const { data, error } = await q;
      if (error) throw new ToolError(error.message);
      return { count: data.length, agents: data.map(agentOut) };
    },
  ),

  tool("get_agent", "One agent's profile and their listings.", z.object({ id: z.string() }), READ, async ({ id }) => {
    const sb = db();
    const [{ data: a, error }, { data: ls }] = await Promise.all([
      sb.from("agents").select("*").eq("id", id).maybeSingle(),
      sb.from("listings").select(LISTING_SELECT).eq("agent_id", id).order("created_at", { ascending: false }),
    ]);
    if (error) throw new ToolError(error.message);
    if (!a) throw new ToolError("Agent not found.");
    return { ...agentOut(a), listings: ((ls ?? []) as ListingRow[]).map(listingOut) };
  }),

  tool(
    "list_leads",
    "Buyer leads from the Talk to a lender form, newest first, with contact details, quiz answers and notes. Contains personal information.",
    z.object({
      status: z.enum(["new", "contacted", "qualified", "closed", "not_a_fit", "all"]).default("all"),
      sinceDays: z.number().int().min(1).max(3650).optional(),
      limit: z.number().int().min(1).max(200).default(50),
    }),
    READ,
    async (a) => {
      let q = db().from("leads").select("*").order("created_at", { ascending: false }).limit(a.limit);
      if (a.status !== "all") q = q.eq("status", a.status);
      if (a.sinceDays) q = q.gte("created_at", new Date(Date.now() - a.sinceDays * DAY).toISOString());
      const { data, error } = await q;
      if (error) throw new ToolError(error.message);
      return { count: data.length, leads: data.map(leadOut) };
    },
  ),

  tool("get_metrics", "Site metrics: agents (by verification status), listings (live, pending, sold, expired, hidden), leads (by status) and calculator use, with 7- and 30-day counts.", z.object({}), READ, async () => {
    const sb = db();
    const since = (d: number) => new Date(Date.now() - d * DAY).toISOString();
    const count = async (name: string, from?: string) => {
      let q = sb.from("site_events").select("id", { count: "exact", head: true }).eq("name", name);
      if (from) q = q.gte("created_at", from);
      const { count: c, error } = await q;
      return error ? null : (c ?? 0);
    };
    const [agents, listings, leads, ...calc] = await Promise.all([
      sb.from("agents").select("created_at, verification_status"),
      sb.from("listings").select("status, expires_at, created_at, is_sample"),
      sb.from("leads").select("created_at, status, topic"),
      count("calc_payment"),
      count("calc_payment", since(7)),
      count("calc_payment", since(30)),
      count("calc_buydown"),
      count("calc_buydown", since(7)),
      count("calc_buydown", since(30)),
    ]);
    const lrows = (listings.data ?? []) as ListingRowLite[];
    return {
      agents: agentMetrics((agents.data ?? []).map((r) => ({ createdAt: r.created_at, verificationStatus: r.verification_status }))),
      listings: { ...listingMetrics(lrows), hidden: lrows.filter((r) => r.status === "draft" && !r.is_sample).length },
      leads: leadMetrics((leads.data ?? []).map((r) => ({ createdAt: r.created_at, status: r.status ?? "new", topic: r.topic ?? "general" }))),
      calculatorUses:
        calc[0] == null
          ? "Not tracked yet (run migration 0010)."
          : { payment: { total: calc[0], last7: calc[1], last30: calc[2] }, buydown: { total: calc[3], last7: calc[4], last30: calc[5] } },
    };
  }),

  tool(
    "calculate_payment",
    "Estimate a monthly payment like the site's Payment calculator: principal & interest plus estimated taxes, insurance, HOA and conventional MI under 20% down. Uses today's conventional rate unless a rate is given. Estimates only.",
    z.object({
      price: z.number().positive(),
      downPaymentPct: z.number().min(0).max(100).default(10),
      ratePct: z.number().min(1).max(20).optional(),
      years: z.union([z.literal(30), z.literal(20), z.literal(15)]).default(30),
      taxesPerYear: z.number().min(0).optional(),
      insurancePerYear: z.number().min(0).optional(),
      hoaPerMonth: z.number().min(0).default(0),
    }),
    READ,
    async (a) => {
      const rate = a.ratePct ?? (await getRateInfo()).rates.Conventional;
      const r = paymentBreakdown({ price: a.price, downPct: a.downPaymentPct, rate, years: a.years, taxesYr: a.taxesPerYear ?? null, insuranceYr: a.insurancePerYear ?? null, hoaMo: a.hoaPerMonth });
      const $ = (n: number) => Math.round(n);
      return {
        ratePct: rate,
        loanAmount: $(r.loan),
        downPayment: $(r.down),
        monthly: { total: $(r.total), principalAndInterest: $(r.parts.pi), taxes: $(r.parts.taxes), insurance: $(r.parts.insurance), hoa: $(r.parts.hoa), mortgageInsurance: $(r.parts.mi) },
        aprPct: Math.round(r.apr * 1000) / 1000,
        taxesEstimated: r.taxesEstimated,
        insuranceEstimated: r.insuranceEstimated,
      };
    },
  ),

  // ── Write ───────────────────────────────────────────────────────────────
  tool(
    "set_agent_verification",
    "Set an agent's license verification: verified, rejected (\"Can't verify\") or pending. The first time an agent becomes verified they get the \"You're verified\" email.",
    z.object({ id: z.string(), status: z.enum(["verified", "rejected", "pending"]) }),
    WRITE,
    async ({ id, status }) => {
      const sb = db();
      const { data: before } = await sb.from("agents").select("verification_status").eq("id", id).maybeSingle();
      if (!before) throw new ToolError("Agent not found.");
      const { data, error } = await sb
        .from("agents")
        .update({ verification_status: status, verified_at: status === "verified" ? new Date().toISOString() : null })
        .eq("id", id)
        .select("name, email")
        .single();
      if (error) throw new ToolError(error.message);
      const emailed = status === "verified" && before.verification_status !== "verified" && !!data.email;
      if (emailed) await sendAgentVerifiedEmail({ name: data.name ?? "", email: data.email });
      return { ok: true, name: data.name, status, verifiedEmailSent: emailed };
    },
  ),

  tool(
    "delete_agent",
    "Permanently delete an agent applicant whose license couldn't be verified: their sign-in account, profile and listings. Only works on agents marked rejected. Cannot be undone; confirm with the user first.",
    z.object({ id: z.string(), confirm: z.literal(true).describe("Must be true: the user confirmed the permanent delete.") }),
    DESTRUCTIVE,
    async ({ id }) => {
      const sb = db();
      const { data: a } = await sb.from("agents").select("name, email, verification_status").eq("id", id).maybeSingle();
      if (!a) throw new ToolError("Agent not found.");
      if (a.verification_status !== "rejected") throw new ToolError('Set the agent to "rejected" before deleting.');
      const { data: admin } = await sb.from("admins").select("email").ilike("email", a.email).maybeSingle();
      if (admin) throw new ToolError("Admin accounts can't be deleted here.");
      const { error } = await sb.auth.admin.deleteUser(id);
      if (error) throw new ToolError(error.message);
      return { ok: true, deleted: a.name };
    },
  ),

  tool(
    "set_todays_rates",
    "Enter today's (Indianapolis date) 30-year fixed rates for Conventional, FHA and VA, in percent (e.g. 6.875). The site uses them instead of the Freddie Mac average for the rest of the day.",
    z.object({ conventional: z.number().min(1).max(20), fha: z.number().min(1).max(20), va: z.number().min(1).max(20) }),
    WRITE,
    async (a) => {
      db();
      const date = indyToday();
      const err = await saveDaily({ date, ...a }, null);
      if (err) throw new ToolError(err);
      return { ok: true, date, rates: a };
    },
  ),

  tool(
    "update_lead",
    "Update a lead's status and/or notes.",
    z.object({ id: z.string(), status: z.enum(LEAD_STATUSES.map((s) => s.value) as [string, ...string[]]).optional(), notes: z.string().max(4000).nullable().optional() }),
    WRITE,
    async ({ id, ...patch }) => {
      if (patch.status === undefined && patch.notes === undefined) throw new ToolError("Give a status or notes to change.");
      const { data, error } = await db().from("leads").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id).select("*").maybeSingle();
      if (error) throw new ToolError(error.message);
      if (!data) throw new ToolError("Lead not found.");
      return { ok: true, lead: leadOut(data) };
    },
  ),

  tool(
    "set_listing_status",
    "Change a listing: live (on the map), pending, sold, draft (hide it from the map), or renew (another 30 days). Putting a hidden listing live clears its private agent link.",
    z.object({ id: z.string(), action: z.enum(["live", "pending", "sold", "draft", "renew"]) }),
    WRITE,
    async ({ id, action }) => {
      const sb = db();
      const { data: cur } = await sb.from("listings").select("status, expires_at, address").eq("id", id).maybeSingle();
      if (!cur) throw new ToolError("Listing not found.");
      const patch: Record<string, unknown> = action === "renew" ? { expires_at: expiry() } : { status: action };
      if (action === "live" && new Date(cur.expires_at) < new Date()) patch.expires_at = expiry();
      if (action === "live" && cur.status === "draft") Object.assign(patch, { handoff_token: null, handoff_email: null });
      const { error } = await sb.from("listings").update(patch).eq("id", id);
      if (error) throw new ToolError(error.message);
      return { ok: true, address: cur.address, action };
    },
  ),

  tool(
    "send_listing_to_agent",
    "Send a hidden (draft) listing to an agent: emails them a private link to preview it and take it live under their name once they sign up with that email. Replaces any earlier link.",
    z.object({ id: z.string(), email: z.string().trim().toLowerCase().email() }),
    WRITE,
    async ({ id, email }) => {
      const sb = db();
      const { data: l } = await sb.from("listings").select("address, city, status").eq("id", id).maybeSingle();
      if (!l) throw new ToolError("Listing not found.");
      if (l.status !== "draft") throw new ToolError("Hide the listing first (set_listing_status action draft).");
      const token = newHandoffToken();
      const { error } = await sb.from("listings").update({ handoff_email: email, handoff_token: token, handoff_sent_at: new Date().toISOString() }).eq("id", id);
      if (error) throw new ToolError(/handoff_/.test(error.message) ? "Run migration 0012 in Supabase first." : error.message);
      const path = claimPath(token);
      await sendHandoffEmail(email, { address: l.address, city: l.city, claimPath: path });
      return { ok: true, sentTo: email, link: `${siteUrl()}${path}` };
    },
  ),
];

import "server-only";
import { cache } from "react";
import { LENDER } from "@/content/lender";
import type { LoanType } from "./buydown";
import { SAMPLE_LISTINGS } from "./sample-data";
import { DEMO_AGENT, demoAgent, demoListings } from "./demo-store";
import { demoMode, supabaseConfigured } from "./supabase/env";
import { createClient } from "./supabase/server";
import { agentFromRow, type Agent, type Listing, type Photo } from "./types";

// Columns + the listing agent's public contact info.
export const LISTING_SELECT = "*, agent:agents(name, brokerage, email, phone, photo_url, verification_status)";

export interface ListingRow {
  id: string;
  agent_id: string | null;
  address: string;
  city: string;
  county: string;
  zip: string | null;
  lat: number;
  lng: number;
  price: number;
  beds: number | string;
  baths: number | string;
  sqft: number;
  concession: number;
  loan_types: LoanType[];
  default_down_pct: number | string;
  taxes_yr: number | null;
  insurance_yr: number | null;
  hoa_mo: number | null;
  built_year: number | null;
  photos: Photo[] | null;
  external_url: string | null;
  status: Listing["status"];
  expires_at: string;
  photo_rights_confirmed: boolean;
  is_sample: boolean;
  is_example: boolean;
  sample_agent_name: string | null;
  sample_brokerage: string | null;
  handoff_email?: string | null;
  handoff_name?: string | null;
  handoff_photo_url?: string | null;
  handoff_phone?: string | null;
  handoff_brokerage?: string | null;
  handoff_token?: string | null;
  handoff_sent_at?: string | null;
  agent?: { name: string; brokerage: string; email: string; phone: string; photo_url: string | null; verification_status: string | null } | null;
}

/** Emails of admin accounts (the lender). Listings they own are prepared for an agent, never "listed by" them. */
const ADMIN_OWNERS = new Set(
  [LENDER.email, ...(process.env.ADMIN_EMAILS ?? "").split(","), ...(process.env.SUPER_ADMIN_EMAILS ?? "").split(",")]
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

export function fromRow(r: ListingRow): Listing {
  const l = baseFromRow(r);
  if (!r.agent?.email || !ADMIN_OWNERS.has(r.agent.email.toLowerCase())) return l;
  // Owned by the admin account (a hidden listing built for an agent, or one put live by the admin): credit the
  // listing agent it was made for, or a neutral "Listing agent", instead of the admin's name, photo and phone.
  return {
    ...l,
    agentName: r.handoff_name?.trim() || "Listing agent",
    brokerage: r.handoff_brokerage ?? "",
    agentEmail: r.handoff_email ?? null,
    agentPhone: r.handoff_phone ?? null,
    agentPhotoUrl: r.handoff_photo_url ?? null,
    agentVerified: false,
  };
}

function baseFromRow(r: ListingRow): Listing {
  return {
    id: r.id,
    address: r.address,
    city: r.city,
    county: r.county,
    zip: r.zip,
    lat: r.lat,
    lng: r.lng,
    price: r.price,
    beds: Number(r.beds),
    baths: Number(r.baths),
    sqft: r.sqft,
    concession: r.concession,
    loanTypes: r.loan_types,
    defaultDownPct: Number(r.default_down_pct),
    taxesYr: r.taxes_yr,
    insuranceYr: r.insurance_yr,
    hoaMo: r.hoa_mo,
    builtYear: r.built_year,
    photos: r.photos ?? [],
    externalUrl: r.external_url,
    agentId: r.agent_id,
    agentName: r.agent?.name ?? r.sample_agent_name ?? "Listing agent",
    brokerage: r.agent?.brokerage ?? r.sample_brokerage ?? "",
    agentEmail: r.agent?.email ?? null,
    agentPhone: r.agent?.phone ?? null,
    agentPhotoUrl: r.agent?.photo_url ?? null,
    agentVerified: r.agent?.verification_status === "verified",
    status: r.status,
    expiresAt: r.expires_at,
    photoRightsConfirmed: r.photo_rights_confirmed,
    isSample: r.is_sample,
    isExample: r.is_example,
    handoffEmail: r.handoff_email ?? null,
    handoffName: r.handoff_name ?? null,
    handoffPhotoUrl: r.handoff_photo_url ?? null,
    handoffPhone: r.handoff_phone ?? null,
    handoffBrokerage: r.handoff_brokerage ?? null,
    handoffToken: r.handoff_token ?? null,
    handoffSentAt: r.handoff_sent_at ?? null,
  };
}

/** Live, unexpired listings for the map. Featured example first. */
/** Demo listings show the demo agent's current profile (photo, verification). */
async function withDemoAgent(list: Listing[]): Promise<Listing[]> {
  const a = await demoAgent();
  return list.map((l) => ({ ...l, agentName: a.name, brokerage: a.brokerage, agentPhone: a.phone, agentPhotoUrl: a.photoUrl ?? null, agentVerified: a.verificationStatus === "verified" }));
}

/** The design's 12 demo listings, off unless SHOW_SAMPLE_LISTINGS=true (only applies without Supabase). */
const SAMPLES = process.env.SHOW_SAMPLE_LISTINGS === "true" ? SAMPLE_LISTINGS : [];

export async function getLiveListings(): Promise<Listing[]> {
  if (!supabaseConfigured) {
    if (!demoMode) return SAMPLES;
    const now = Date.now();
    const mine = (await withDemoAgent(await demoListings())).filter((l) => l.status === "live" && new Date(l.expiresAt).getTime() > now);
    return [...SAMPLES.slice(0, 1), ...mine, ...SAMPLES.slice(1)];
  }
  const sb = await createClient();
  const { data, error } = await sb
    .from("listings")
    .select(LISTING_SELECT)
    .eq("status", "live")
    .gt("expires_at", new Date().toISOString())
    .order("is_example", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getLiveListings", error.message);
    return [];
  }
  return (data as ListingRow[]).map(fromRow);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getListing(id: string): Promise<Listing | null> {
  if (!supabaseConfigured) {
    const sample = SAMPLES.find((l) => l.id === id);
    if (sample || !demoMode) return sample ?? null;
    return (await withDemoAgent(await demoListings())).find((l) => l.id === id) ?? null;
  }
  if (!UUID.test(id)) return null;
  const sb = await createClient();
  const { data } = await sb.from("listings").select(LISTING_SELECT).eq("id", id).maybeSingle();
  if (data) return fromRow(data as ListingRow);
  // Not visible to this viewer (hidden, expired, pending or sold): anyone with the link can still open it.
  const { data: byLink, error } = await sb.rpc("listing_by_link", { listing_id: id });
  if (error) console.error("listing_by_link", error.message);
  return byLink ? fromRow(byLink as ListingRow) : null;
}

export async function getMyListings(agentId: string): Promise<Listing[]> {
  if (demoMode) return (await demoListings()).filter((l) => l.agentId === agentId);
  const sb = await createClient();
  const { data } = await sb
    .from("listings")
    .select(LISTING_SELECT)
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false });
  return ((data ?? []) as ListingRow[]).map(fromRow);
}

/** The signed-in agent. Wrapped in React cache() so the header and the page share one lookup per request. */
export const getCurrentAgent = cache(getCurrentAgentUncached);

async function getCurrentAgentUncached(): Promise<{ userId: string; email: string; agent: Agent | null; signupTermsVersion?: string | null } | null> {
  if (demoMode) return { userId: DEMO_AGENT.id, email: DEMO_AGENT.email, agent: await demoAgent() };
  if (!supabaseConfigured) return null;
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.from("agents").select("*").eq("id", user.id).maybeSingle();
  return {
    userId: user.id,
    email: user.email ?? "",
    agent: data ? agentFromRow(data) : null,
    signupTermsVersion: (user.user_metadata?.agent_terms_version as string | undefined) ?? null,
  };
}

/** All agent profiles, newest first (admin screen / CRM export). Agent profiles are public records. */
export async function getAllAgents(): Promise<Agent[]> {
  if (demoMode) return [await demoAgent()];
  const sb = await createClient();
  const { data, error } = await sb.from("agents").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("getAllAgents", error.message);
    return [];
  }
  return data.map(agentFromRow);
}

/** Agents waiting for license verification, newest first (admin bell). */
export async function getPendingAgents(): Promise<Agent[]> {
  if (demoMode) return (await getAllAgents()).filter((a) => (a.verificationStatus ?? "pending") === "pending");
  const sb = await createClient();
  const { data, error } = await sb
    .from("agents")
    .select("*")
    .eq("verification_status", "pending")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.error("getPendingAgents", error.message);
    return [];
  }
  return data.map(agentFromRow);
}

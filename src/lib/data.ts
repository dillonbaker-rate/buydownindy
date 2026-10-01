import "server-only";
import type { LoanType } from "./buydown";
import { SAMPLE_LISTINGS } from "./sample-data";
import { DEMO_AGENT, demoAgent, demoListings } from "./demo-store";
import { demoMode, supabaseConfigured } from "./supabase/env";
import { createClient } from "./supabase/server";
import { agentFromRow, type Agent, type Listing, type Photo } from "./types";

// Columns + the listing agent's public contact info.
const SELECT = "*, agent:agents(name, brokerage, email, phone, photo_url, verification_status)";

interface ListingRow {
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
  agent: { name: string; brokerage: string; email: string; phone: string; photo_url: string | null; verification_status: string | null } | null;
}

export function fromRow(r: ListingRow): Listing {
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
    .select(SELECT)
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
  const { data } = await sb.from("listings").select(SELECT).eq("id", id).maybeSingle();
  return data ? fromRow(data as ListingRow) : null;
}

export async function getMyListings(agentId: string): Promise<Listing[]> {
  if (demoMode) return (await demoListings()).filter((l) => l.agentId === agentId);
  const sb = await createClient();
  const { data } = await sb
    .from("listings")
    .select(SELECT)
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false });
  return ((data ?? []) as ListingRow[]).map(fromRow);
}

export async function getCurrentAgent(): Promise<{ userId: string; email: string; agent: Agent | null } | null> {
  if (demoMode) return { userId: DEMO_AGENT.id, email: DEMO_AGENT.email, agent: await demoAgent() };
  if (!supabaseConfigured) return null;
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.from("agents").select("*").eq("id", user.id).maybeSingle();
  return { userId: user.id, email: user.email ?? "", agent: data ? agentFromRow(data) : null };
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

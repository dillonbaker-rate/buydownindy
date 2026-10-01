import "server-only";
import type { LoanType } from "./buydown";
import { SAMPLE_LISTINGS } from "./sample-data";
import { DEMO_AGENT, demoListings } from "./demo-store";
import { demoMode, supabaseConfigured } from "./supabase/env";
import { createClient } from "./supabase/server";
import type { Agent, Listing, Photo } from "./types";

// Columns + the listing agent's public contact info.
const SELECT = "*, agent:agents(name, brokerage, email, phone)";

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
  agent: { name: string; brokerage: string; email: string; phone: string } | null;
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
    status: r.status,
    expiresAt: r.expires_at,
    photoRightsConfirmed: r.photo_rights_confirmed,
    isSample: r.is_sample,
    isExample: r.is_example,
  };
}

/** Live, unexpired listings for the map. Featured example first. */
export async function getLiveListings(): Promise<Listing[]> {
  if (!supabaseConfigured) {
    if (!demoMode) return SAMPLE_LISTINGS;
    const now = Date.now();
    const mine = (await demoListings()).filter((l) => l.status === "live" && new Date(l.expiresAt).getTime() > now);
    return [SAMPLE_LISTINGS[0], ...mine, ...SAMPLE_LISTINGS.slice(1)];
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
    const sample = SAMPLE_LISTINGS.find((l) => l.id === id);
    if (sample || !demoMode) return sample ?? null;
    return (await demoListings()).find((l) => l.id === id) ?? null;
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
  if (demoMode) return { userId: DEMO_AGENT.id, email: DEMO_AGENT.email, agent: DEMO_AGENT };
  if (!supabaseConfigured) return null;
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.from("agents").select("*").eq("id", user.id).maybeSingle();
  return { userId: user.id, email: user.email ?? "", agent: (data as Agent | null) ?? null };
}

import "server-only";
import { getAllAgents } from "./data";
import { demoListings } from "./demo-store";
import { listLeads } from "./leads";
import { agentMetrics, leadMetrics, listingMetrics, type ListingRowLite } from "./metrics-shared";
import { countEvents, type SiteEvent } from "./site-events";
import { demoMode } from "./supabase/env";
import { createClient } from "./supabase/server";
import { LISTING_DAYS } from "./types";

const DAY = 86_400_000;

async function listingRows(): Promise<ListingRowLite[]> {
  if (demoMode)
    return (await demoListings()).map((l) => ({
      status: l.status,
      expires_at: l.expiresAt,
      // Demo listings don't store a created date; a new or renewed listing runs LISTING_DAYS.
      created_at: new Date(new Date(l.expiresAt).getTime() - LISTING_DAYS * DAY).toISOString(),
      is_sample: l.isSample,
    }));
  const { data, error } = await (await createClient()).from("listings").select("status, expires_at, created_at, is_sample");
  if (error) console.error("metrics listings", error.message);
  return (data ?? []) as ListingRowLite[];
}

async function calculator(name: SiteEvent) {
  const now = Date.now();
  const [total, last7, last30] = await Promise.all([
    countEvents(name),
    countEvents(name, new Date(now - 7 * DAY)),
    countEvents(name, new Date(now - 30 * DAY)),
  ]);
  return total == null ? null : { total, last7: last7 ?? 0, last30: last30 ?? 0 };
}

/** Everything the admin Metrics page shows. Leads only for the super admin (only they can read leads). */
export async function loadMetrics(includeLeads: boolean) {
  const [agents, listings, leads, payment, buydown] = await Promise.all([
    getAllAgents(),
    listingRows(),
    includeLeads ? listLeads() : Promise.resolve(null),
    calculator("calc_payment"),
    calculator("calc_buydown"),
  ]);
  return {
    agents: agentMetrics(agents),
    listings: listingMetrics(listings),
    leads: leads ? leadMetrics(leads) : null,
    calculator: payment && buydown ? { payment, buydown } : null,
  };
}
export type Metrics = Awaited<ReturnType<typeof loadMetrics>>;

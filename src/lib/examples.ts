import "server-only";
import { fromRow, LISTING_SELECT, type ListingRow } from "./data";
import { demoListings } from "./demo-store";
import { demoMode, supabaseConfigured } from "./supabase/env";
import { createClient } from "./supabase/server";
import type { Listing } from "./types";

// Hidden (draft) listings as a gallery. Admins see everything, including who each was sent to.
// Agents see them as examples through example_listings() (migration 0014), without the private fields.

/** Remove what agents must not see (and anything that could identify the owner account). */
export const forAgents = (l: Listing): Listing => ({
  ...l,
  agentId: null,
  agentName: "Listing agent",
  brokerage: "",
  agentEmail: null,
  agentPhone: null,
  agentPhotoUrl: null,
  agentVerified: false,
  handoffEmail: null,
  handoffToken: null,
  handoffSentAt: null,
});

/** Every hidden listing with full details (admins; row-level security lets admins read all listings). */
export async function adminHiddenListings(): Promise<Listing[]> {
  if (demoMode) return (await demoListings()).filter((l) => l.status === "draft");
  if (!supabaseConfigured) return [];
  const { data, error } = await (await createClient())
    .from("listings")
    .select(LISTING_SELECT)
    .eq("status", "draft")
    .order("created_at", { ascending: false });
  if (error) console.error("adminHiddenListings", error.message);
  return ((data ?? []) as ListingRow[]).map(fromRow);
}

/** Hidden listings for a signed-in agent, private fields removed. Null when migration 0014 hasn't run. */
export async function exampleListings(): Promise<Listing[] | null> {
  if (demoMode) return (await demoListings()).filter((l) => l.status === "draft").map(forAgents);
  if (!supabaseConfigured) return [];
  const { data, error } = await (await createClient()).rpc("example_listings");
  if (error) return null;
  return ((data ?? []) as ListingRow[]).map((r) => forAgents(fromRow({ ...r, agent: null })));
}

export async function exampleListing(id: string): Promise<Listing | null> {
  if (demoMode) {
    const l = (await demoListings()).find((x) => x.id === id && x.status === "draft");
    return l ? forAgents(l) : null;
  }
  if (!supabaseConfigured || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await (await createClient()).rpc("example_listing", { listing_id: id });
  if (error || !data) return null;
  return forAgents(fromRow({ ...(data as ListingRow), agent: null }));
}

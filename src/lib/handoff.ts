import "server-only";
import { randomBytes } from "node:crypto";
import { fromRow, type ListingRow } from "./data";
import { demoClaim, demoListingByHandoff, demoMyHandoffs, demoSetHandoff } from "./demo-store";
import { demoMode, supabaseConfigured } from "./supabase/env";
import { createClient } from "./supabase/server";
import type { Listing } from "./types";

// Hidden listings an admin prepares and hands off to an agent (migration 0012).
// Flow: admin posts it hidden → "Send to agent" saves the agent's email + a private token and emails the link
// (/agent/claim/<token>) → the agent signs up, opens the link and takes it live under their own account.

export const newHandoffToken = () => randomBytes(24).toString("base64url");
export const claimPath = (token: string) => `/agent/claim/${token}`;

/** Save who a hidden listing is for and give it a fresh private link. The admin must own the listing. */
export async function setHandoff(id: string, ownerId: string, email: string, name: string | null = null): Promise<{ token: string } | { error: string }> {
  const token = newHandoffToken();
  if (demoMode) return (await demoSetHandoff(id, email, token, name)) ? { token } : { error: "Hide the listing before sending it." };
  const sb = await createClient();
  const save = (withName: boolean) =>
    sb
      .from("listings")
      .update({ handoff_email: email, ...(withName ? { handoff_name: name } : {}), handoff_token: token, handoff_sent_at: new Date().toISOString() })
      .eq("id", id)
      .eq("agent_id", ownerId)
      .eq("status", "draft")
      .select("id");
  let { data, error } = await save(true);
  // Before migration 0015 there's no handoff_name column: send without saving the name.
  if (error && /handoff_name/.test(error.message)) ({ data, error } = await save(false));
  if (error) return { error: /handoff_/.test(error.message) ? "Run migration 0012 in Supabase first." : error.message };
  if (!data?.length) return { error: "Hide the listing before sending it." };
  return { token };
}

/** First name for an email greeting ("Jane Smith" → "Jane"), or null. */
export const firstName = (name?: string | null) => name?.trim().split(/\s+/)[0] || null;

/** The hidden listing behind a private link, or null if the link is used up or wrong. */
export async function getListingByHandoff(token: string): Promise<Listing | null> {
  if (demoMode) return demoListingByHandoff(token);
  if (!supabaseConfigured) return null;
  const { data, error } = await (await createClient()).rpc("listing_by_handoff", { t: token });
  if (error || !data) return null;
  return fromRow({ ...(data as ListingRow), agent: null });
}

/** Hidden listings waiting for the signed-in agent's email. */
export async function myHandoffs(email: string): Promise<{ token: string; address: string; city: string; photoUrl: string | null }[]> {
  if (demoMode) return demoMyHandoffs(email);
  if (!supabaseConfigured) return [];
  const { data, error } = await (await createClient()).rpc("my_handoffs");
  if (error) return [];
  // photo_url arrives after migration 0018.
  return ((data ?? []) as { token: string; address: string; city: string; photo_url?: string | null }[]).map((h) => ({
    token: h.token,
    address: h.address,
    city: h.city,
    photoUrl: h.photo_url ?? null,
  }));
}

/** Move the listing to the signed-in agent and put it live. Returns the listing id or an error message. */
export async function claimListing(token: string): Promise<{ id: string } | { error: string }> {
  if (demoMode) {
    const id = await demoClaim(token);
    return id ? { id } : { error: "This listing link has already been used or was turned off." };
  }
  const { data, error } = await (await createClient()).rpc("claim_listing", { t: token });
  if (error) return { error: error.message };
  return { id: data as string };
}

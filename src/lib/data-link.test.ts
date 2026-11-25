import { describe, expect, it, vi } from "vitest";

// Anyone with a listing's link can open it, even when the normal (public) query hides it.
const rpc = vi.fn();
let visible: unknown = null;
vi.mock("server-only", () => ({}));
vi.mock("./supabase/env", () => ({ supabaseConfigured: true, demoMode: false, agentsEnabled: true }));
vi.mock("./supabase/server", () => ({
  createAdminClient: () => null,
  createClient: async () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: visible }) }) }) }),
    rpc,
  }),
}));
const { getListing } = await import("./data");

const ID = "5f3d5881-9e7a-4f9c-8824-d56725ab867a";
const hidden = {
  id: ID, agent_id: "a", address: "1137 Brookside Ct", city: "Carmel", county: "Hamilton", zip: null, lat: 39.9, lng: -86,
  price: 400_000, beds: 4, baths: 3, sqft: 2400, concession: 12_000, loan_types: ["Conventional"], default_down_pct: 5,
  taxes_yr: null, insurance_yr: null, hoa_mo: null, built_year: null, photos: [], external_url: null, status: "draft",
  expires_at: "2026-12-31T00:00:00Z", photo_rights_confirmed: false, is_sample: false, is_example: false,
  sample_agent_name: null, sample_brokerage: null, handoff_name: "Erik Pitner",
  agent: null,
};

describe("listing links", () => {
  it("opens a hidden listing through its link when the public query hides it", async () => {
    visible = null;
    rpc.mockResolvedValueOnce({ data: hidden, error: null });
    const l = await getListing(ID);
    expect(rpc).toHaveBeenCalledWith("listing_by_link", { listing_id: ID });
    expect(l?.address).toBe("1137 Brookside Ct");
    expect(l?.status).toBe("draft");
  });

  it("uses the normal query when the listing is visible", async () => {
    rpc.mockClear();
    visible = { ...hidden, status: "live" };
    expect((await getListing(ID))?.status).toBe("live");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("is still not found for an id that doesn't exist", async () => {
    visible = null;
    rpc.mockResolvedValueOnce({ data: null, error: null });
    expect(await getListing(ID)).toBeNull();
    expect(await getListing("not-a-uuid")).toBeNull();
  });
});

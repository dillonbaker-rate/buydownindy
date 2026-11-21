import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./supabase/server", () => ({ createAdminClient: () => null, createClient: async () => ({}) }));
const { fromRow } = await import("./data");

const row = (agentEmail: string, extra: Record<string, unknown> = {}) =>
  ({
    id: "x",
    agent_id: "a",
    address: "8921 Woodlark Dr",
    city: "Fishers",
    county: "Hamilton",
    zip: null,
    lat: 39.9,
    lng: -86,
    price: 385_500,
    beds: 4,
    baths: 3,
    sqft: 2123,
    concession: 11_565,
    loan_types: ["Conventional"],
    default_down_pct: 5,
    taxes_yr: null,
    insurance_yr: null,
    hoa_mo: null,
    built_year: null,
    photos: [],
    external_url: null,
    status: "draft",
    expires_at: "2026-12-31T00:00:00Z",
    photo_rights_confirmed: false,
    is_sample: false,
    is_example: false,
    sample_agent_name: null,
    sample_brokerage: null,
    agent: { name: "Agent Name", brokerage: "Some Realty", email: agentEmail, phone: "317-555-0100", photo_url: "https://x/p.jpg", verification_status: "verified" },
    ...extra,
  }) as Parameters<typeof fromRow>[0];

describe("listing agent credit", () => {
  it("credits the saved listing agent, not the admin, on listings the admin owns", () => {
    const l = fromRow(row("Dillon.Baker@rate.com", { handoff_name: "Jane Smith", handoff_email: "jane@realty.com" }));
    expect(l.agentName).toBe("Jane Smith");
    expect(l.brokerage).toBe("");
    expect(l.agentPhone).toBeNull();
    expect(l.agentPhotoUrl).toBeNull();
    expect(l.agentEmail).toBe("jane@realty.com");
    expect(l.agentVerified).toBe(false);
  });

  it("uses the phone and brokerage saved for that agent", () => {
    const l = fromRow(row("dillon.baker@rate.com", { handoff_name: "Jane Smith", handoff_phone: "317-555-0199", handoff_brokerage: "Tucker" }));
    expect(l.agentPhone).toBe("317-555-0199");
    expect(l.brokerage).toBe("Tucker");
    expect(l.handoffPhone).toBe("317-555-0199");
  });

  it("says Listing agent when no one is saved", () => {
    expect(fromRow(row("dillon.baker@rate.com")).agentName).toBe("Listing agent");
  });

  it("leaves real agents' listings alone", () => {
    const l = fromRow(row("pat@realty.com", { handoff_name: "Someone Else" }));
    expect(l.agentName).toBe("Agent Name");
    expect(l.brokerage).toBe("Some Realty");
    expect(l.agentPhone).toBe("317-555-0100");
  });
});

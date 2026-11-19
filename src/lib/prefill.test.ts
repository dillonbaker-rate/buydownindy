import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./supabase/server", () => ({ createAdminClient: () => null, createClient: async () => ({}) }));
const { PrefillInput, sameLicense } = await import("./prefill");

describe("pre-filled agent profiles", () => {
  it("matches license numbers ignoring case, spaces and dashes", () => {
    expect(sameLicense("RB14099999", "rb-1409 9999")).toBe(true);
    expect(sameLicense("RB14099999", "RB14099998")).toBe(false);
    expect(sameLicense("RB14099999", "")).toBe(false);
    expect(sameLicense(null, "RB14099999")).toBe(false);
  });

  it("cleans up what's entered", () => {
    const p = PrefillInput.parse({ email: " Jane@Realty.COM ", licenseNumber: "rb14012345", counties: ["Hamilton"] });
    expect(p.email).toBe("jane@realty.com");
    expect(p.licenseNumber).toBe("RB14012345");
  });

  it("rejects bad emails, license numbers, counties and links", () => {
    expect(PrefillInput.safeParse({ email: "nope" }).success).toBe(false);
    expect(PrefillInput.safeParse({ email: "a@b.co", licenseNumber: "12" }).success).toBe(false);
    expect(PrefillInput.safeParse({ email: "a@b.co", counties: ["Cook"] }).success).toBe(false);
    expect(PrefillInput.safeParse({ email: "a@b.co", website: "example.com" }).success).toBe(false);
  });
});

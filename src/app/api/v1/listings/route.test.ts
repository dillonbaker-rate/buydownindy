import { beforeEach, describe, expect, it, vi } from "vitest";

// Hidden (draft) listings are only for admin API keys that ask with ?include=hidden (Solomon's lead emails to Dillon).
const auth = vi.fn();
vi.mock("@/lib/marketing", () => ({
  authorizeApiKey: (...a: unknown[]) => auth(...a),
  listingMarketing: (l: { id: string; city: string }) => ({ id: l.id, city: l.city }),
}));
vi.mock("@/lib/rates", () => ({ getRateInfo: async () => ({ date: "2026-11-25" }) }));
const listing = (id: string, status: string, city = "Fishers") => ({ id, status, city, county: "Hamilton", isSample: false });
vi.mock("@/lib/data", () => ({
  getLiveListings: async () => [listing("live-1", "live"), listing("live-2", "live", "Carmel")],
  getHiddenListings: async () => [listing("hid-1", "draft")],
}));

const { GET } = await import("./route");
const call = async (q = "") => (await GET(new Request(`https://www.buydownindy.com/api/v1/listings${q}`))).json();

describe("GET /api/v1/listings", () => {
  beforeEach(() => auth.mockReset());

  it("admin key + include=hidden adds hidden listings, marked", async () => {
    auth.mockResolvedValue({ ok: true, admin: true });
    const r = await call("?include=hidden&city=Fishers");
    expect(r.listings.map((l: { id: string; hidden: boolean }) => [l.id, l.hidden])).toEqual([["live-1", false], ["hid-1", true]]);
  });

  it("admin key without include=hidden gets live only", async () => {
    auth.mockResolvedValue({ ok: true, admin: true });
    const r = await call();
    expect(r.listings.every((l: { hidden: boolean }) => !l.hidden)).toBe(true);
  });

  it("non-admin key never gets hidden listings, even when asking", async () => {
    auth.mockResolvedValue({ ok: true, admin: false });
    const r = await call("?include=hidden");
    expect(r.listings.map((l: { id: string }) => l.id)).toEqual(["live-1", "live-2"]);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
// No Supabase in tests: the service-key client is missing, so write tools stop before touching data.
vi.mock("@/lib/supabase/server", () => ({ createAdminClient: () => null, createClient: async () => ({}) }));
const lookupAddress = vi.fn();
vi.mock("@/lib/geocode", () => ({ lookupAddress: (q: string) => lookupAddress(q) }));

const { TOOLS } = await import("./tools");
const { handleBody } = await import("./protocol");
const { CreateArgs } = await import("./listing-tools");

const info = { name: "t", version: "1", instructions: "" };
const call = async (name: string, args: Record<string, unknown>) =>
  (await handleBody({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }, TOOLS, info)) as {
    result: { isError?: boolean; content: { text: string }[]; structuredContent?: Record<string, unknown> };
  };

const home = {
  address: "12135 Ashland Dr",
  city: "Fishers",
  price: 599_900,
  beds: 4,
  baths: 2.5,
  sqft: 2800,
  concession: 15_000,
  photoUrls: ["https://example.com/front.jpg"],
};

beforeEach(() => {
  lookupAddress.mockReset();
  lookupAddress.mockResolvedValue([{ address: "12135 Ashland Dr", city: "Fishers", county: "Hamilton", zip: "46037", lat: 39.97, lng: -85.95 }]);
});

describe("mcp listing tools", () => {
  it("are listed alongside send_listing_to_agent", async () => {
    const list = (await handleBody({ jsonrpc: "2.0", id: 1, method: "tools/list" }, TOOLS, info)) as { result: { tools: { name: string; inputSchema: { required?: string[] } }[] } };
    const names = list.result.tools.map((t) => t.name);
    expect(names).toContain("create_hidden_listing");
    expect(names).toContain("update_listing");
    expect(names).toContain("send_listing_to_agent");
    const create = list.result.tools.find((t) => t.name === "create_hidden_listing")!;
    expect(create.inputSchema.required?.sort()).toEqual(["address", "beds", "baths", "concession", "photoUrls", "price", "sqft"].sort());
  });

  it("uses the posting wizard's limits", () => {
    expect(CreateArgs.safeParse(home).success).toBe(true);
    expect(CreateArgs.safeParse({ ...home, photoUrls: [] }).success).toBe(false);
    expect(CreateArgs.safeParse({ ...home, photoUrls: Array(8).fill("https://example.com/a.jpg") }).success).toBe(false);
    expect(CreateArgs.safeParse({ ...home, photoUrls: ["http://example.com/a.jpg"] }).success).toBe(false);
    expect(CreateArgs.safeParse({ ...home, defaultDownPct: 7 }).success).toBe(false);
    expect(CreateArgs.safeParse({ ...home, externalUrl: "https://example.com/x" }).success).toBe(false);
    expect(CreateArgs.safeParse({ ...home, county: "Cook" }).success).toBe(false);
  });

  it("rejects bad input before doing anything", async () => {
    const r = await call("create_hidden_listing", { ...home, price: 0 });
    expect(r.result.isError).toBe(true);
    expect(r.result.content[0].text).toMatch(/^Invalid arguments: price/);
    expect(lookupAddress).not.toHaveBeenCalled();
  });

  it("refuses addresses outside the served counties", async () => {
    lookupAddress.mockResolvedValue([]);
    const r = await call("create_hidden_listing", { ...home, address: "1 Main St", city: "Chicago" });
    expect(r.result.isError).toBe(true);
    expect(r.result.content[0].text).toMatch(/Couldn't find "1 Main St, Chicago"/);
  });

  it("skips the geocoder when the full location is given", async () => {
    const r = await call("create_hidden_listing", { ...home, county: "Hamilton", lat: 39.97, lng: -85.95 });
    expect(lookupAddress).not.toHaveBeenCalled();
    // Gets as far as the database, which needs the service key.
    expect(r.result.content[0].text).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("geocodes the address and city otherwise", async () => {
    await call("create_hidden_listing", home);
    expect(lookupAddress).toHaveBeenCalledWith("12135 Ashland Dr, Fishers");
  });

  it("update_listing needs an id and at least valid fields", async () => {
    expect((await call("update_listing", { price: 1 })).result.content[0].text).toMatch(/^Invalid arguments: id/);
    expect((await call("update_listing", { id: "x", defaultDownPct: 7 })).result.isError).toBe(true);
  });
});

describe("send_listing_to_agent", () => {
  it("is marked for explicit requests only and validates the email", async () => {
    const list = (await handleBody({ jsonrpc: "2.0", id: 1, method: "tools/list" }, TOOLS, info)) as { result: { tools: { name: string; description: string }[] } };
    expect(list.result.tools.find((t) => t.name === "send_listing_to_agent")!.description).toMatch(/only call this when the user explicitly asks/i);
    expect((await call("send_listing_to_agent", { id: "x", email: "not-an-email" })).result.content[0].text).toMatch(/^Invalid arguments: email/);
  });
});

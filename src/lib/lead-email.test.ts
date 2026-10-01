import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { leadEmail } = await import("./lead-email");

const lead = {
  name: "Test <Buyer>",
  email: "test.buyer@example.com",
  phone: "317-555-0100",
  message: "Hi\nthere",
  topic: "points" as const,
  listingId: "sample-1",
  listingLabel: "12135 Ashland Dr, Fishers",
  answers: [{ question: "What's your estimated credit score?", answer: "700–739" }],
  consentAt: "2026-10-01T15:00:00.000Z",
  consentText: "I agree to be contacted…",
};

describe("lead email", () => {
  const e = leadEmail(lead, "https://buydownindy.com/");

  it("flags points requests in the subject", () => {
    expect(e.subject).toBe("New lead: Test <Buyer> · 12135 Ashland Dr, Fishers (points)");
  });

  it("escapes buyer-entered text and links the listing and phone", () => {
    expect(e.html).toContain("Test &lt;Buyer&gt;");
    expect(e.html).not.toContain("Test <Buyer>");
    expect(e.html).toContain('href="https://buydownindy.com/listing/sample-1"');
    expect(e.html).toContain('href="tel:317-555-0100"'.replace("317-555-0100", "3175550100"));
    expect(e.html).toContain("Hi<br>there");
  });

  it("includes quiz answers and consent in plain text", () => {
    expect(e.text).toContain("- What's your estimated credit score? 700–739");
    expect(e.text).toContain("Oct 1, 2026, 11:00 AM");
  });
});

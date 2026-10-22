import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { newAgentEmail, agentVerifiedEmail } = await import("./agent-email");

const agent = {
  name: "Pat <Agent>",
  email: "pat.agent@example.com",
  phone: "(317) 555-0100",
  brokerage: "Example Realty",
  licenseNumber: "RB14012345",
};

describe("new agent email", () => {
  const e = newAgentEmail(agent, "https://buydownindy.com");

  it("names the agent and brokerage in the subject", () => {
    expect(e.subject).toBe("New agent sign-up: Pat <Agent> · Example Realty");
  });

  it("escapes agent-entered text and links the admin page, phone and email", () => {
    expect(e.html).toContain("Pat &lt;Agent&gt;");
    expect(e.html).not.toContain("Pat <Agent>");
    expect(e.html).toContain('href="https://buydownindy.com/agent/admin"');
    expect(e.html).toContain('href="tel:3175550100"');
    expect(e.html).toContain("RB14012345");
    expect(e.text).toContain("Review: https://buydownindy.com/agent/admin");
  });

  it("handles a missing license number", () => {
    expect(newAgentEmail({ ...agent, licenseNumber: null }, "https://buydownindy.com").text).toContain("License #: Not given");
  });
});

describe("agent verified email", () => {
  const e = agentVerifiedEmail(agent, "https://buydownindy.com");

  it("greets the agent by first name and links to posting a listing", () => {
    expect(e.subject).toBe("You're verified on BuyDown Indy");
    expect(e.html).toContain("Hi Pat,");
    expect(e.html).toContain('href="https://buydownindy.com/agent/post"');
    expect(e.text).toContain("Post a listing: https://buydownindy.com/agent/post");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { authorized, handleBody, ToolError } = await import("./protocol");

const info = { name: "test", version: "1", instructions: "x" };
const tools = [
  { name: "echo", description: "", inputSchema: { type: "object" }, run: async (a: Record<string, unknown>) => ({ got: a }) },
  { name: "boom", description: "", inputSchema: { type: "object" }, run: async () => { throw new ToolError("nope"); } },
];

describe("mcp auth", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("needs the exact bearer key, and is off without one", () => {
    vi.stubEnv("MCP_API_KEY", "secret-key");
    expect(authorized("Bearer secret-key")).toBe(true);
    expect(authorized("bearer secret-key")).toBe(true);
    expect(authorized("Bearer secret-kez")).toBe(false);
    expect(authorized("secret-key")).toBe(false);
    expect(authorized(null)).toBe(false);
    vi.stubEnv("MCP_API_KEY", "");
    expect(authorized("Bearer ")).toBe(false);
  });
});

describe("mcp messages", () => {
  it("negotiates the protocol version", async () => {
    const r = (await handleBody({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2099-01-01" } }, tools, info)) as { result: { protocolVersion: string } };
    expect(r.result.protocolVersion).toBe("2025-06-18");
  });

  it("returns nothing for notifications", async () => {
    expect(await handleBody({ jsonrpc: "2.0", method: "notifications/initialized" }, tools, info)).toBeNull();
  });

  it("lists tools without their code and runs them", async () => {
    const list = (await handleBody({ jsonrpc: "2.0", id: 2, method: "tools/list" }, tools, info)) as { result: { tools: object[] } };
    expect(list.result.tools[0]).not.toHaveProperty("run");
    const ok = (await handleBody({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "echo", arguments: { a: 1 } } }, tools, info)) as {
      result: { structuredContent: unknown; isError?: boolean };
    };
    expect(ok.result.structuredContent).toEqual({ got: { a: 1 } });
    expect(ok.result.isError).toBeUndefined();
  });

  it("reports tool errors as results and unknown methods as errors", async () => {
    const bad = (await handleBody({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "boom" } }, tools, info)) as {
      result: { isError: boolean; content: { text: string }[] };
    };
    expect(bad.result.isError).toBe(true);
    expect(bad.result.content[0].text).toBe("nope");
    const nf = (await handleBody({ jsonrpc: "2.0", id: 5, method: "nope" }, tools, info)) as { error: { code: number } };
    expect(nf.error.code).toBe(-32601);
  });
});

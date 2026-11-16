import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

// Minimal MCP server over Streamable HTTP (JSON responses, no streaming): initialize, ping, tools/list, tools/call.
// Spec: https://modelcontextprotocol.io/specification — clients POST JSON-RPC 2.0 messages to one endpoint.

export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /** Hints for the client: read-only tools change nothing; destructive tools can't be undone. */
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean; title?: string };
  run: (args: Record<string, unknown>) => Promise<unknown>;
}

/** A tool failure the AI should see as a message (not a protocol error). */
export class ToolError extends Error {}

const SUPPORTED = ["2025-06-18", "2025-03-26", "2024-11-05"];

type Msg = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };

/** True when the request carries the MCP_API_KEY as a bearer token (constant-time compare). */
export function authorized(header: string | null): boolean {
  const key = process.env.MCP_API_KEY;
  const got = header?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!key || !got) return false;
  const a = createHash("sha256").update(got).digest();
  const b = createHash("sha256").update(key).digest();
  return timingSafeEqual(a, b);
}

const reply = (id: Msg["id"], result: unknown) => ({ jsonrpc: "2.0", id, result });
const fail = (id: Msg["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

async function handle(msg: Msg, tools: Tool[], info: { name: string; version: string; instructions: string }) {
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return fail(msg?.id, -32600, "Invalid request");
  // Notifications (no id) get no response.
  if (msg.id === undefined || msg.id === null) return null;

  switch (msg.method) {
    case "initialize": {
      const asked = String(msg.params?.protocolVersion ?? "");
      return reply(msg.id, {
        protocolVersion: SUPPORTED.includes(asked) ? asked : SUPPORTED[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: info.name, version: info.version },
        instructions: info.instructions,
      });
    }
    case "ping":
      return reply(msg.id, {});
    case "tools/list":
      return reply(msg.id, { tools: tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema, annotations: t.annotations })) });
    case "tools/call": {
      const name = String(msg.params?.name ?? "");
      const tool = tools.find((t) => t.name === name);
      if (!tool) return fail(msg.id, -32602, `Unknown tool: ${name}`);
      const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
      try {
        const out = await tool.run(args);
        return reply(msg.id, { content: [{ type: "text", text: JSON.stringify(out, null, 2) }], structuredContent: out });
      } catch (e) {
        const text = e instanceof ToolError ? e.message : `Something went wrong: ${e instanceof Error ? e.message : String(e)}`;
        if (!(e instanceof ToolError)) console.error(`[mcp] ${name}`, e);
        return reply(msg.id, { content: [{ type: "text", text }], isError: true });
      }
    }
    default:
      return fail(msg.id, -32601, `Method not found: ${msg.method}`);
  }
}

/** Handle one POST body (a message or a batch). Returns the JSON to send, or null for "202 Accepted". */
export async function handleBody(body: unknown, tools: Tool[], info: { name: string; version: string; instructions: string }) {
  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map((m) => handle(m as Msg, tools, info)))).filter(Boolean);
    return out.length ? out : null;
  }
  return handle(body as Msg, tools, info);
}

import { NextResponse } from "next/server";
import { authorized, handleBody } from "@/lib/mcp/protocol";
import { MCP_INFO, TOOLS } from "@/lib/mcp/tools";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// BuyDown Indy MCP connector (full admin). Connect an AI client to https://www.buydownindy.com/api/mcp
// with the header `Authorization: Bearer <MCP_API_KEY>`. Off until MCP_API_KEY is set in Vercel.
export async function POST(req: Request) {
  if (!process.env.MCP_API_KEY) return NextResponse.json({ error: "MCP connector is off (MCP_API_KEY not set)." }, { status: 503 });
  if (!authorized(req.headers.get("authorization")))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "www-authenticate": 'Bearer realm="buydown-indy"' } });
  const body = await req.json().catch(() => undefined);
  if (body === undefined) return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400 });
  const out = await handleBody(body, TOOLS, MCP_INFO);
  return out === null ? new Response(null, { status: 202 }) : NextResponse.json(out);
}

// No server-to-client stream; this server only answers POSTs.
export function GET() {
  return new Response("Method Not Allowed", { status: 405, headers: { allow: "POST" } });
}
export function DELETE() {
  return new Response(null, { status: 405, headers: { allow: "POST" } });
}

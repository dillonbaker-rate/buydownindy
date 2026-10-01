import { NextResponse } from "next/server";
import { getCurrentAgent } from "@/lib/data";
import { revokeApiKey } from "@/lib/marketing";

// Revoke one of the signed-in agent's API keys.
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentAgent();
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const err = await revokeApiKey(me.userId, (await params).id);
  return err ? NextResponse.json({ error: err }, { status: 400 }) : NextResponse.json({ ok: true });
}

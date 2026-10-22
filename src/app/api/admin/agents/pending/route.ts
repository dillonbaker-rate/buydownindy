import { NextResponse } from "next/server";
import { getCurrentAgent, getPendingAgents } from "@/lib/data";
import { isAdmin } from "@/lib/rates";

export const dynamic = "force-dynamic";

// Admin: agents waiting for verification (polled by the notification bell).
export async function GET() {
  const me = await getCurrentAgent();
  if (!me || !isAdmin(me.email)) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const agents = (await getPendingAgents()).filter((a) => a.id !== me.userId);
  return NextResponse.json({ agents });
}

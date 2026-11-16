import { after, NextResponse } from "next/server";
import { z } from "zod";
import { sendHandoffEmail } from "@/lib/agent-email";
import { getCurrentAgent, getListing } from "@/lib/data";
import { claimPath, firstName, setHandoff } from "@/lib/handoff";
import { isAdmin } from "@/lib/rates";

const Body = z.object({
  email: z.string().trim().toLowerCase().email("Enter the agent's email address."),
  /** The agent's name, for "Hey Jane," in the email. Optional. */
  name: z.string().trim().max(120).optional(),
});

// Admin: send a hidden listing to an agent. Saves their email, makes a fresh private link (any earlier link
// stops working) and emails it to them. Returns the link so it can also be copied and texted.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentAgent();
  if (!me || !isAdmin(me.email)) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Enter the agent's email address." }, { status: 400 });
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

  const name = parsed.data.name || null;
  const r = await setHandoff(id, me.userId, parsed.data.email, name);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
  const path = claimPath(r.token);
  after(() => sendHandoffEmail(parsed.data.email, { address: listing.address, city: listing.city, claimPath: path, photo: listing.photos[0]?.url, firstName: firstName(name) }));
  return NextResponse.json({ ok: true, path });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { handoffEmail } from "@/lib/agent-email";
import { getCurrentAgent, getListing } from "@/lib/data";
import { sendEmail, siteUrl } from "@/lib/email";
import { firstName } from "@/lib/handoff";
import { isAdmin } from "@/lib/rates";

const Body = z.object({ listingId: z.string(), to: z.string().trim().toLowerCase().email("Enter an email address.") });

// Admin: send a test of a hidden listing's "listing ready" email to any address. The listing isn't changed (no new
// private link, nothing replaced), the subject starts with [Test], and the buttons open the admin/agent example view
// instead of the real claim link.
export async function POST(req: Request) {
  const me = await getCurrentAgent();
  if (!me || !isAdmin(me.email)) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the address." }, { status: 400 });
  const l = await getListing(parsed.data.listingId);
  if (!l) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

  const e = handoffEmail({
    address: l.address,
    city: l.city,
    claimUrl: `${siteUrl()}/agent/examples/${l.id}`,
    photo: l.photos[0]?.url,
    firstName: firstName(l.handoffName),
  });
  await sendEmail("test", { to: [parsed.data.to], replyTo: me.email, ...e, subject: `[Test] ${e.subject}` });
  return NextResponse.json({ ok: true, to: parsed.data.to });
}

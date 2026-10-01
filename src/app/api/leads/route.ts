import { after, NextResponse } from "next/server";
import { z } from "zod";
import { LENDER_CONSENT } from "@/content/disclosures";
import { cookies } from "next/headers";
import { INVITE_COOKIE, openInvite } from "@/lib/invites";
import { sendLeadEmail } from "@/lib/lead-email";
import { saveDemoLead } from "@/lib/leads";
import { demoMode, supabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const Answer = z.object({ id: z.string().max(40), question: z.string().max(200), answer: z.string().max(400) });

const Lead = z.object({
  listingId: z.string().max(64).optional(),
  listingLabel: z.string().max(200).optional(),
  topic: z.enum(["general", "points"]).default("general"),
  answers: z.array(Answer).max(20).default([]),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().regex(/^\S+@\S+\.\S+$/).max(200),
  phone: z
    .string()
    .max(40)
    .refine((p) => p.replace(/\D/g, "").length >= 10),
  message: z.string().max(2000).optional(),
  consent: z.literal(true),
  consentText: z.string(),
});

export async function POST(req: Request) {
  const parsed = Lead.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check the form and try again." }, { status: 400 });
  const d = parsed.data;
  // COMPLIANCE: store the exact consent wording shown, plus a server timestamp.
  if (d.consentText !== LENDER_CONSENT) return NextResponse.json({ error: "Consent text is out of date. Refresh the page." }, { status: 400 });

  // If the buyer came through an agent's invite link, tag the lead with it.
  const inviteCode = (await cookies()).get(INVITE_COOKIE)?.value ?? null;
  const invite = inviteCode ? await openInvite(inviteCode, false) : null;

  const row = {
    listing_id: d.listingId && UUID.test(d.listingId) ? d.listingId : null,
    listing_label: d.listingLabel ?? null,
    topic: d.topic,
    answers: d.answers,
    name: d.name,
    email: d.email,
    phone: d.phone,
    message: d.message ?? null,
    consent_at: new Date().toISOString(),
    consent_text: LENDER_CONSENT,
    user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
    invite_code: invite ? inviteCode : null,
  };

  // Email Dillon after the response is sent, so the buyer never waits on it.
  const notify = () =>
    after(() =>
      sendLeadEmail({
        name: row.name,
        email: row.email,
        phone: row.phone,
        message: row.message,
        topic: d.topic,
        listingId: d.listingId ?? null,
        listingLabel: row.listing_label,
        answers: d.answers,
        consentAt: row.consent_at,
        consentText: row.consent_text,
        invitedBy: invite ? `${invite.agentName}, ${invite.brokerage}` : null,
      }),
    );

  if (!supabaseConfigured) {
    console.info("[demo] lead received (Supabase not configured):", row.listing_label, row.email, row.topic, "invite:", row.invite_code, row.answers);
    if (demoMode)
      await saveDemoLead({
        createdAt: new Date().toISOString(),
        name: row.name,
        email: row.email,
        phone: row.phone,
        message: row.message,
        topic: d.topic,
        listingId: d.listingId ?? null,
        listingLabel: row.listing_label,
        answers: d.answers,
        consentAt: row.consent_at,
        consentText: row.consent_text,
        inviteCode: row.invite_code,
        invitedBy: invite ? `${invite.agentName}, ${invite.brokerage}` : null,
      });
    notify();
    return NextResponse.json({ ok: true, demo: true });
  }
  // Service key if present; otherwise the public insert policy (migration 0003).
  const admin = createAdminClient() ?? (await createClient());
  if (!admin) {
    console.error("SUPABASE_SERVICE_ROLE_KEY missing; cannot store lead");
    return NextResponse.json({ error: "We couldn't send that right now. Please try again later." }, { status: 503 });
  }
  const { error } = await admin.from("leads").insert(row);
  if (error) {
    console.error("lead insert", error.message);
    return NextResponse.json({ error: "We couldn't send that right now. Please try again later." }, { status: 500 });
  }
  notify();
  return NextResponse.json({ ok: true });
}

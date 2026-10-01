import { NextResponse } from "next/server";
import { z } from "zod";
import { saveDemoAgent } from "@/lib/demo-store";
import { demoMode } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { COUNTIES } from "@/lib/types";

const phone = z
  .string()
  .trim()
  .max(40)
  .refine((p) => p.replace(/\D/g, "").length >= 10, "Enter a 10-digit phone number.");
const optPhone = z.union([phone, z.literal("")]).optional();
const optText = (max: number) => z.string().trim().max(max).optional();
const optUrl = z
  .string()
  .trim()
  .max(300)
  .optional()
  .refine((u) => !u || /^https?:\/\/\S+\.\S+/i.test(u), "Use a full link starting with https://");

const Profile = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(120),
  brokerage: z.string().trim().min(1, "Enter your brokerage.").max(120),
  phone,
  // Indiana broker licenses look like RB14012345; accept 6–14 letters/digits and let the admin verify.
  licenseNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{6,14}$/, "Enter your Indiana real estate license number, e.g. RB14012345."),
  mlsId: optText(40),
  teamName: optText(120),
  officePhone: optPhone,
  officeAddress: optText(200),
  licensedSince: z.union([z.number().int().min(1950).max(new Date().getFullYear()), z.null()]).optional(),
  counties: z.array(z.enum(COUNTIES)).max(COUNTIES.length).optional(),
  website: optUrl,
  instagram: optText(100),
  facebook: optText(200),
  linkedin: optText(200),
  bio: optText(600),
  photoUrl: z
    .string()
    .max(500)
    .optional()
    .refine((u) => !u || /^https:\/\//.test(u) || u.startsWith("/api/demo/photos/"), "Invalid photo"),
});

const blank = (v: string | undefined | null) => (v && v.trim() ? v.trim() : null);

// Create or update the signed-in agent's profile. Verification is admin-only (enforced in the database).
export async function PUT(req: Request) {
  const parsed = Profile.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check your profile." }, { status: 400 });
  }
  const d = parsed.data;

  if (demoMode) {
    await saveDemoAgent({
      ...d,
      mlsId: blank(d.mlsId),
      teamName: blank(d.teamName),
      officePhone: blank(d.officePhone),
      officeAddress: blank(d.officeAddress),
      website: blank(d.website),
      instagram: blank(d.instagram),
      facebook: blank(d.facebook),
      linkedin: blank(d.linkedin),
      bio: blank(d.bio),
      photoUrl: blank(d.photoUrl),
    });
    return NextResponse.json({ ok: true });
  }

  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { error } = await sb.from("agents").upsert({
    id: user.id,
    email: user.email,
    name: d.name,
    brokerage: d.brokerage,
    phone: d.phone,
    license_number: d.licenseNumber,
    mls_id: blank(d.mlsId),
    team_name: blank(d.teamName),
    office_phone: blank(d.officePhone),
    office_address: blank(d.officeAddress),
    licensed_since: d.licensedSince ?? null,
    counties: d.counties ?? [],
    website: blank(d.website),
    instagram: blank(d.instagram),
    facebook: blank(d.facebook),
    linkedin: blank(d.linkedin),
    bio: blank(d.bio),
    photo_url: blank(d.photoUrl),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

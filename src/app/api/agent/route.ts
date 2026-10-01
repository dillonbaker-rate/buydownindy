import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Profile = z.object({
  name: z.string().trim().min(1).max(120),
  brokerage: z.string().trim().min(1).max(120),
  phone: z
    .string()
    .trim()
    .max(40)
    .refine((p) => p.replace(/\D/g, "").length >= 10),
});

// Create or update the signed-in agent's profile.
export async function PUT(req: Request) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const parsed = Profile.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your name, brokerage and a 10-digit phone." }, { status: 400 });
  const { error } = await sb.from("agents").upsert({ id: user.id, email: user.email, ...parsed.data });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

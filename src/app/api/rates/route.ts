import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { indyToday } from "@/lib/rate-info";
import { isRateAdmin, saveDaily } from "@/lib/rates";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const rate = z.number().min(1).max(20);
const Body = z.object({ conventional: rate, fha: rate, va: rate });

// Save today's Rate 30-year fixed rates. Admins only (ADMIN_EMAILS).
export async function POST(req: Request) {
  let userId: string | null = null;
  let email: string | null = null;
  if (supabaseConfigured) {
    const {
      data: { user },
    } = await (await createClient()).auth.getUser();
    userId = user?.id ?? null;
    email = user?.email ?? null;
  }
  if (!isRateAdmin(email)) return NextResponse.json({ error: "Only admins can set rates." }, { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter each rate as a percent, e.g. 7.125." }, { status: 400 });

  const err = await saveDaily({ date: indyToday(), ...parsed.data }, userId);
  if (err) return NextResponse.json({ error: err }, { status: 500 });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, date: indyToday() });
}

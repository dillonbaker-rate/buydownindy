import { NextResponse } from "next/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  if (supabaseConfigured) await (await createClient()).auth.signOut();
  return NextResponse.redirect(new URL("/", req.url), { status: 303 });
}

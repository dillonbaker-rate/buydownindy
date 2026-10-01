import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Magic-link landing: trade the one-time code for a session, then go to the dashboard.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const dest = next && next.startsWith("/agent") ? next : "/agent";
  if (code) {
    const sb = await createClient();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(dest, url.origin));
  }
  return NextResponse.redirect(new URL("/agent/login?error=link", url.origin));
}

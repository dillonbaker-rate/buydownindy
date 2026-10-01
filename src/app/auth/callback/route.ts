import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Sign-in link landing. Handles both link styles Supabase sends:
//  - ?code=…                (PKCE: must be opened in the same browser that asked for the link)
//  - ?token_hash=…&type=…   (works in any browser; used by the custom email template in the README)
// Then goes to My listings, which starts profile setup for first-time agents.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") ?? "email") as EmailOtpType;
  const next = url.searchParams.get("next");
  const dest = next && next.startsWith("/agent") ? next : "/agent";
  const sb = await createClient();

  if (tokenHash) {
    const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(new URL(dest, url.origin));
    console.error("auth verifyOtp", error.message);
  } else if (code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(dest, url.origin));
    console.error("auth exchangeCode", error.message);
  }
  return NextResponse.redirect(new URL("/agent/login?error=link", url.origin));
}

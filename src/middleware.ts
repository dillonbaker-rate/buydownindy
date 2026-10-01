import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase auth session cookie on agent routes, and rescues sign-in links that land on
// the wrong page (Supabase falls back to the Site URL when /auth/callback isn't an allowed redirect).
export async function middleware(req: NextRequest) {
  const p = req.nextUrl;
  if (!p.pathname.startsWith("/auth/")) {
    const code = p.searchParams.get("code");
    const tokenHash = p.searchParams.get("token_hash");
    if (code || tokenHash) {
      const to = new URL("/auth/callback", p.origin);
      p.searchParams.forEach((v, k) => to.searchParams.set(k, v));
      return NextResponse.redirect(to);
    }
    if (p.searchParams.get("error_code") || p.searchParams.get("error_description")) {
      return NextResponse.redirect(new URL("/agent/login?error=link", p.origin));
    }
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  let res = NextResponse.next({ request: req });
  if (!url || !key) return res;
  const sb = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  await sb.auth.getUser();
  return res;
}

export const config = {
  matcher: ["/", "/agent/:path*", "/api/listings/:path*", "/api/rates", "/api/agent", "/auth/:path*"],
};

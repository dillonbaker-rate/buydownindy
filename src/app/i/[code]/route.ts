import { NextResponse } from "next/server";
import { INVITE_COOKIE, openInvite } from "@/lib/invites";

// A client's personal invite link: count the open, remember the invite for 90 days, show the map.
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const url = new URL(req.url);
  const ok = await openInvite(code, true);
  const res = NextResponse.redirect(new URL("/homes", url.origin));
  if (ok)
    res.cookies.set(INVITE_COOKIE, code, { maxAge: 60 * 60 * 24 * 90, httpOnly: true, sameSite: "lax", secure: url.protocol === "https:", path: "/" });
  return res;
}

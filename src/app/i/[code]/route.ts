import { NextResponse } from "next/server";

// Old client-invite links (feature retired): just open the map.
export async function GET(req: Request) {
  return NextResponse.redirect(new URL("/homes", req.url));
}

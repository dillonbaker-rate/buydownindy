import { NextResponse } from "next/server";
import { lookupAddress } from "@/lib/geocode";

/**
 * Address typeahead. Uses Mapbox when MAPBOX_TOKEN is set. Otherwise the free US Census geocoder is the
 * main source (fast, has house numbers OSM lacks); Photon (OSM) is a capped backup for partial input.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) return NextResponse.json({ suggestions: [] });
  try {
    return NextResponse.json({ suggestions: await lookupAddress(q) });
  } catch (e) {
    console.error("geocode", e);
    return NextResponse.json({ suggestions: [], error: "Address lookup is unavailable right now." }, { status: 502 });
  }
}

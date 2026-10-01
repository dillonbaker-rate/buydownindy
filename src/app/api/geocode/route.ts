import { NextResponse } from "next/server";
import { COUNTIES } from "@/lib/types";

export interface Suggestion {
  address: string;
  city: string;
  county: string;
  zip?: string;
  lat: number;
  lng: number;
}

// Greater Indianapolis (the six counties we serve).
const BBOX = [-86.7, 39.45, -85.6, 40.2];
const countyName = (s?: string) => (s ?? "").replace(/ County$/i, "").trim();
const served = (c: string) => (COUNTIES as readonly string[]).includes(c);

/**
 * Address typeahead. Uses Mapbox when MAPBOX_TOKEN is set (recommended for production);
 * otherwise Photon (OSM-based, free, fair-use).
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 3) return NextResponse.json({ suggestions: [] });
  try {
    const out = process.env.MAPBOX_TOKEN ? await mapbox(q, process.env.MAPBOX_TOKEN) : await photon(q);
    return NextResponse.json({ suggestions: out.filter((s) => served(s.county)).slice(0, 6) });
  } catch (e) {
    console.error("geocode", e);
    return NextResponse.json({ suggestions: [], error: "Address lookup is unavailable right now." }, { status: 502 });
  }
}

async function photon(q: string): Promise<Suggestion[]> {
  const u = new URL("https://photon.komoot.io/api/");
  u.searchParams.set("q", q);
  u.searchParams.set("limit", "10");
  u.searchParams.set("lang", "en");
  u.searchParams.set("lat", "39.8");
  u.searchParams.set("lon", "-86.15");
  u.searchParams.set("bbox", BBOX.join(","));
  u.searchParams.set("layer", "house");
  const r = await fetch(u, { headers: { "user-agent": "BuyDownIndy/1.0" }, next: { revalidate: 3600 } });
  if (!r.ok) throw new Error("photon " + r.status);
  const j = (await r.json()) as {
    features: { geometry: { coordinates: [number, number] }; properties: Record<string, string> }[];
  };
  return j.features
    .filter((f) => f.properties.housenumber && f.properties.street && /indiana/i.test(f.properties.state ?? ""))
    .map((f) => ({
      address: `${f.properties.housenumber} ${f.properties.street}`,
      city: f.properties.city ?? f.properties.district ?? f.properties.locality ?? "",
      county: countyName(f.properties.county),
      zip: f.properties.postcode,
      lng: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
    }));
}

async function mapbox(q: string, token: string): Promise<Suggestion[]> {
  const u = new URL("https://api.mapbox.com/search/geocode/v6/forward");
  u.searchParams.set("q", q);
  u.searchParams.set("access_token", token);
  u.searchParams.set("country", "us");
  u.searchParams.set("types", "address");
  u.searchParams.set("autocomplete", "true");
  u.searchParams.set("limit", "8");
  u.searchParams.set("bbox", BBOX.join(","));
  u.searchParams.set("proximity", "-86.15,39.8");
  const r = await fetch(u);
  if (!r.ok) throw new Error("mapbox " + r.status);
  const j = (await r.json()) as {
    features: {
      geometry: { coordinates: [number, number] };
      properties: { name: string; context: Record<string, { name: string }> };
    }[];
  };
  return j.features.map((f) => ({
    address: f.properties.name,
    city: f.properties.context.place?.name ?? f.properties.context.locality?.name ?? "",
    county: countyName(f.properties.context.district?.name),
    zip: f.properties.context.postcode?.name,
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  }));
}

import { getLiveListings } from "@/lib/data";
import { authorizeApiKey, listingMarketing } from "@/lib/marketing";
import { getRateInfo } from "@/lib/rates";
import { json, preflight } from "../cors";

export const OPTIONS = preflight;

// GET /api/v1/listings — every live listing with its payment comparison. Optional ?county=Hamilton&city=Fishers
export async function GET(req: Request) {
  const auth = await authorizeApiKey(req.headers.get("authorization"));
  if (!auth.ok) return json({ error: auth.error }, auth.status);
  const url = new URL(req.url);
  const county = url.searchParams.get("county")?.toLowerCase();
  const city = url.searchParams.get("city")?.toLowerCase();
  const [listings, info] = await Promise.all([getLiveListings(), getRateInfo()]);
  const rows = listings
    .filter((l) => !l.isSample)
    .filter((l) => (!county || l.county.toLowerCase() === county) && (!city || l.city.toLowerCase() === city))
    .map((l) => listingMarketing(l, info, url.origin));
  return json({ count: rows.length, asOf: info.date, listings: rows });
}

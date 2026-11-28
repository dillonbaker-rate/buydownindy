import { getHiddenListings, getLiveListings } from "@/lib/data";
import { authorizeApiKey, listingMarketing } from "@/lib/marketing";
import { getRateInfo } from "@/lib/rates";
import { json, preflight } from "../cors";

export const OPTIONS = preflight;

// GET /api/v1/listings — every live listing with its payment comparison. Optional ?county=Hamilton&city=Fishers
// Admin keys may add ?include=hidden to also get hidden (draft) listings, marked hidden: true (Solomon uses these
// in Dillon's own lead emails only; they never go on a public page).
export async function GET(req: Request) {
  const auth = await authorizeApiKey(req.headers.get("authorization"));
  if (!auth.ok) return json({ error: auth.error }, auth.status);
  const url = new URL(req.url);
  const county = url.searchParams.get("county")?.toLowerCase();
  const city = url.searchParams.get("city")?.toLowerCase();
  const withHidden = auth.admin && url.searchParams.get("include") === "hidden";
  const [live, hidden, info] = await Promise.all([getLiveListings(), withHidden ? getHiddenListings() : Promise.resolve([]), getRateInfo()]);
  const keep = (l: { isSample: boolean; county: string; city: string }) =>
    !l.isSample && (!county || l.county.toLowerCase() === county) && (!city || l.city.toLowerCase() === city);
  const rows = [
    ...live.filter(keep).map((l) => ({ ...listingMarketing(l, info, url.origin), hidden: false })),
    ...hidden.filter(keep).map((l) => ({ ...listingMarketing(l, info, url.origin), hidden: true, status: l.status })),
  ];
  return json({ count: rows.length, asOf: info.date, listings: rows });
}

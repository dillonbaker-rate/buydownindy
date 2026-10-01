import { getListing } from "@/lib/data";
import { authorizeApiKey, listingMarketing } from "@/lib/marketing";
import { getRateInfo } from "@/lib/rates";
import { json, preflight } from "../../cors";

export const OPTIONS = preflight;

// GET /api/v1/listings/:id — one listing's numbers, disclosures, and links.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApiKey(req.headers.get("authorization"));
  if (!auth.ok) return json({ error: auth.error }, auth.status);
  const [l, info] = await Promise.all([getListing((await params).id), getRateInfo()]);
  if (!l || l.status !== "live") return json({ error: "Listing not found or not live." }, 404);
  return json(listingMarketing(l, info, new URL(req.url).origin));
}

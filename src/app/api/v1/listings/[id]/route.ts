import { getListing } from "@/lib/data";
import { authorizeApiKey, listingMarketing } from "@/lib/marketing";
import { getRateInfo } from "@/lib/rates";
import { json, preflight } from "../../cors";

export const OPTIONS = preflight;

// GET /api/v1/listings/:id — one listing's numbers, disclosures, links and status (live, draft = hidden, pending, sold).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApiKey(req.headers.get("authorization"));
  if (!auth.ok) return json({ error: auth.error }, auth.status);
  const [l, info] = await Promise.all([getListing((await params).id), getRateInfo()]);
  // Any listing whose id you have, hidden (draft) ones included, like its link. `status` says which it is.
  if (!l) return json({ error: "Listing not found." }, 404);
  return json({ ...listingMarketing(l, info, new URL(req.url).origin), status: l.status });
}

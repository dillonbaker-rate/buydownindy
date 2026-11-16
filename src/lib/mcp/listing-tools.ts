import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import { LENDER } from "@/content/lender";
import { fromRow, LISTING_SELECT, type ListingRow } from "@/lib/data";
import { siteUrl } from "@/lib/email";
import { listingMarketing } from "@/lib/marketing";
import { getRateInfo } from "@/lib/rates";
import { COUNTIES, MAX_PHOTOS } from "@/lib/types";
import { db, expiry, tool, WRITE } from "./helpers";
import { ToolError } from "./protocol";

// Listing tools for the MCP connector: build hidden (draft) listings under the admin's account, edit them,
// and import photos. The admin sends hidden listings to agents from the site (My listings → Send to agent); only the
// agent can take it live (they confirm it's theirs, the seller agreed to the concession, and they can use the photos).

const money = z.number().int().nonnegative().max(100_000_000);
const PHOTO_BUCKET = "listing-photos";
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

const Fields = z.object({
  price: money.min(1).describe("List price in dollars."),
  concession: money.min(1).max(1_000_000).describe("Seller concession in dollars (example amount until the agent and seller confirm)."),
  beds: z.number().positive().max(50),
  baths: z.number().positive().max(50).describe("Full + half baths, e.g. 2.5."),
  sqft: z.number().int().positive().max(100_000),
  loanTypes: z.array(z.enum(["Conventional", "FHA", "VA"])).min(1).default(["Conventional", "FHA", "VA"]),
  defaultDownPct: z.union([z.literal(3), z.literal(3.5), z.literal(5), z.literal(10), z.literal(20)]).default(5),
  taxesPerYear: money.nullish().describe("Annual property taxes if known (county records); omit to estimate."),
  insurancePerYear: money.nullish(),
  hoaPerMonth: money.nullish(),
  zillowOrRedfinUrl: z
    .string()
    .trim()
    .url()
    .refine((u) => /^https:\/\/(www\.)?(zillow|redfin)\.com\//i.test(u), "Use a Zillow or Redfin link")
    .nullish(),
  photoUrls: z
    .array(z.string().url().refine((u) => u.startsWith("https://"), "Photo links must start with https://"))
    .max(MAX_PHOTOS)
    .optional()
    .describe(`Up to ${MAX_PHOTOS} https image links; the first is the cover. Only photos the listing agent or seller allows to be used.`),
});

/** The admin account hidden listings are built under (Dillon's agent profile). */
async function ownerId(): Promise<string> {
  const { data } = await db().from("agents").select("id").ilike("email", LENDER.email).maybeSingle();
  if (!data) throw new ToolError(`No agent profile found for ${LENDER.email}. Sign in to the site once and save a profile first.`);
  return data.id;
}

/** Look up an address with the site's own geocoder; it must be in one of the counties the site covers. */
async function geocode(address: string) {
  const r = await fetch(`${siteUrl()}/api/geocode?q=${encodeURIComponent(address)}`, { signal: AbortSignal.timeout(10_000) }).catch(() => null);
  const j = r?.ok ? ((await r.json()) as { suggestions: { address: string; city: string; county: string; zip?: string; lat: number; lng: number }[] }) : null;
  const hit = j?.suggestions?.[0];
  if (!hit) throw new ToolError(`Couldn't find "${address}" in ${COUNTIES.join(", ")} counties. Give the full street address, e.g. "12135 Ashland Dr, Fishers".`);
  return hit;
}

/** Download an image, fix rotation, shrink it to 1600px wide JPEG and store it in the listing photos bucket. */
async function importPhoto(url: string, folder: string) {
  const r = await fetch(url, { signal: AbortSignal.timeout(15_000), headers: { "user-agent": "BuyDownIndy/1.0" } }).catch(() => null);
  if (!r?.ok) throw new ToolError(`Couldn't download photo: ${url}`);
  if (!/^image\//.test(r.headers.get("content-type") ?? "")) throw new ToolError(`Not an image: ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > MAX_PHOTO_BYTES) throw new ToolError(`Photo is over 15 MB: ${url}`);
  const jpg = await sharp(buf).rotate().resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  const path = `${folder}/${randomUUID()}.jpg`;
  const sb = db();
  const { error } = await sb.storage.from(PHOTO_BUCKET).upload(path, jpg, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) throw new ToolError(`Couldn't store photo: ${error.message}`);
  return { url: sb.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl, path };
}

async function importPhotos(urls: string[], folder: string) {
  const out = [];
  for (const u of urls) out.push(await importPhoto(u, folder));
  return out;
}

const row = (f: Partial<z.infer<typeof Fields>>) => {
  const r: Record<string, unknown> = {};
  if (f.price !== undefined) r.price = f.price;
  if (f.concession !== undefined) r.concession = f.concession;
  if (f.beds !== undefined) r.beds = f.beds;
  if (f.baths !== undefined) r.baths = f.baths;
  if (f.sqft !== undefined) r.sqft = f.sqft;
  if (f.loanTypes !== undefined) r.loan_types = f.loanTypes;
  if (f.defaultDownPct !== undefined) r.default_down_pct = f.defaultDownPct;
  if (f.taxesPerYear !== undefined) r.taxes_yr = f.taxesPerYear;
  if (f.insurancePerYear !== undefined) r.insurance_yr = f.insurancePerYear;
  if (f.hoaPerMonth !== undefined) r.hoa_mo = f.hoaPerMonth;
  if (f.zillowOrRedfinUrl !== undefined) r.external_url = f.zillowOrRedfinUrl || null;
  return r;
};

/** What a tool returns after saving: the listing, where to review it, and the payment comparison buyers will see. */
async function summary(id: string) {
  const { data } = await db().from("listings").select(LISTING_SELECT).eq("id", id).single();
  const l = fromRow(data as ListingRow);
  const info = await getRateInfo();
  return {
    id: l.id,
    status: l.status,
    address: `${l.address}, ${l.city}, IN${l.zip ? " " + l.zip : ""}`,
    county: l.county,
    price: l.price,
    concession: l.concession,
    beds: l.beds,
    baths: l.baths,
    sqft: l.sqft,
    photos: l.photos.length,
    reviewInAdmin: `${siteUrl()}/agent/edit/${l.id}`,
    nextStep: l.status === "draft" ? "Give the user the reviewInAdmin link. They send it to the agent from My listings (Send to agent)." : null,
    paymentComparison: listingMarketing(l, info, siteUrl()).payments,
  };
}

export const LISTING_TOOLS = [
  tool(
    "create_hidden_listing",
    "Create a hidden (draft) listing under the admin's account: off the map, ready for the admin to send to the listing agent from My listings. " +
      "Give the full street address in Boone, Hamilton, Hancock, Hendricks, Johnson or Marion county; it's geocoded automatically. " +
      "Photos are copied into the site's storage. Returns the listing id, an admin link to review it, and the payment comparison buyers will see.",
    Fields.extend({ address: z.string().trim().min(5).max(200).describe('Full street address, e.g. "12135 Ashland Dr, Fishers, IN 46037".') }),
    WRITE,
    async (a) => {
      const owner = await ownerId();
      const place = await geocode(a.address);
      const photos = a.photoUrls?.length ? await importPhotos(a.photoUrls, owner) : [];
      const { data, error } = await db()
        .from("listings")
        .insert({
          ...row(a),
          agent_id: owner,
          address: place.address,
          city: place.city,
          county: place.county,
          zip: place.zip ?? null,
          lat: place.lat,
          lng: place.lng,
          photos,
          // The agent confirms photo rights when they take it live.
          photo_rights_confirmed: false,
          status: "draft",
          expires_at: expiry(),
        })
        .select("id")
        .single();
      if (error) throw new ToolError(/status_check|listings_status/.test(error.message) ? "Run migration 0012 in Supabase first." : error.message);
      return summary(data.id);
    },
  ),

  tool(
    "update_listing",
    "Edit a listing's details. Only the fields you pass change. photoUrls replaces all photos; addPhotoUrls appends. Works on any listing, but edit live listings only when the user asks.",
    Fields.partial().extend({
      id: z.string(),
      addPhotoUrls: z.array(z.string().url().refine((u) => u.startsWith("https://"))).max(MAX_PHOTOS).optional(),
    }),
    WRITE,
    async ({ id, photoUrls, addPhotoUrls, ...f }) => {
      const sb = db();
      const { data: cur } = await sb.from("listings").select("agent_id, photos").eq("id", id).maybeSingle();
      if (!cur) throw new ToolError("Listing not found.");
      const patch = row(f);
      const folder = cur.agent_id ?? (await ownerId());
      if (photoUrls || addPhotoUrls) {
        const kept = photoUrls ? [] : ((cur.photos ?? []) as { url: string; path?: string }[]);
        const added = await importPhotos(photoUrls ?? addPhotoUrls ?? [], folder);
        const all = [...kept, ...added];
        if (all.length > MAX_PHOTOS) throw new ToolError(`A listing holds ${MAX_PHOTOS} photos at most.`);
        patch.photos = all;
      }
      if (!Object.keys(patch).length) throw new ToolError("Nothing to change.");
      const { error } = await sb.from("listings").update(patch).eq("id", id);
      if (error) throw new ToolError(error.message);
      return summary(id);
    },
  ),
];

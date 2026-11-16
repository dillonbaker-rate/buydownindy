import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import { fromRow, type ListingRow } from "@/lib/data";
import { siteUrl } from "@/lib/email";
import { lookupAddress } from "@/lib/geocode";
import { ListingInput, toRow } from "@/lib/listing-schema";
import { COUNTIES, MAX_PHOTOS, type Photo } from "@/lib/types";
import { db, expiry, tool, WRITE } from "./helpers";
import { ToolError } from "./protocol";

// Listing tools for the MCP connector: build hidden (draft) listings under the admin's account and edit them,
// importing photos into storage. They never put a listing live and never send email; sending is a separate tool
// (send_listing_to_agent) or the site's Send to agent button, and only the agent can take a listing live.

const PHOTO_BUCKET = "listing-photos";
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

const photoUrl = z.string().url().refine((u) => u.startsWith("https://"), "Photo links must start with https://");

/** The fields an AI client fills in. Same limits as the posting wizard (ListingInput); location may be left to the geocoder. */
export const CreateArgs = ListingInput.omit({ photos: true, photoRightsConfirmed: true, city: true, county: true, lat: true, lng: true }).extend({
  address: z.string().trim().min(3).max(200).describe('Street address, e.g. "12135 Ashland Dr". Include the city if you don\'t pass city.'),
  city: z.string().trim().min(1).max(100).optional(),
  county: z.enum(COUNTIES).optional(),
  lat: z.number().min(39).max(41).optional(),
  lng: z.number().min(-87.5).max(-85).optional(),
  loanTypes: ListingInput.shape.loanTypes.default(["Conventional", "FHA", "VA"]),
  defaultDownPct: ListingInput.shape.defaultDownPct.default(5).describe("One of 3, 3.5, 5, 10, 20."),
  photoUrls: z
    .array(photoUrl)
    .min(1)
    .max(MAX_PHOTOS)
    .describe(`1 to ${MAX_PHOTOS} public https image links; the first is the cover. Only photos the listing agent or seller allows.`),
});
export type CreateArgs = z.infer<typeof CreateArgs>;

export const UpdateArgs = CreateArgs.omit({ photoUrls: true })
  .partial()
  .extend({
    id: z.string(),
    photoUrls: z.array(photoUrl).min(1).max(MAX_PHOTOS).optional().describe("Replaces all photos."),
    addPhotoUrls: z.array(photoUrl).max(MAX_PHOTOS).optional().describe("Adds photos after the current ones."),
  });

/** The admin account hidden listings are built under: an admin (super admin first) who has an agent profile. */
async function ownerId(): Promise<string> {
  const sb = db();
  const { data: admins, error } = await sb.from("admins").select("email, role");
  if (error) throw new ToolError(error.message);
  const emails = (admins ?? []).sort((a, b) => Number(b.role === "super_admin") - Number(a.role === "super_admin")).map((a) => a.email.toLowerCase());
  for (const email of emails) {
    const { data } = await sb.from("agents").select("id").ilike("email", email).maybeSingle();
    if (data) return data.id;
  }
  throw new ToolError("No admin has an agent profile yet. Sign in to the site as the admin and save a profile first.");
}

/** Where the home is: the given location when lat/lng, city and county are all passed; otherwise the site's geocoder. */
async function locate(a: { address: string; city?: string; county?: (typeof COUNTIES)[number]; zip?: string | null; lat?: number; lng?: number }) {
  if (a.lat != null && a.lng != null && a.city && a.county) return { address: a.address, city: a.city, county: a.county, zip: a.zip ?? null, lat: a.lat, lng: a.lng };
  const q = [a.address, a.city, a.zip].filter(Boolean).join(", ");
  const hit = (await lookupAddress(q).catch(() => []))[0];
  if (!hit) throw new ToolError(`Couldn't find "${q}" in ${COUNTIES.join(", ")} counties. Check the street address and city.`);
  return { address: hit.address, city: hit.city, county: hit.county as (typeof COUNTIES)[number], zip: a.zip ?? hit.zip ?? null, lat: hit.lat, lng: hit.lng };
}

/** Download an image, fix rotation, shrink it to 1600px wide JPEG and store it like the wizard does ({ownerId}/{uuid}). */
async function importPhoto(url: string, folder: string): Promise<Photo> {
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

/** Import every photo; if one fails, remove the ones already stored. */
async function importPhotos(urls: string[], folder: string): Promise<Photo[]> {
  const done: Photo[] = [];
  try {
    for (const u of urls) done.push(await importPhoto(u, folder));
    return done;
  } catch (e) {
    await removePhotos(done);
    throw e;
  }
}

async function removePhotos(photos: Photo[]) {
  const paths = photos.map((p) => p.path).filter((p): p is string => !!p);
  if (paths.length) await db().storage.from(PHOTO_BUCKET).remove(paths);
}

/** Full listing validation (same rules as the wizard), with a readable error. */
function validate(input: unknown): ListingInput {
  const r = ListingInput.safeParse(input);
  if (!r.success) throw new ToolError(`Check the listing details: ${r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  return r.data;
}

/** Hidden-listing row for insert/update. photo_rights_confirmed stays false: the listing agent confirms photo rights
 *  when they take it live (ClaimPanel → claim_listing sets it true). */
const draftRow = (d: ListingInput) => ({ ...toRow(d), photo_rights_confirmed: false });

const links = (id: string) => ({
  // Viewable by the signed-in admin (hidden listings aren't public).
  previewUrl: `${siteUrl()}/listing/${id}`,
  editUrl: `${siteUrl()}/agent/edit/${id}`,
});

export const LISTING_TOOLS = [
  tool(
    "create_hidden_listing",
    "Create a hidden (draft) listing under the admin's account: not on the map and not public, ready to send to the listing " +
      "agent (send_listing_to_agent when the user asks, or My listings on the site). Never goes live and sends no email. The address must be in Boone, Hamilton, Hancock, Hendricks, " +
      "Johnson or Marion county; it's geocoded unless lat, lng, city and county are all given. Photos (1-7 public https links) are copied " +
      "into the site's storage. Returns { id, status: \"draft\", previewUrl } (preview needs the admin signed in) plus an editUrl.",
    CreateArgs,
    WRITE,
    async ({ photoUrls, ...a }) => {
      const place = await locate(a);
      const fields = { ...a, ...place, photoRightsConfirmed: true as const };
      // Check everything except photos before downloading any.
      validate({ ...fields, photos: [{ url: "https://check.invalid/photo.jpg" }] });
      const owner = await ownerId();
      const photos = await importPhotos(photoUrls, owner);
      const d = validate({ ...fields, photos });
      const { data, error } = await db()
        .from("listings")
        .insert({ ...draftRow(d), agent_id: owner, status: "draft", expires_at: expiry() })
        .select("id")
        .single();
      if (error) {
        await removePhotos(photos);
        throw new ToolError(/status_check|listings_status/.test(error.message) ? "Run migration 0012 in Supabase first." : error.message);
      }
      return { id: data.id, status: "draft", ...links(data.id), address: `${d.address}, ${d.city}, IN${d.zip ? " " + d.zip : ""}`, county: d.county, photos: photos.length };
    },
  ),

  tool(
    "update_listing",
    "Edit a hidden (draft) listing. Only the fields you pass change; changing the address re-geocodes it. photoUrls replaces all photos; " +
      "addPhotoUrls adds to them. Never puts the listing live. Returns { id, status, previewUrl, editUrl }.",
    UpdateArgs,
    WRITE,
    async ({ id, photoUrls, addPhotoUrls, ...patch }) => {
      const sb = db();
      const { data: cur, error: readErr } = await sb.from("listings").select("*").eq("id", id).maybeSingle();
      if (readErr) throw new ToolError(readErr.message);
      if (!cur) throw new ToolError("Listing not found.");
      if (cur.status !== "draft") throw new ToolError("Only hidden (draft) listings can be edited here.");
      const l = fromRow({ ...(cur as ListingRow), agent: null });
      const moved = patch.address !== undefined || patch.city !== undefined || patch.county !== undefined || patch.lat !== undefined || patch.lng !== undefined;
      const place = moved
        ? await locate({ address: patch.address ?? l.address, city: patch.city ?? l.city, county: patch.county, zip: patch.zip ?? l.zip, lat: patch.lat, lng: patch.lng })
        : { address: l.address, city: l.city, county: l.county, zip: patch.zip !== undefined ? patch.zip : l.zip, lat: l.lat, lng: l.lng };
      const base = {
        price: l.price,
        beds: l.beds,
        baths: l.baths,
        sqft: l.sqft,
        concession: l.concession,
        loanTypes: l.loanTypes,
        defaultDownPct: l.defaultDownPct,
        taxesYr: l.taxesYr,
        insuranceYr: l.insuranceYr,
        hoaMo: l.hoaMo,
        externalUrl: l.externalUrl,
      };
      const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
      const fields = { ...base, ...defined, ...place, photoRightsConfirmed: true as const };
      validate({ ...fields, photos: l.photos.length ? l.photos : [{ url: "https://check.invalid/photo.jpg" }] });

      let photos = l.photos;
      let added: Photo[] = [];
      if (photoUrls || addPhotoUrls) {
        const count = (photoUrls ? 0 : l.photos.length) + (photoUrls ?? addPhotoUrls ?? []).length;
        if (count > MAX_PHOTOS) throw new ToolError(`A listing holds ${MAX_PHOTOS} photos at most.`);
        added = await importPhotos(photoUrls ?? addPhotoUrls ?? [], cur.agent_id ?? (await ownerId()));
        photos = photoUrls ? added : [...l.photos, ...added];
      }
      const d = validate({ ...fields, photos });
      const { error } = await sb.from("listings").update(draftRow(d)).eq("id", id).eq("status", "draft");
      if (error) {
        await removePhotos(added);
        throw new ToolError(error.message);
      }
      if (photoUrls) await removePhotos(l.photos.filter((p) => !photos.includes(p)));
      return { id, status: "draft", ...links(id), photos: photos.length };
    },
  ),
];

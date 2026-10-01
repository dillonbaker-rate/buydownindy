import { z } from "zod";
import { COUNTIES, MAX_PHOTOS } from "./types";

const money = z.number().int().nonnegative().max(100_000_000);

/** What an agent submits from the posting wizard (create and edit). */
export const ListingInput = z.object({
  address: z.string().trim().min(3).max(200),
  city: z.string().trim().min(1).max(100),
  county: z.enum(COUNTIES),
  zip: z.string().max(10).nullish(),
  lat: z.number().min(39).max(41),
  lng: z.number().min(-87.5).max(-85),
  price: money.min(1),
  beds: z.number().positive().max(50),
  baths: z.number().positive().max(50),
  sqft: z.number().int().positive().max(100_000),
  concession: money.min(1).max(1_000_000),
  loanTypes: z.array(z.enum(["Conventional", "FHA", "VA"])).min(1),
  defaultDownPct: z.number().refine((v) => [3, 3.5, 5, 10, 20].includes(v)),
  taxesYr: money.nullish(),
  insuranceYr: money.nullish(),
  hoaMo: money.nullish(),
  photos: z
    .array(z.object({ url: z.string().url(), path: z.string().max(300).optional() }))
    .min(1)
    .max(MAX_PHOTOS),
  photoRightsConfirmed: z.literal(true),
  externalUrl: z
    .string()
    .trim()
    .url()
    .refine((u) => /^https:\/\/(www\.)?(zillow|redfin)\.com\//i.test(u), "Use a Zillow or Redfin link")
    .nullish()
    .or(z.literal("")),
});
export type ListingInput = z.infer<typeof ListingInput>;

export const toRow = (d: ListingInput) => ({
  address: d.address,
  city: d.city,
  county: d.county,
  zip: d.zip ?? null,
  lat: d.lat,
  lng: d.lng,
  price: d.price,
  beds: d.beds,
  baths: d.baths,
  sqft: d.sqft,
  concession: d.concession,
  loan_types: d.loanTypes,
  default_down_pct: d.defaultDownPct,
  taxes_yr: d.taxesYr ?? null,
  insurance_yr: d.insuranceYr ?? null,
  hoa_mo: d.hoaMo ?? null,
  photos: d.photos,
  photo_rights_confirmed: d.photoRightsConfirmed,
  external_url: d.externalUrl || null,
});

export const StatusAction = z.object({ action: z.enum(["renew", "pending", "sold", "live"]) });

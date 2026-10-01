import type { LoanType } from "./buydown";
import type { Listing, RateSnapshot } from "./types";

/** Fallback rate when no RateSnapshot is available (the brief's sample). */
export const FALLBACK_RATE: RateSnapshot = { weekOf: "2026-09-24", rate30yr: 6.25, source: "Freddie Mac PMMS" };

const C3: LoanType[] = ["Conventional", "FHA", "VA"];
const C2: LoanType[] = ["Conventional", "FHA"];
const C1: LoanType[] = ["Conventional"];

// Sample listings never expire in demo mode.
const FAR = "2099-01-01T00:00:00.000Z";

const mk = (
  id: number,
  address: string,
  city: string,
  county: string,
  lat: number,
  lng: number,
  price: number,
  beds: number,
  baths: number,
  sqft: number,
  concession: number,
  loanTypes: LoanType[],
  defaultDownPct: number,
): Listing => ({
  id: `sample-${id}`,
  address,
  city,
  county,
  lat,
  lng,
  price,
  beds,
  baths,
  sqft,
  concession,
  loanTypes,
  defaultDownPct,
  photos: [],
  agentName: "Jordan Sample",
  brokerage: "Sample Realty",
  status: "live",
  expiresAt: FAR,
  photoRightsConfirmed: true,
  isSample: true,
});

export const SAMPLE_LISTINGS: Listing[] = [
  {
    ...mk(1, "12135 Ashland Dr", "Fishers", "Hamilton", 39.9612, -85.9655, 599900, 4, 3, 4343, 15000, C3, 5),
    zip: "46037",
    hoaMo: 72,
    builtYear: 2006,
    isExample: true,
    externalUrl: "https://www.zillow.com/homedetails/12135-Ashland-Dr-Fishers-IN-46037/94403003_zpid/",
  },
  mk(2, "4410 Sample Ave", "Fishers", "Hamilton", 39.905, -86.055, 299900, 3, 2.5, 1720, 15000, C2, 5),
  mk(3, "88 Sample Ct", "Noblesville", "Hamilton", 40.0456, -86.0086, 415000, 4, 3, 2600, 12000, C3, 5),
  mk(4, "2150 Sample Dr", "Westfield", "Hamilton", 40.0428, -86.1275, 489000, 4, 3.5, 3100, 20000, C1, 10),
  mk(5, "710 Sample Ln", "Indianapolis", "Marion", 39.775, -86.05, 265000, 3, 1.5, 1400, 8000, C3, 5),
  mk(6, "1932 Sample Pkwy", "Indianapolis", "Marion", 39.87, -86.142, 379000, 3, 2, 1900, 10000, C2, 5),
  mk(7, "505 Sample Way", "Indianapolis", "Marion", 39.722, -86.15, 315000, 2, 2, 1300, 6000, C3, 5),
  mk(8, "64 Sample Rd", "Avon", "Hendricks", 39.7628, -86.3997, 329900, 4, 2.5, 2300, 10000, C3, 5),
  mk(9, "3300 Sample Blvd", "Plainfield", "Hendricks", 39.7042, -86.3994, 285000, 3, 2, 1650, 7500, C3, 5),
  mk(10, "17 Sample Cir", "Greenwood", "Johnson", 39.6137, -86.1067, 310000, 3, 2, 1800, 9000, C3, 5),
  mk(11, "902 Sample Trl", "Zionsville", "Boone", 39.9509, -86.2619, 560000, 4, 3.5, 3400, 25000, C1, 20),
  mk(12, "41 Sample Pl", "Greenfield", "Hancock", 39.7851, -85.7694, 274500, 3, 2, 1600, 5000, C3, 5),
];

export const PHOTO_LABELS = [
  "Front exterior",
  "Living room",
  "Kitchen",
  "Primary bedroom",
  "Primary bath",
  "Backyard",
  "Street view",
];

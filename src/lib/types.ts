import type { LoanType } from "./buydown";

export type ListingStatus = "live" | "pending" | "sold";

export interface Photo {
  url: string;
  /** Storage path, for deleting/reordering uploads. Absent for sample photos. */
  path?: string;
}

export interface Listing {
  id: string;
  address: string;
  city: string;
  county: string;
  zip?: string | null;
  lat: number;
  lng: number;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  concession: number;
  loanTypes: LoanType[];
  defaultDownPct: number;
  taxesYr?: number | null;
  insuranceYr?: number | null;
  hoaMo?: number | null;
  builtYear?: number | null;
  photos: Photo[];
  externalUrl?: string | null;
  agentId?: string | null;
  agentName: string;
  brokerage: string;
  agentEmail?: string | null;
  agentPhone?: string | null;
  status: ListingStatus;
  expiresAt: string;
  photoRightsConfirmed: boolean;
  /** Demo data, labeled "Sample" in the UI. */
  isSample: boolean;
  /** Real home with an example concession amount (the featured listing). */
  isExample?: boolean;
}

export interface Agent {
  id: string;
  name: string;
  brokerage: string;
  email: string;
  phone: string;
}

export const COUNTIES = ["Boone", "Hamilton", "Hancock", "Hendricks", "Johnson", "Marion"] as const;
export const LISTING_DAYS = 30;
export const MAX_PHOTOS = 7;

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
  agentPhotoUrl?: string | null;
  agentVerified?: boolean;
  status: ListingStatus;
  expiresAt: string;
  photoRightsConfirmed: boolean;
  /** Demo data, labeled "Sample" in the UI. */
  isSample: boolean;
  /** Real home with an example concession amount (the featured listing). */
  isExample?: boolean;
}

export type VerificationStatus = "pending" | "verified" | "rejected";

export interface Agent {
  id: string;
  name: string;
  brokerage: string;
  email: string;
  /** Mobile phone. */
  phone: string;
  photoUrl?: string | null;
  teamName?: string | null;
  officePhone?: string | null;
  officeAddress?: string | null;
  /** Indiana real estate license number, verified by an admin against the state lookup. */
  licenseNumber?: string | null;
  /** MLS member ID (MIBOR BLC). Not publicly verifiable. */
  mlsId?: string | null;
  licensedSince?: number | null;
  counties?: string[];
  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  linkedin?: string | null;
  bio?: string | null;
  verificationStatus?: VerificationStatus;
  verifiedAt?: string | null;
  createdAt?: string;
}

/** Map an `agents` table row to Agent. */
export function agentFromRow(r: Record<string, unknown>): Agent {
  const s = (k: string) => (r[k] as string | null | undefined) ?? null;
  return {
    id: r.id as string,
    name: (r.name as string) ?? "",
    brokerage: (r.brokerage as string) ?? "",
    email: (r.email as string) ?? "",
    phone: (r.phone as string) ?? "",
    photoUrl: s("photo_url"),
    teamName: s("team_name"),
    officePhone: s("office_phone"),
    officeAddress: s("office_address"),
    licenseNumber: s("license_number"),
    mlsId: s("mls_id"),
    licensedSince: (r.licensed_since as number | null) ?? null,
    counties: (r.counties as string[] | null) ?? [],
    website: s("website"),
    instagram: s("instagram"),
    facebook: s("facebook"),
    linkedin: s("linkedin"),
    bio: s("bio"),
    verificationStatus: ((r.verification_status as VerificationStatus) ?? "pending"),
    verifiedAt: s("verified_at"),
    createdAt: s("created_at") ?? undefined,
  };
}

export const COUNTIES = ["Boone", "Hamilton", "Hancock", "Hendricks", "Johnson", "Marion"] as const;
export const LISTING_DAYS = 30;
export const MAX_PHOTOS = 7;

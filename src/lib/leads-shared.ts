// Lead types shared by server and client.

export const LEAD_STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "closed", label: "Closed" },
  { value: "not_a_fit", label: "Not a fit" },
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number]["value"];

export interface Lead {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  phone: string;
  message: string | null;
  topic: "general" | "points";
  listingId: string | null;
  listingLabel: string | null;
  answers: { id?: string; question: string; answer: string }[];
  consentAt: string;
  consentText: string;
  status: LeadStatus;
  notes: string | null;
}

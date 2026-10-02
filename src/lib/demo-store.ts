import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { ListingInput } from "./listing-schema";
import { LISTING_DAYS, type Agent, type Listing } from "./types";

// Local demo storage for agent features when Supabase isn't connected (dev only).
const DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "listings.json");
export const UPLOADS = path.join(DIR, "uploads");

export const DEMO_AGENT: Agent = {
  id: "demo-agent",
  name: "Demo Agent",
  brokerage: "Demo Realty",
  email: "demo.agent@example.com",
  phone: "317-555-0100",
};

const AGENT_FILE = path.join(DIR, "agent.json");

/** The demo agent, with any profile edits saved locally. */
export async function demoAgent(): Promise<Agent> {
  try {
    return { ...DEMO_AGENT, ...JSON.parse(await fs.readFile(AGENT_FILE, "utf8")), id: DEMO_AGENT.id, termsTracked: true };
  } catch {
    return { ...DEMO_AGENT, verificationStatus: "pending", termsTracked: true };
  }
}
export async function saveDemoAgent(patch: Partial<Agent>) {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(AGENT_FILE, JSON.stringify({ ...(await demoAgent()), ...patch }, null, 2));
}

async function readAll(): Promise<Listing[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return [];
  }
}
async function writeAll(all: Listing[]) {
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(all, null, 2));
}

const expiry = () => new Date(Date.now() + LISTING_DAYS * 86_400_000).toISOString();

const fromInput = (d: ListingInput) => ({
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
  loanTypes: d.loanTypes,
  defaultDownPct: d.defaultDownPct,
  taxesYr: d.taxesYr ?? null,
  insuranceYr: d.insuranceYr ?? null,
  hoaMo: d.hoaMo ?? null,
  photos: d.photos,
  photoRightsConfirmed: d.photoRightsConfirmed,
  externalUrl: d.externalUrl || null,
});

export const demoListings = readAll;

export async function demoCreate(d: ListingInput): Promise<string> {
  const all = await readAll();
  const id = `demo-${crypto.randomUUID().slice(0, 8)}`;
  all.unshift({
    id,
    ...fromInput(d),
    agentId: DEMO_AGENT.id,
    agentName: DEMO_AGENT.name,
    brokerage: DEMO_AGENT.brokerage,
    agentEmail: DEMO_AGENT.email,
    agentPhone: DEMO_AGENT.phone,
    status: "live",
    expiresAt: expiry(),
    isSample: false,
  });
  await writeAll(all);
  return id;
}

export async function demoDelete(id: string) {
  const all = await readAll();
  const rest = all.filter((x) => x.id !== id);
  if (rest.length === all.length) return false;
  await writeAll(rest);
  return true;
}

export async function demoUpdate(id: string, patch: { input?: ListingInput; action?: "renew" | "pending" | "sold" | "live" }) {
  const all = await readAll();
  const l = all.find((x) => x.id === id);
  if (!l) return false;
  if (patch.input) Object.assign(l, fromInput(patch.input));
  if (patch.action === "renew") l.expiresAt = expiry();
  else if (patch.action) {
    l.status = patch.action;
    if (patch.action === "live" && new Date(l.expiresAt) < new Date()) l.expiresAt = expiry();
  }
  await writeAll(all);
  return true;
}

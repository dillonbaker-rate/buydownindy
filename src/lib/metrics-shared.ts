// Counting for the admin Metrics page (pure functions, shared by the server loader and tests).

const DAY = 86_400_000;
export const WINDOWS = [7, 30] as const;

export interface Windowed {
  total: number;
  last7: number;
  last30: number;
}

export function windowed(dates: (string | undefined | null)[], now = Date.now()): Windowed {
  // Everything counts toward the total; only dated items can fall in a recent window.
  const ts = dates.filter((d): d is string => !!d).map((d) => new Date(d).getTime());
  return { total: dates.length, last7: ts.filter((t) => now - t <= 7 * DAY).length, last30: ts.filter((t) => now - t <= 30 * DAY).length };
}

export interface AgentMetrics extends Windowed {
  verified: number;
  pending: number;
  rejected: number;
}

export function agentMetrics(agents: { createdAt?: string; verificationStatus?: string }[], now = Date.now()): AgentMetrics {
  const by = (s: string) => agents.filter((a) => (a.verificationStatus ?? "pending") === s).length;
  return { ...windowed(agents.map((a) => a.createdAt), now), verified: by("verified"), pending: by("pending"), rejected: by("rejected") };
}

export interface ListingRowLite {
  status: string;
  expires_at: string;
  created_at: string;
  is_sample?: boolean | null;
}

export interface ListingMetrics extends Windowed {
  live: number;
  pending: number;
  sold: number;
  expired: number;
}

/** Real listings only (sample rows excluded). "Live" = status live and not past its expiry. */
export function listingMetrics(rows: ListingRowLite[], now = Date.now()): ListingMetrics {
  const real = rows.filter((r) => !r.is_sample);
  const active = (r: ListingRowLite) => new Date(r.expires_at).getTime() > now;
  return {
    ...windowed(real.map((r) => r.created_at), now),
    live: real.filter((r) => r.status === "live" && active(r)).length,
    pending: real.filter((r) => r.status === "pending").length,
    sold: real.filter((r) => r.status === "sold").length,
    expired: real.filter((r) => r.status === "live" && !active(r)).length,
  };
}

export interface LeadMetrics extends Windowed {
  byStatus: Record<string, number>;
  points: number;
}

export function leadMetrics(leads: { createdAt: string; status: string; topic: string }[], now = Date.now()): LeadMetrics {
  const byStatus: Record<string, number> = {};
  for (const l of leads) byStatus[l.status] = (byStatus[l.status] ?? 0) + 1;
  return { ...windowed(leads.map((l) => l.createdAt), now), byStatus, points: leads.filter((l) => l.topic === "points").length };
}

import { describe, expect, it } from "vitest";
import { agentMetrics, leadMetrics, listingMetrics, windowed } from "./metrics-shared";

const now = new Date("2026-10-23T12:00:00Z").getTime();
const daysAgo = (n: number) => new Date(now - n * 86_400_000).toISOString();

describe("metrics", () => {
  it("counts the last 7 and 30 days", () => {
    expect(windowed([daysAgo(1), daysAgo(6), daysAgo(20), daysAgo(90), null], now)).toEqual({ total: 5, last7: 2, last30: 3 });
  });

  it("counts agents by verification status (missing = pending)", () => {
    const m = agentMetrics(
      [
        { createdAt: daysAgo(2), verificationStatus: "verified" },
        { createdAt: daysAgo(3) },
        { createdAt: daysAgo(40), verificationStatus: "rejected" },
      ],
      now,
    );
    expect(m).toMatchObject({ total: 3, last7: 2, verified: 1, pending: 1, rejected: 1 });
  });

  it("splits live from expired listings and skips samples", () => {
    const m = listingMetrics(
      [
        { status: "live", expires_at: daysAgo(-5), created_at: daysAgo(25) },
        { status: "live", expires_at: daysAgo(2), created_at: daysAgo(32) },
        { status: "sold", expires_at: daysAgo(1), created_at: daysAgo(10) },
        { status: "pending", expires_at: daysAgo(-9), created_at: daysAgo(3) },
        { status: "live", expires_at: daysAgo(-5), created_at: daysAgo(1), is_sample: true },
      ],
      now,
    );
    expect(m).toEqual({ total: 4, last7: 1, last30: 3, live: 1, pending: 1, sold: 1, expired: 1 });
  });

  it("groups leads by status and counts points questions", () => {
    const m = leadMetrics(
      [
        { createdAt: daysAgo(1), status: "new", topic: "points" },
        { createdAt: daysAgo(8), status: "new", topic: "general" },
        { createdAt: daysAgo(60), status: "closed", topic: "general" },
      ],
      now,
    );
    expect(m).toEqual({ total: 3, last7: 1, last30: 2, byStatus: { new: 2, closed: 1 }, points: 1 });
  });
});

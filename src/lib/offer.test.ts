import { describe, expect, it } from "vitest";
import { calc } from "./buydown";
import { offerMath, type OfferInput } from "./offer";

const base: OfferInput = { price: 400_000, type: "Conventional", down: 5, creditTier: 0, baseRate: 6.5, buydown: 2, closing: "none" };

describe("offerMath", () => {
  it("prices a 2-1 buydown the same as the listing engine", () => {
    const r = offerMath(base);
    const t2 = calc(400_000, 0, "Conventional", 5, 0, 6.5).opts.find((o) => o.key === "t2")!;
    expect(r.k).toBe(2);
    expect(r.buydownCost).toBeCloseTo(t2.cost!, 6);
    expect(r.total).toBeCloseTo(t2.cost!, 6);
  });

  it("adds all closing costs (4% of the loan)", () => {
    const r = offerMath({ ...base, buydown: 0, closing: "all" });
    expect(r.closingCredit).toBeCloseTo(400_000 * 0.95 * 0.04, 6);
    expect(r.cash.total).toBeCloseTo(r.cash.down, 6);
  });

  it("caps a custom closing credit at the estimated closing costs", () => {
    const r = offerMath({ ...base, buydown: 0, closing: "custom", customClosing: 1e9 });
    expect(r.closingCredit).toBeCloseTo(r.closingCosts, 6);
  });

  it("flags concessions over the conventional limit (3% under 10% down)", () => {
    const r = offerMath({ ...base, buydown: 3, closing: "all" });
    expect(r.limit).toBe(12_000);
    expect(r.over).toBeCloseTo(r.total - 12_000, 6);
  });

  it("doesn't count VA closing costs toward the 4% cap", () => {
    const r = offerMath({ ...base, type: "VA", down: 0, buydown: 1, closing: "all" });
    expect(r.over).toBe(0);
  });

  it("picks the smallest buydown that hits a payment goal", () => {
    const c = calc(400_000, 0, "Conventional", 5, 0, 6.5);
    const t1 = c.opts.find((o) => o.key === "t1")!.y1;
    const t2 = c.opts.find((o) => o.key === "t2")!.y1;
    expect(offerMath({ ...base, buydown: "payment", targetPayment: Math.ceil(t1) }).k).toBe(1);
    expect(offerMath({ ...base, buydown: "payment", targetPayment: Math.ceil(t2) }).k).toBe(2);
    expect(offerMath({ ...base, buydown: "payment", targetPayment: c.base + 10 }).k).toBe(0);
    const miss = offerMath({ ...base, buydown: "payment", targetPayment: 100 });
    expect(miss.k).toBe(3);
    expect(miss.goalMissed).toBe(true);
  });

});

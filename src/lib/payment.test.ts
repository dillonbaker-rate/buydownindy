import { describe, expect, it } from "vitest";
import { pmt } from "./buydown";
import { paymentBreakdown, pmtN } from "./payment";

const base = { price: 450_000, downPct: 20, rate: 6.5, years: 30, taxesYr: 4_500, insuranceYr: 1_800, hoaMo: 50 };

describe("paymentBreakdown", () => {
  it("matches the 360-payment formula for 30 years", () => {
    expect(pmtN(360_000, 6.5, 360)).toBeCloseTo(pmt(360_000, 6.5), 8);
  });
  it("adds up principal & interest, taxes, insurance and HOA", () => {
    const r = paymentBreakdown(base);
    expect(r.loan).toBe(360_000);
    expect(r.parts.mi).toBe(0);
    expect(r.total).toBeCloseTo(r.parts.pi + 375 + 150 + 50, 6);
    expect(r.totalInterest).toBeCloseTo(r.parts.pi * 360 - 360_000, 6);
  });
  it("estimates taxes and insurance when left blank", () => {
    const r = paymentBreakdown({ ...base, taxesYr: null, insuranceYr: null });
    expect(r.taxesEstimated && r.insuranceEstimated).toBe(true);
    expect(r.parts.taxes).toBeGreaterThan(0);
  });
  it("adds mortgage insurance under 20% down", () => {
    expect(paymentBreakdown({ ...base, downPct: 5 }).parts.mi).toBeGreaterThan(0);
  });
  it("shorter terms cost more per month and less interest", () => {
    const t15 = paymentBreakdown({ ...base, years: 15 });
    const t30 = paymentBreakdown(base);
    expect(t15.parts.pi).toBeGreaterThan(t30.parts.pi);
    expect(t15.totalInterest).toBeLessThan(t30.totalInterest);
  });
  it("APR is above the rate", () => {
    expect(paymentBreakdown(base).apr).toBeGreaterThan(6.5);
  });
});

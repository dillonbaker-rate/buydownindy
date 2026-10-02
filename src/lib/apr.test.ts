import { describe, expect, it } from "vitest";
import { aprFromPayment, estimateApr } from "./apr";
import { pmt } from "./buydown";

describe("APR", () => {
  it("equals the note rate when there are no finance charges", () => {
    expect(aprFromPayment(300_000, pmt(300_000, 6.5))).toBeCloseTo(6.5, 6);
  });
  it("is higher than the note rate with prepaid finance charges", () => {
    // 1% of fees on a 6.5% loan adds roughly 0.1 to the APR.
    const apr = aprFromPayment(297_000, pmt(300_000, 6.5));
    expect(apr).toBeGreaterThan(6.58);
    expect(apr).toBeLessThan(6.62);
  });
  it("counts conventional MI under 20% down but not at 20% down", () => {
    const withMi = estimateApr("Conventional", 5, 6.5);
    const noMi = estimateApr("Conventional", 20, 6.5);
    expect(noMi).toBeGreaterThan(6.5);
    expect(withMi).toBeGreaterThan(noMi);
  });
  it("counts FHA upfront MIP and annual MIP", () => {
    expect(estimateApr("FHA", 3.5, 6.5)).toBeGreaterThan(estimateApr("Conventional", 20, 6.5) + 0.5);
  });
});

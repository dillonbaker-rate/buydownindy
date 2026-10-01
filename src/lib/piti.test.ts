import { describe, expect, it } from "vitest";
import { calc } from "./buydown";
import { extrasByOption, monthlyExtras } from "./piti";

const r2 = (n: number) => Math.round(n * 100) / 100;

describe("full payment extras", () => {
  // $350,000 Conventional 5% down: loan $332,500, LTV 95% → MI 0.46%/yr (Rate calculator table).
  const c = calc(350000, 10000, "Conventional", 5, 0, 6.25);

  it("estimates taxes, insurance and PMI when the agent gave none", () => {
    const e = monthlyExtras({ price: 350000 }, c);
    expect(r2(e.taxes)).toBe(291.67); // $3,500/yr
    expect(r2(e.insurance)).toBe(145.83); // $1,750/yr
    expect(r2(e.mi)).toBe(127.46); // 0.46% of $332,500 / 12
    expect(e.hoa).toBe(0);
    expect(e.taxesEstimated && e.insuranceEstimated).toBe(true);
  });

  it("uses the agent's taxes, insurance and HOA when given", () => {
    const e = monthlyExtras({ price: 350000, taxesYr: 4800, insuranceYr: 1200, hoaMo: 72 }, c);
    expect(e.taxes).toBe(400);
    expect(e.insurance).toBe(100);
    expect(e.hoa).toBe(72);
    expect(e.taxesEstimated).toBe(false);
  });

  it("a price cut lowers estimated taxes, insurance and PMI", () => {
    const x = extrasByOption({ price: 350000 }, c);
    expect(r2(x.cut.taxes)).toBe(283.33); // 1% of $340,000
    expect(r2(x.cut.mi)).toBe(123.82); // 0.46% of $323,000
    expect(x.forKey("t2")).toBe(x.base.total);
    expect(x.forKey("cut")).toBeLessThan(x.base.total);
  });

  it("no PMI at 20% down; VA has none", () => {
    expect(monthlyExtras({ price: 350000 }, calc(350000, 10000, "Conventional", 20, 0, 6.25)).mi).toBe(0);
    expect(monthlyExtras({ price: 350000 }, calc(350000, 10000, "VA", 0, 0, 6.25)).mi).toBe(0);
  });
});

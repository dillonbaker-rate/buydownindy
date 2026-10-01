import { describe, expect, it } from "vitest";
import { calc, pmt, saving, usd } from "./buydown";

const RATE = 6.25;
const r = (n: number) => Math.round(n);
const opt = (c: ReturnType<typeof calc>, key: string) => c.opts.find((o) => o.key === key)!;

describe("pmt", () => {
  it("handles a zero rate", () => {
    expect(pmt(360000, 0)).toBe(1000);
  });
});

describe("brief fixture: $350,000 / $10,000 / Conventional 5% / 6.25%", () => {
  const c = calc(350000, 10000, "Conventional", 5, 0, RATE);

  it("baseline", () => {
    expect(c.loan).toBe(332500);
    expect(r(c.base)).toBe(2047);
    expect(c.lp).toBe(3);
    expect(c.limit).toBe(10500);
  });

  it("$10k price cut", () => {
    const o = opt(c, "cut");
    expect(r(o.y1)).toBe(1989);
    expect(saving(c.base, o.y1)).toBe(58);
    expect(o.state).toBe("avail");
    expect(o.note).toBe("Saves $58/mo");
  });

  it("1-0 buydown", () => {
    const o = opt(c, "t1");
    expect(r(o.cost!)).toBe(2534);
    expect(o.rows.map((x) => r(x.v))).toEqual([1836, 2047]);
    expect(o.state).toBe("unlocked");
    expect(o.note).toBe("$7,466 left for closing costs");
  });

  it("2-1 buydown", () => {
    const o = opt(c, "t2");
    expect(r(o.cost!)).toBe(7473);
    expect(o.rows.map((x) => r(x.v))).toEqual([1636, 1836, 2047]);
    expect(o.state).toBe("unlocked");
    expect(o.note).toBe("$2,527 left for closing costs");
  });

  it("3-2-1 buydown is locked", () => {
    const o = opt(c, "t3");
    expect(r(o.cost!)).toBe(14675);
    expect(o.rows.map((x) => r(x.v))).toEqual([1447, 1636, 1836, 2047]);
    expect(o.state).toBe("locked");
    expect(o.note).toBe("Needs $4,675 more");
  });

  it("permanent buydown is not priced (lender pricing changes daily)", () => {
    const o = opt(c, "perm");
    expect(o.state).toBe("ask");
    expect(o.rows).toEqual([]);
    expect(o.buyerClosing).toBeNull();
  });

  it("closing cost credit", () => {
    const o = opt(c, "cc");
    expect(r(o.y1)).toBe(2047);
    expect(o.state).toBe("unlocked");
    expect(o.note).toBe("$10,000 less cash to close");
  });

  it("best is the 2-1", () => {
    expect(c.best?.key).toBe("t2");
  });
});

describe("over-limit fixture: $299,900 / $15,000 / 5% down", () => {
  it("Conventional caps at 3% = $8,997", () => {
    const c = calc(299900, 15000, "Conventional", 5, 0, RATE);
    expect(usd(c.limit)).toBe("$8,997");
    expect(opt(c, "t3").state).toBe("over");
    expect(opt(c, "t3").note).toBe("Over limit: Conventional 3% limit is $8,997");
    expect(opt(c, "cc").state).toBe("over");
  });

  it("FHA's 6% limit ($17,994) unlocks them", () => {
    const c = calc(299900, 15000, "FHA", 5, 0, RATE);
    expect(usd(c.limit)).toBe("$17,994");
    expect(opt(c, "t3").state).toBe("unlocked");
    expect(opt(c, "cc").state).toBe("unlocked");
  });
});

describe("credit adjustment", () => {
  it("raises the rate", () => {
    const c = calc(350000, 10000, "Conventional", 5, 0.875, RATE);
    expect(c.rate).toBe(7.125);
    expect(c.base).toBeGreaterThan(2047);
  });
});

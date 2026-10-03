// Cross-check: our engine vs. Rate's official Buydown & IPC Calculator (except conventional MI,
// which we price by credit score instead of Rate's single 740+ estimate).
// `ref` below is transcribed from that calculator's calc() (price = appraised value, 30-yr fixed,
// first-use VA, upfront fee financed, no temp-rate points). Both must agree to the dollar.
import { describe, expect, it } from "vitest";
import { estimateClosingCosts } from "@/content/program-rules";
import { calc, type LoanType } from "./buydown";

const pmt = (L: number, r: number, n = 360) => {
  const i = r / 1200;
  return i <= 0 ? L / n : (L * i) / (1 - Math.pow(1 + i, -n));
};

function ref(program: "conv" | "fha" | "va", price: number, ltv: number, rate: number) {
  const baseLoan = (price * ltv) / 100;
  const dnPct = 100 - ltv;
  let upAuto = 0;
  let miAuto = 0;
  if (program === "conv") miAuto = ltv <= 80 ? 0 : ltv > 95 ? 0.58 : ltv > 90 ? 0.46 : ltv > 85 ? 0.36 : 0.24;
  else if (program === "fha") {
    upAuto = 1.75;
    const hi = baseLoan > 832750;
    miAuto = hi ? (ltv > 95 ? 0.75 : 0.7) : ltv > 95 ? 0.55 : 0.5;
  } else upAuto = dnPct >= 10 ? 1.25 : dnPct >= 5 ? 1.5 : 2.15;
  const loan = baseLoan * (1 + upAuto / 100);
  const pct = program === "conv" ? (ltv > 90 ? 3 : ltv > 75 ? 6 : 9) : program === "fha" ? 6 : 4;
  const cap = (price * pct) / 100;
  const base = pmt(loan, rate);
  const temps = [[1], [2, 1], [3, 2, 1]].map((steps) => {
    const pays = steps.map((s) => pmt(loan, Math.max(rate - s, 0.001)));
    return { pays, subsidy: pays.reduce((a, p) => a + (base - p) * 12, 0) };
  });
  return { loan, cap, base, miMo: (loan * miAuto) / 1200, upAmt: (baseLoan * upAuto) / 100, temps };
}

const TYPE: Record<string, LoanType> = { conv: "Conventional", fha: "FHA", va: "VA" };
const r = Math.round;

describe("parity with Rate's Buydown & IPC Calculator", () => {
  for (const program of ["conv", "fha", "va"] as const)
    for (const price of [265000, 400000, 599900, 950000])
      for (const down of program === "conv" ? [3, 5, 10, 20, 25] : program === "fha" ? [3.5, 5, 10] : [0, 5, 10])
        for (const rate of [6.25, 7.03])
          it(`${program} $${price} ${down}% down @ ${rate}%`, () => {
            const R = ref(program, price, 100 - down, rate);
            const c = calc(price, 15000, TYPE[program], down, 0, rate);
            expect(r(c.loan)).toBe(r(R.loan));
            expect(r(c.limit)).toBe(r(R.cap));
            expect(r(c.base)).toBe(r(R.base));
            // Conventional MI intentionally differs: we price it by credit score (program-rules.ts).
            if (program !== "conv") expect(r(c.mi?.monthly ?? 0)).toBe(r(R.miMo));
            expect(r(c.upfront?.amount ?? 0)).toBe(r(R.upAmt));
            for (const [i, k] of (["t1", "t2", "t3"] as const).entries()) {
              const o = c.opts.find((x) => x.key === k)!;
              expect(r(o.cost!)).toBe(r(R.temps[i].subsidy));
              expect(o.pays!.map(r)).toEqual(R.temps[i].pays.map(r));
            }
          });
});

describe("Rate rules applied", () => {
  it("FHA finances the 1.75% upfront MIP", () => {
    const c = calc(299900, 15000, "FHA", 5, 0, 6.25);
    expect(r(c.baseLoan)).toBe(284905);
    expect(r(c.loan)).toBe(289891);
    expect(c.upfront?.pct).toBe(1.75);
  });

  it("VA never caps the closing cost credit", () => {
    const c = calc(299900, 15000, "VA", 0, 0, 6.25);
    expect(c.limit).toBeCloseTo(11996);
    expect(c.opts.find((o) => o.key === "cc")!.state).toBe("unlocked");
  });

  it("estimates itemized closing costs and shows what the buyer still pays", () => {
    const c = calc(350000, 10000, "Conventional", 5, 0, 6.25);
    const cc = estimateClosingCosts({ price: 350000, loan: 332500, rate: 6.25 }).total;
    expect(c.closingCosts).toBeCloseTo(cc, 6);
    const t2 = c.opts.find((o) => o.key === "t2")!;
    expect(t2.buyerClosing!).toBeCloseTo(Math.max(cc - (10000 - t2.cost!), 0), 6);
    expect(c.opts.find((o) => o.key === "cc")!.buyerClosing).toBeCloseTo(Math.max(cc - 10000, 0), 6);
    // The price cut lowers the loan, the interest, and the taxes, so closing costs drop too.
    expect(c.opts.find((o) => o.key === "cut")!.buyerClosing!).toBeLessThan(cc);
  });

  it("FHA closing costs use the loan with financed UFMIP", () => {
    const c = calc(299900, 15000, "FHA", 5, 0, 6.25);
    expect(c.closingCosts).toBeCloseTo(estimateClosingCosts({ price: 299900, loan: 289890.84, rate: 6.25 }).total, 0);
  });

  it("uses the listing's own taxes and insurance when given", () => {
    const c = calc(350000, 10000, "Conventional", 5, 0, 6.25, 0, { taxesYr: 6000, insuranceYr: 3000 });
    const d = calc(350000, 10000, "Conventional", 5, 0, 6.25, 0);
    expect(c.closingCosts).toBeGreaterThan(d.closingCosts);
  });
});

it("says when leftover seller money exceeds closing costs", () => {
  const c = calc(299900, 15000, "FHA", 5, 0, 6.25);
  const o = c.opts.find((x) => x.key === "t1")!;
  expect(o.buyerClosing).toBe(0);
  expect(o.note).toMatch(/covers all closing costs; \$[\d,]+ would go unused/);
});

describe("cash to close: down payment + closing costs; concessions never pay the down payment", () => {
  // $350,000 Conventional 5% down: down $17,500; loan $332,500; itemized closing costs (about $9,900).
  const c = calc(350000, 10000, "Conventional", 5, 0, 6.25);
  const o = (k: string) => c.opts.find((x) => x.key === k)!;
  const CC = estimateClosingCosts({ price: 350000, loan: 332500, rate: 6.25 }).total;

  it("closing cost credit: covers closing costs, never the down payment", () => {
    expect(c.downPayment).toBe(17500);
    const cash = o("cc").cash!;
    expect(cash.down).toBe(17500);
    expect(cash.closing).toBeCloseTo(CC, 6);
    expect(cash.credit).toBeCloseTo(Math.min(10000, CC), 6);
    expect(cash.total).toBeCloseTo(17500 + CC - Math.min(10000, CC), 6);
  });

  it("price cut: smaller down payment and closing costs, no credit", () => {
    const cash = o("cut").cash!;
    expect(cash.down).toBe(17000);
    expect(cash.credit).toBe(0);
    expect(cash.closing).toBeLessThan(CC);
    expect(cash.total).toBeCloseTo(17000 + cash.closing, 6);
  });

  it("2-1 buydown: leftover $2,527 goes to closing costs only", () => {
    const cash = o("t2").cash!;
    expect(cash.down).toBe(17500);
    expect(r(cash.credit)).toBe(2527);
    expect(cash.total).toBeCloseTo(17500 + CC - cash.credit, 6);
  });

  it("locked options apply no credit", () => {
    const cash = o("t3").cash!;
    expect(cash.credit).toBe(0);
    expect(cash.total).toBeCloseTo(17500 + CC, 6);
  });

  it("permanent buydown cash depends on lender pricing", () => {
    expect(o("perm").cash).toBeNull();
  });

  it("a credit bigger than closing costs never reduces the down payment", () => {
    // $15k credit is more than the closing costs: the extra is unused, the down payment stays.
    const big = calc(350000, 15000, "Conventional", 10, 0, 6.25);
    const cash = big.opts.find((x) => x.key === "cc")!.cash!;
    expect(cash.down).toBe(35000);
    expect(cash.credit).toBe(cash.closing);
    expect(cash.total).toBe(35000);
    expect(big.opts.find((x) => x.key === "cc")!.note).toContain("can't pay the down payment");
  });

  it("over-limit credit only counts up to the program limit", () => {
    const over = calc(299900, 15000, "Conventional", 5, 0, 6.25); // limit $8,997
    const cash = over.opts.find((x) => x.key === "cc")!.cash!;
    expect(r(cash.credit)).toBe(8997);
  });

  it("VA 0% down: nothing to protect, credit covers closing costs only", () => {
    const va = calc(299900, 15000, "VA", 0, 0, 6.25);
    const cash = va.opts.find((x) => x.key === "cc")!.cash!;
    expect(cash.down).toBe(0);
    expect(cash.total).toBeGreaterThanOrEqual(0);
    expect(cash.total).toBe(Math.max(cash.closing - 15000, 0));
  });
});

it("matches Dillon's Indiana Loan Estimate (no points, no owner's title)", () => {
  // $308,000 loan at 7.375%, taxes $3,072/yr, insurance $1,028/yr. The LE had 18 days of interest
  // ($1,120); the model uses 15, so add 3 days back to compare with the LE's $9,285.
  const e = estimateClosingCosts({ price: 375000, loan: 308000, rate: 7.375, taxesYr: 3072, insuranceYr: 1028 });
  const threeDays = ((308000 * 7.375) / 100 / 365) * 3;
  expect(e.total + threeDays).toBeCloseTo(9285, -1);
});

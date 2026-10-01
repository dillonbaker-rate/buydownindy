// Cross-check: our engine vs. Rate's official Buydown & IPC Calculator.
// `ref` below is transcribed from that calculator's calc() (price = appraised value, 30-yr fixed,
// first-use VA, upfront fee financed, no temp-rate points). Both must agree to the dollar.
import { describe, expect, it } from "vitest";
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
            expect(r(c.mi?.monthly ?? 0)).toBe(r(R.miMo));
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

  it("estimates closing costs at 4% of the loan amount and shows what the buyer still pays", () => {
    const c = calc(350000, 10000, "Conventional", 5, 0, 6.25);
    expect(c.closingCosts).toBe(13300); // 4% of $332,500
    expect(r(c.opts.find((o) => o.key === "t2")!.buyerClosing!)).toBe(10773); // $13,300 − $2,527 left over
    expect(c.opts.find((o) => o.key === "cc")!.buyerClosing).toBe(3300);
    expect(r(c.opts.find((o) => o.key === "cut")!.buyerClosing!)).toBe(12920); // 4% of the smaller $323,000 loan
  });

  it("FHA closing costs use the loan with financed UFMIP", () => {
    const c = calc(299900, 15000, "FHA", 5, 0, 6.25);
    expect(r(c.closingCosts)).toBe(r(289890.84 * 0.04));
  });
});

it("says when leftover seller money exceeds closing costs", () => {
  const c = calc(299900, 15000, "FHA", 5, 0, 6.25);
  const o = c.opts.find((x) => x.key === "t1")!;
  expect(o.buyerClosing).toBe(0);
  expect(o.note).toMatch(/covers all closing costs; \$1,19\d would go unused/);
});

describe("cash to close: down payment + closing costs; concessions never pay the down payment", () => {
  // $350,000 Conventional 5% down: down $17,500; loan $332,500; closing costs 4% = $13,300.
  const c = calc(350000, 10000, "Conventional", 5, 0, 6.25);
  const o = (k: string) => c.opts.find((x) => x.key === k)!;

  it("closing cost credit: $17,500 down + $13,300 closing − $10,000 credit = $20,800", () => {
    expect(c.downPayment).toBe(17500);
    expect(o("cc").cash).toEqual({ down: 17500, closing: 13300, credit: 10000, total: 20800 });
  });

  it("price cut: smaller down payment and closing costs, no credit", () => {
    expect(o("cut").cash).toEqual({ down: 17000, closing: 12920, credit: 0, total: 29920 });
  });

  it("2-1 buydown: leftover $2,527 goes to closing costs only", () => {
    const cash = o("t2").cash!;
    expect(cash.down).toBe(17500);
    expect(r(cash.credit)).toBe(2527);
    expect(r(cash.total)).toBe(28273);
  });

  it("locked options apply no credit", () => {
    expect(o("t3").cash).toEqual({ down: 17500, closing: 13300, credit: 0, total: 30800 });
  });

  it("permanent buydown cash depends on lender pricing", () => {
    expect(o("perm").cash).toBeNull();
  });

  it("a credit bigger than closing costs never reduces the down payment", () => {
    // $15k credit, closing costs only $13,300: $1,700 is unused, down payment stays $17,500.
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

// Payment engine. A port of the prototype's calc(), with program rules (concession limits, MI and
// upfront fees) from Rate's official Buydown & IPC Calculator via src/content/program-rules.ts.
// All payments are principal and interest only on a 30-year fixed loan (360 payments).

import {
  CLOSING_COST_PCT,
  convIpcPct,
  convMiPct,
  FHA_IPC_PCT,
  FHA_UFMIP_PCT,
  fhaMipPct,
  FINANCE_UPFRONT_FEE,
  VA_CONCESSION_PCT,
  vaFundingFeePct,
} from "@/content/program-rules";

export type LoanType = "Conventional" | "FHA" | "VA";
export const LOAN_TYPES: LoanType[] = ["Conventional", "FHA", "VA"];
export const MIN_DOWN: Record<LoanType, number> = { Conventional: 3, FHA: 3.5, VA: 0 };
export const SHORT_TYPE: Record<LoanType, string> = { Conventional: "Conv.", FHA: "FHA", VA: "VA" };

export const CREDIT_RANGES = [
  { label: "740+", adj: 0 },
  { label: "700–739", adj: 0.25 },
  { label: "660–699", adj: 0.5 },
  { label: "620–659", adj: 0.875 },
] as const;

export type OptionState = "unlocked" | "locked" | "over" | "avail" | "ask";
export type OptionKey = "cut" | "t1" | "t2" | "t3" | "perm" | "cc";

export interface OptionRow {
  label: string;
  v: number;
  /** True for reduced-payment rows that render in the accent when unlocked. */
  hi: boolean;
}

export interface BuydownOption {
  key: OptionKey;
  name: string;
  sub: string;
  state: OptionState;
  costLabel: string;
  rows: OptionRow[];
  note: string;
  /** Year-1 payment, used to pick the best option. */
  y1: number;
  /** Estimated closing costs the buyer still pays with this option (null when it depends on lender pricing). */
  buyerClosing: number | null;
  /**
   * Estimated cash to close: down payment + closing costs, less seller credit applied to closing costs.
   * Seller credit can never reduce the down payment. Null when it depends on lender pricing.
   */
  cash: { down: number; closing: number; credit: number; total: number } | null;
  /** Temporary buydown length (1, 2 or 3). */
  k?: number;
  cost?: number;
  pays?: number[];
}

export interface CalcResult {
  rate: number;
  /** Loan amount including any financed upfront fee. */
  loan: number;
  /** Price minus down payment, before financed fees. */
  baseLoan: number;
  ltv: number;
  upfront: { name: string; pct: number; amount: number } | null;
  /** Mortgage insurance (annual % and monthly $). Shown as a note; comparisons are P&I. */
  mi: { name: string; pct: number; monthly: number } | null;
  closingCosts: number;
  /** Down payment at the list price. Seller concessions can't pay any of it. */
  downPayment: number;
  base: number;
  cut: number;
  limit: number;
  lp: number;
  limitTxt: string;
  opts: BuydownOption[];
  best: BuydownOption | null;
}

/** Monthly P&I for loan L at annual rate r (percent), 360 payments. */
export function pmt(L: number, r: number): number {
  const i = r / 1200;
  return i <= 0 ? L / 360 : (L * i) / (1 - Math.pow(1 + i, -360));
}

/** "$1,234" */
export const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
/** Savings as displayed: subtract the rounded payments so the math matches what's on screen. */
export const saving = (a: number, b: number) => Math.round(a) - Math.round(b);
/** "$15k", "$7.5k" */
export const kUsd = (n: number) => {
  const k = n / 1000;
  return "$" + (Number.isInteger(k) ? k : k.toFixed(1)) + "k";
};
/** "6.25%", "5.5%", "7.125%" */
export const pct = (r: number) => {
  let t = r.toFixed(3);
  if (t.endsWith("0")) t = t.slice(0, -1);
  return t + "%";
};

/** Program concession limit as a percent of price, by LTV for Conventional. */
export function concessionLimitPct(type: LoanType, down: number): number {
  if (type === "Conventional") return convIpcPct(100 - down);
  return type === "FHA" ? FHA_IPC_PCT : VA_CONCESSION_PCT;
}

export function calc(
  price: number,
  conc: number,
  type: LoanType,
  down: number,
  creditAdj: number,
  baseRate: number,
): CalcResult {
  const rate = baseRate + creditAdj;
  const ltv = 100 - down;
  const baseLoan = price * (1 - down / 100);

  // Upfront fee (financed) and monthly mortgage insurance, per Rate's calculator.
  const upPct = type === "FHA" ? FHA_UFMIP_PCT : type === "VA" ? vaFundingFeePct(down) : 0;
  const finF = FINANCE_UPFRONT_FEE ? upPct / 100 : 0;
  const loanFor = (p: number) => p * (1 - down / 100) * (1 + finF);
  const loan = loanFor(price);
  const upfront = upPct
    ? { name: type === "FHA" ? "FHA upfront MIP" : "VA funding fee", pct: upPct, amount: (baseLoan * upPct) / 100 }
    : null;
  const miPct = type === "Conventional" ? convMiPct(ltv) : type === "FHA" ? fhaMipPct(baseLoan, ltv) : 0;
  const mi = miPct ? { name: type === "FHA" ? "FHA annual MIP" : "mortgage insurance", pct: miPct, monthly: (loan * miPct) / 1200 } : null;

  const base = pmt(loan, rate);
  const lp = concessionLimitPct(type, down);
  const limit = (price * lp) / 100;
  const vaUncapped = type === "VA";
  const limitTxt =
    type === "VA"
      ? `VA caps seller concessions such as buydowns at ${lp}% of the price (${usd(limit)}). Normal closing costs aren't capped`
      : `${type} caps seller concessions at ${lp}% of the price (${usd(limit)})` +
        (type === "Conventional" ? ` with ${down < 10 ? "under 10%" : down < 25 ? "10–25%" : "25%+"} down` : "");
  const overTxt = `${type} ${lp}% limit is ${usd(limit)}`;

  const closingFor = (p: number) => (loanFor(p) * CLOSING_COST_PCT) / 100;
  const closingCosts = closingFor(price);
  /** Closing costs left for the buyer after `credit` dollars of seller money go toward them. */
  const buyerPays = (credit: number, cc = closingCosts) => Math.max(cc - Math.max(credit, 0), 0);
  const downPayment = (price * down) / 100;
  /** Cash to close when `credit` of seller money is available for closing costs (never the down payment). */
  const cashFor = (credit: number, p = price) => {
    const dp = (p * down) / 100;
    const cc = closingFor(p);
    const applied = Math.min(Math.max(credit, 0), cc);
    return { down: dp, closing: cc, credit: applied, total: dp + cc - applied };
  };

  const cut = pmt(loanFor(price - conc), rate);

  const opts: BuydownOption[] = [
    {
      key: "cut",
      name: `${kUsd(conc)} price cut`,
      sub: "Lowers the price and the loan",
      state: "avail",
      costLabel: usd(conc),
      rows: [{ label: "Every year", v: cut, hi: false }],
      note: `Saves ${usd(saving(base, cut))}/mo`,
      y1: cut,
      buyerClosing: buyerPays(0, closingFor(price - conc)),
      cash: cashFor(0, price - conc),
    },
  ];

  const temps: [number, string, string][] = [
    [1, "1-0 buydown", "Lower rate in year 1"],
    [2, "2-1 buydown", "Lower rate in years 1–2"],
    [3, "3-2-1 buydown", "Lower rate in years 1–3"],
  ];
  for (const [k, name, sub] of temps) {
    const pays: number[] = [];
    let cost = 0;
    for (let y = 0; y < k; y++) {
      const p = pmt(loan, rate - (k - y));
      pays.push(p);
      cost += (base - p) * 12;
    }
    const state: OptionState = cost > conc + 0.5 ? "locked" : cost > limit ? "over" : "unlocked";
    const left = conc - cost;
    opts.push({
      key: `t${k}` as OptionKey,
      k,
      name,
      sub,
      state,
      cost,
      costLabel: usd(cost),
      pays,
      y1: pays[0],
      buyerClosing: state === "unlocked" ? buyerPays(left) : closingCosts,
      cash: cashFor(state === "unlocked" ? left : 0),
      rows: pays
        .map((p, i) => ({ label: `Year ${i + 1}`, v: p, hi: true }))
        .concat([{ label: `Year ${k + 1} on`, v: base, hi: false }]),
      note:
        state === "locked"
          ? `Needs ${usd(cost - conc)} more`
          : state === "over"
            ? `Over limit: ${overTxt}`
            : left - closingCosts >= 1
              ? `${usd(left)} left covers all closing costs; ${usd(left - closingCosts)} would go unused (it can't go toward the down payment)`
              : left >= 1
                ? `${usd(left)} left for closing costs`
                : "Uses the full concession",
    });
  }

  // Permanent buydown (discount points): point pricing is set daily by each lender and investor,
  // so we don't estimate a rate or payment. The card sends buyers to a loan officer instead.
  opts.push({
    key: "perm",
    name: "Permanent buydown",
    sub: "Discount points lower the rate for the life of the loan",
    state: "ask",
    costLabel: "Set by the lender",
    y1: base,
    buyerClosing: null,
    cash: null,
    rows: [],
    note: "Point pricing changes daily and differs by lender. Ask a loan officer for today's options.",
  });

  const ccOver = !vaUncapped && conc > limit;
  // Credit usable for closing costs: capped by the program limit (except VA closing costs) and by the
  // actual closing costs. Anything left over is lost; it can't pay the down payment.
  const ccUsable = Math.min(conc, vaUncapped ? conc : limit);
  const ccCash = cashFor(ccUsable);
  const ccExtra = conc - ccCash.credit;
  opts.push({
    key: "cc",
    name: "Closing cost credit",
    sub: "Lowers the cash you bring to closing",
    state: ccOver ? "over" : "unlocked",
    costLabel: usd(conc),
    y1: base,
    rows: [],
    buyerClosing: ccCash.closing - ccCash.credit,
    cash: ccCash,
    note: ccOver
      ? `Over limit: ${overTxt}. Only ${usd(ccCash.credit)} can be used.`
      : ccExtra >= 1
        ? `Covers all ~${usd(ccCash.closing)} of closing costs. Credits can't pay the down payment, so ${usd(ccExtra)} would go unused.`
        : `${usd(ccCash.credit)} less cash to close. Your monthly payment doesn't change.`,
  });

  const ok = opts.filter((o) => o.state === "unlocked" && o.key !== "cc");
  const best = ok.length ? ok.reduce((a, b) => (b.y1 < a.y1 ? b : a)) : null;
  return { rate, loan, baseLoan, ltv, upfront, mi, closingCosts, downPayment, base, cut, limit, lp, limitTxt, opts, best };
}

/** Pick the loan type a listing should be shown with, given a filter preference. */
export function typeFor(accepted: LoanType[], preferred?: LoanType | "Any"): LoanType {
  return preferred && preferred !== "Any" && accepted.includes(preferred) ? preferred : accepted[0];
}

/** Sentence after the headline comparison, e.g. "Then $1,836 in year 2 and $2,047 from year 3." */
export function bestNote(c: CalcResult): string {
  const b = c.best;
  if (!b) return "No buydown is available at this concession.";
  if (b.k === 1) return `Then ${usd(c.base)} from year 2.`;
  if (b.k === 2) return `Then ${usd(b.pays![1])} in year 2 and ${usd(c.base)} from year 3.`;
  return `Then ${usd(b.pays![1])} in year 2, ${usd(b.pays![2])} in year 3, and ${usd(c.base)} after.`;
}

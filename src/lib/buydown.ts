// Payment engine. A faithful port of the prototype's calc().
// All payments are principal and interest only on a 30-year fixed loan (360 payments).

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

export type OptionState = "unlocked" | "locked" | "over" | "avail";
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
  /** Temporary buydown length (1, 2 or 3). */
  k?: number;
  cost?: number;
  pays?: number[];
  newRate?: number;
}

export interface CalcResult {
  rate: number;
  loan: number;
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

/** Program concession limit as a percent of price. */
export function concessionLimitPct(type: LoanType, down: number): number {
  if (type === "Conventional") return down < 10 ? 3 : down < 25 ? 6 : 9;
  return type === "FHA" ? 6 : 4;
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
  const loan = price * (1 - down / 100);
  const base = pmt(loan, rate);
  const lp = concessionLimitPct(type, down);
  const limit = (price * lp) / 100;
  const limitTxt =
    `${type} caps seller concessions at ${lp}% of the price (${usd(limit)})` +
    (type === "Conventional" ? ` with ${down < 10 ? "under 10%" : down < 25 ? "10–25%" : "25%+"} down` : "");
  const overTxt = `${type} ${lp}% limit is ${usd(limit)}`;
  const cut = pmt((price - conc) * (1 - down / 100), rate);

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
      rows: pays
        .map((p, i) => ({ label: `Year ${i + 1}`, v: p, hi: true }))
        .concat([{ label: `Year ${k + 1} on`, v: base, hi: false }]),
      note:
        state === "locked"
          ? `Needs ${usd(cost - conc)} more`
          : state === "over"
            ? `Over limit: ${overTxt}`
            : left >= 1
              ? `${usd(left)} left for closing costs`
              : "Uses the full concession",
    });
  }

  const budget = Math.min(conc, limit);
  const red = Math.floor(((budget / loan) * 100 * 0.25) / 0.125 + 1e-9) * 0.125;
  const pts = red / 0.25;
  const pcost = (pts * loan) / 100;
  const pp = pmt(loan, rate - red);
  const ptsL = pts % 1 ? pts.toFixed(1) : String(pts);
  opts.push({
    key: "perm",
    name: "Permanent buydown",
    sub: red > 0 ? `About ${ptsL} points buys ${pct(rate - red)}` : "Buys points to lower the rate for life",
    state: red > 0 ? "unlocked" : "locked",
    costLabel: red > 0 ? `~${ptsL} points (${usd(pcost)})` : "—",
    y1: pp,
    newRate: rate - red,
    rows: [{ label: "Life of loan", v: red > 0 ? pp : base, hi: red > 0 }],
    note:
      red > 0
        ? `Saves ${usd(saving(base, pp))}/mo for life` + (conc > limit ? ", capped at the program limit" : "")
        : `Needs ${usd(loan * 0.005 - conc)} more`,
  });

  opts.push({
    key: "cc",
    name: "Closing cost credit",
    sub: "Covers fees and prepaids at closing",
    state: conc > limit ? "over" : "unlocked",
    costLabel: usd(conc),
    y1: base,
    rows: [{ label: "Every year", v: base, hi: false }],
    note: conc > limit ? `Over limit: ${overTxt}` : `${usd(conc)} less cash to close`,
  });

  const ok = opts.filter((o) => o.state === "unlocked" && o.key !== "cc");
  const best = ok.length ? ok.reduce((a, b) => (b.y1 < a.y1 ? b : a)) : null;
  return { rate, loan, base, cut, limit, lp, limitTxt, opts, best };
}

/** Pick the loan type a listing should be shown with, given a filter preference. */
export function typeFor(accepted: LoanType[], preferred?: LoanType | "Any"): LoanType {
  return preferred && preferred !== "Any" && accepted.includes(preferred) ? preferred : accepted[0];
}

/** Sentence after the headline comparison, e.g. "Then $1,836 in year 2 and $2,047 from year 3." */
export function bestNote(c: CalcResult): string {
  const b = c.best;
  if (!b) return "No buydown is available at this concession.";
  if (b.key === "perm") return `Lower rate of ${pct(b.newRate!)} for the life of the loan.`;
  if (b.k === 1) return `Then ${usd(c.base)} from year 2.`;
  if (b.k === 2) return `Then ${usd(b.pays![1])} in year 2 and ${usd(c.base)} from year 3.`;
  return `Then ${usd(b.pays![1])} in year 2, ${usd(b.pays![2])} in year 3, and ${usd(c.base)} after.`;
}

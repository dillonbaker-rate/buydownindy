// Reverse calculator: from what the buyer wants (a temporary buydown, closing costs, or a target
// payment), work out the seller concession to write into the offer. Uses the same engine as listings.

import { calc, CREDIT_RANGES, type LoanType } from "./buydown";

export type BuydownGoal = 0 | 1 | 2 | 3 | "payment";
export type ClosingGoal = "all" | "none" | "custom";

export interface OfferInput {
  price: number;
  type: LoanType;
  down: number;
  creditTier: number;
  /** Today's base rate for the loan type (before the credit adjustment). */
  baseRate: number;
  buydown: BuydownGoal;
  /** Year-1 principal & interest the buyer wants to hit, when buydown === "payment". */
  targetPayment?: number;
  closing: ClosingGoal;
  customClosing?: number;
  /** Raise the offer price so the seller nets the same as a clean offer at `price`. */
  keepNet?: boolean;
}

export interface OfferResult {
  price: number;
  rate: number;
  loan: number;
  /** Chosen temporary buydown length (0 = none). */
  k: 0 | 1 | 2 | 3;
  buydownCost: number;
  closingCosts: number;
  closingCredit: number;
  total: number;
  /** Total rounded up to the next $500, for the offer. */
  ask: number;
  limit: number;
  limitPct: number;
  /** Concession dollars over the program limit (0 when within it). */
  over: number;
  limitTxt: string;
  netToSeller: number;
  payments: { full: number; byYear: number[] };
  cash: { down: number; closing: number; credit: number; total: number };
  /** Payment goal couldn't be met with a 3-2-1 (needs a permanent buydown or a lower price). */
  goalMissed: boolean;
}

const NAMES = { 1: "1-0", 2: "2-1", 3: "3-2-1" } as const;
export const buydownName = (k: 0 | 1 | 2 | 3) => (k ? `${NAMES[k]} temporary buydown` : "");

function solve(i: OfferInput, price: number): OfferResult {
  const adj = CREDIT_RANGES[i.creditTier]?.adj ?? 0;
  const c = calc(price, 0, i.type, i.down, adj, i.baseRate, i.creditTier);
  const temp = (k: number) => c.opts.find((o) => o.key === `t${k}`)!;

  let k: 0 | 1 | 2 | 3 = 0;
  let goalMissed = false;
  if (i.buydown === "payment") {
    const target = i.targetPayment ?? 0;
    if (c.base > target) {
      const hit = ([1, 2, 3] as const).find((n) => temp(n).y1 <= target);
      k = hit ?? 3;
      goalMissed = !hit;
    }
  } else k = i.buydown;

  const buydownCost = k ? temp(k).cost! : 0;
  const closingCredit = i.closing === "all" ? c.closingCosts : i.closing === "custom" ? Math.min(Math.max(i.customClosing ?? 0, 0), c.closingCosts) : 0;
  const total = buydownCost + closingCredit;
  // VA caps concessions (buydowns, prepaids) at 4% but not the buyer's normal closing costs.
  const counted = i.type === "VA" ? buydownCost : total;
  const over = Math.max(counted - c.limit, 0);
  const downPmt = (price * i.down) / 100;
  return {
    price,
    rate: c.rate,
    loan: c.loan,
    k,
    buydownCost,
    closingCosts: c.closingCosts,
    closingCredit,
    total,
    // Round up to the next $500, but never past the program limit.
    ask: over === 0 && i.type !== "VA" ? Math.min(Math.ceil(total / 500) * 500, Math.floor(c.limit)) : Math.ceil(total / 500) * 500,
    limit: c.limit,
    limitPct: c.lp,
    over,
    limitTxt: c.limitTxt,
    netToSeller: price - total,
    payments: { full: c.base, byYear: k ? temp(k).pays! : [] },
    cash: { down: downPmt, closing: c.closingCosts, credit: closingCredit, total: downPmt + c.closingCosts - closingCredit },
    goalMissed,
  };
}

export function offerMath(i: OfferInput): OfferResult {
  let r = solve(i, i.price);
  if (!i.keepNet || r.total <= 0) return r;
  // Raise the price until price − concession ≈ the original price (concession grows with the price).
  for (let n = 0; n < 8; n++) {
    const next = Math.round(i.price + r.total);
    if (Math.abs(next - r.price) < 1) break;
    r = solve(i, next);
  }
  return r;
}

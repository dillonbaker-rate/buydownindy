// Reverse calculator: from what the buyer wants (a temporary buydown, closing costs, or a target
// payment), add up the seller concession it takes. Math only. Uses the same engine as listings.

import { calc, type LoanType } from "./buydown";

export type BuydownGoal = 0 | 1 | 2 | 3 | "payment";
export type ClosingGoal = "all" | "none" | "custom";

export interface OfferInput {
  price: number;
  type: LoanType;
  down: number;
  creditTier: number;
  /** Today's rate for the loan type. Credit never changes it. */
  baseRate: number;
  buydown: BuydownGoal;
  /** Year-1 principal & interest the buyer wants to hit, when buydown === "payment". */
  targetPayment?: number;
  closing: ClosingGoal;
  customClosing?: number;
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
  limit: number;
  limitPct: number;
  /** Concession dollars over the program limit (0 when within it). */
  over: number;
  limitTxt: string;
  payments: { full: number; byYear: number[] };
  cash: { down: number; closing: number; credit: number; total: number };
  /** Payment goal couldn't be met with a 3-2-1 (needs a permanent buydown or a lower price). */
  goalMissed: boolean;
}

const NAMES = { 1: "1-0", 2: "2-1", 3: "3-2-1" } as const;
export const buydownName = (k: 0 | 1 | 2 | 3) => (k ? `${NAMES[k]} temporary buydown` : "");

function solve(i: OfferInput, price: number): OfferResult {
  // Credit only affects the conventional MI estimate, never the rate.
  const c = calc(price, 0, i.type, i.down, 0, i.baseRate, i.creditTier);
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
    limit: c.limit,
    limitPct: c.lp,
    over,
    limitTxt: c.limitTxt,
    payments: { full: c.base, byYear: k ? temp(k).pays! : [] },
    cash: { down: downPmt, closing: c.closingCosts, credit: closingCredit, total: downPmt + c.closingCosts - closingCredit },
    goalMissed,
  };
}

export function offerMath(i: OfferInput): OfferResult {
  return solve(i, i.price);
}

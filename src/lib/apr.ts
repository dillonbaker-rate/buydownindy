// Annual percentage rate for a fixed-rate loan, Reg Z actuarial method.

import { APR_PREPAID_FINANCE_PCT } from "@/content/program-rules";
import { calc, type LoanType } from "./buydown";

/** APR (percent) for `n` monthly payments of `payment` against `amountFinanced`. */
export function aprFromPayment(amountFinanced: number, payment: number, n = 360): number {
  const pv = (r: number) => (r <= 0 ? payment * n : (payment * (1 - Math.pow(1 + r / 1200, -n))) / (r / 1200));
  let lo = 0;
  let hi = 30;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (pv(mid) > amountFinanced) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Estimated APR at the note rate (no buydown) for a loan type and down payment: P&I plus monthly
 * mortgage insurance for the full term, against the base loan less assumed prepaid finance charges.
 * Financed FHA UFMIP / VA funding fee raise the payment without adding to the amount financed.
 */
export function estimateApr(type: LoanType, down: number, rate: number, price = 400_000, creditTier = 0): number {
  const c = calc(price, 0, type, down, 0, rate, creditTier);
  const amountFinanced = c.baseLoan * (1 - APR_PREPAID_FINANCE_PCT / 100);
  return aprFromPayment(amountFinanced, c.base + (c.mi?.monthly ?? 0));
}

/** "7.413%" style, 3 decimals. */
export const aprLabel = (apr: number) => `${apr.toFixed(3)}%`;

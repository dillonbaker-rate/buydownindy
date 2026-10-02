// Wording required wherever we advertise a payment or rate (Reg Z trigger terms): the payment step-up
// for temporary buydowns, the terms of the example loan, and the APR. Shared by every marketing output.

import { APR_PREPAID_FINANCE_PCT } from "@/content/program-rules";
import { aprLabel, estimateApr } from "./apr";
import { pct, usd, type BuydownOption, type LoanType } from "./buydown";

/** "Payment rises to $3,520/mo in year 2 and $3,899/mo from year 3." */
export function stepUpLine(b: Pick<BuydownOption, "k" | "pays">, full: number): string {
  const p = b.pays ?? [];
  if (b.k === 1) return `Payment rises to ${usd(full)}/mo from year 2.`;
  if (b.k === 2) return `Payment rises to ${usd(p[1])}/mo in year 2 and ${usd(full)}/mo from year 3.`;
  return `Payment rises to ${usd(p[1])}/mo in year 2, ${usd(p[2])}/mo in year 3, and ${usd(full)}/mo from year 4.`;
}

export interface ExampleLoan {
  price: number;
  type: LoanType;
  down: number;
  rate: number;
}

export function exampleApr(e: ExampleLoan) {
  return estimateApr(e.type, e.down, e.rate, e.price);
}

/** "Example: $599,900 price, 3% down ($17,997), Conventional 30-year fixed, 360 monthly payments at 7.28% (7.592% APR)." */
export function exampleLine(e: ExampleLoan): string {
  return `Example: ${usd(e.price)} price, ${e.down}% down (${usd((e.price * e.down) / 100)}), ${e.type} 30-year fixed, 360 monthly payments at ${pct(e.rate)} (${aprLabel(exampleApr(e))} APR).`;
}

/** How the APR was estimated. */
export const APR_ASSUMPTION = `APR is an estimate that assumes ${APR_PREPAID_FINANCE_PCT}% of the loan in prepaid finance charges, plus any mortgage insurance and financed FHA/VA fees.`;

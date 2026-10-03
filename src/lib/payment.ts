// Simple monthly payment estimate (the "Payment" calculator): principal & interest for any term, plus
// estimated taxes, insurance, HOA, and conventional mortgage insurance under 20% down. Estimates only.

import { APR_PREPAID_FINANCE_PCT, convMiPct, estimateTaxesAndInsurance } from "@/content/program-rules";
import { aprFromPayment } from "./apr";

export interface PaymentInput {
  price: number;
  downPct: number;
  rate: number;
  years: number;
  /** Annual property taxes; null = estimate from the price. */
  taxesYr: number | null;
  /** Annual homeowners insurance; null = estimate from the price. */
  insuranceYr: number | null;
  hoaMo: number;
}

/** Monthly principal & interest for loan L at annual rate r (percent) over n months. */
export function pmtN(L: number, r: number, n: number): number {
  const i = r / 1200;
  return i <= 0 ? L / n : (L * i) / (1 - Math.pow(1 + i, -n));
}

export function paymentBreakdown(i: PaymentInput) {
  const n = i.years * 12;
  const down = (i.price * i.downPct) / 100;
  const loan = Math.max(i.price - down, 0);
  const est = estimateTaxesAndInsurance(i.price);
  const taxesYr = i.taxesYr ?? est.taxesYr;
  const insuranceYr = i.insuranceYr ?? est.insuranceYr;
  const pi = pmtN(loan, i.rate, n);
  const ltv = i.price ? (loan / i.price) * 100 : 0;
  // Conventional MI at the top credit tier, only under 20% down. Rough estimate; it usually ends later.
  const miPct = convMiPct(ltv, 0);
  const mi = (loan * miPct) / 1200;
  const parts = { pi, taxes: taxesYr / 12, insurance: insuranceYr / 12, hoa: i.hoaMo, mi };
  const total = parts.pi + parts.taxes + parts.insurance + parts.hoa + parts.mi;
  const totalInterest = pi * n - loan;
  const apr = loan > 0 ? aprFromPayment(loan * (1 - APR_PREPAID_FINANCE_PCT / 100), pi + mi, n) : 0;
  return { n, down, loan, ltv, miPct, parts, total, totalInterest, apr, taxesEstimated: i.taxesYr == null, insuranceEstimated: i.insuranceYr == null };
}

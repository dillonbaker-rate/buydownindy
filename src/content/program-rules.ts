// Loan program rules, ported from Rate's official Buydown & IPC Calculator.
// Edit numbers here; the payment engine (src/lib/buydown.ts) reads them.
// COMPLIANCE: any change here should match the current Rate calculator and investor guidelines.

/** Buyer closing costs and prepaids, estimated as a % of the loan amount (incl. any financed fee). */
export const CLOSING_COST_PCT = 4;

/** Conventional IPC limit by LTV (Fannie Mae B3-4.1-02 / Freddie Mac 5501.6). */
export function convIpcPct(ltv: number): number {
  return ltv > 90 ? 3 : ltv > 75 ? 6 : 9;
}
/** FHA: 6% of sales price (HUD 4000.1). */
export const FHA_IPC_PCT = 6;
/**
 * VA: 4% of reasonable value for concessions (buydowns, prepaids, funding fee).
 * The buyer's normal closing costs are not capped (VA M26-7 Ch. 8).
 */
export const VA_CONCESSION_PCT = 4;

/** Conventional monthly MI, annual % of loan. Rate calculator's estimate for 740+ credit. */
export function convMiPct(ltv: number): number {
  return ltv <= 80 ? 0 : ltv > 95 ? 0.58 : ltv > 90 ? 0.46 : ltv > 85 ? 0.36 : 0.24;
}

/** FHA upfront MIP, financed into the loan by default. */
export const FHA_UFMIP_PCT = 1.75;
/** FHA conforming-loan threshold used by the MIP table. */
export const FHA_HIGH_BALANCE = 832_750;
/** FHA annual MIP for a 30-year term (HUD table). */
export function fhaMipPct(baseLoan: number, ltv: number): number {
  return baseLoan > FHA_HIGH_BALANCE ? (ltv > 95 ? 0.75 : 0.7) : ltv > 95 ? 0.55 : 0.5;
}

/** VA funding fee, first use (financed by default). No monthly MI on VA. */
export function vaFundingFeePct(downPct: number): number {
  return downPct >= 10 ? 1.25 : downPct >= 5 ? 1.5 : 2.15;
}

/** Finance FHA UFMIP / VA funding fee into the loan (Rate calculator default). */
export const FINANCE_UPFRONT_FEE = true;

// ── Listing estimates (the "Estimate" button on the posting form) ─────────
// COMPLIANCE: estimates only. Disclosed as estimates on the listing and in the full disclaimer.
/** Indiana caps homestead property taxes at 1% of assessed value; local referendums can add to it. */
export const PROPERTY_TAX_ESTIMATE_PCT = 1;
/** Rough annual homeowners insurance per $1,000 of price. */
export const INSURANCE_PER_1000 = 5;

export function estimateTaxesAndInsurance(price: number) {
  return {
    taxesYr: Math.round((price * PROPERTY_TAX_ESTIMATE_PCT) / 100 / 10) * 10,
    insuranceYr: Math.round(((price / 1000) * INSURANCE_PER_1000) / 10) * 10,
  };
}

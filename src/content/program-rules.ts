// Loan program rules, ported from Rate's official Buydown & IPC Calculator.
// Edit numbers here; the payment engine (src/lib/buydown.ts) reads them.
// COMPLIANCE: any change here should match the current Rate calculator and investor guidelines.

// ── Buyer closing costs (itemized) ────────────────────────────────────────
// Modeled on a real Indiana Loan Estimate Dillon provided (Oct 2026), without discount points and
// without the optional owner's title policy (customarily seller-paid in Indiana). Edit amounts here.
export const CLOSING_COSTS = {
  /** A. Application, processing, underwriting (no points). */
  lenderFees: 1640,
  /** B. Appraisal, credit report, credit verification, MERS, tax service. */
  servicesFees: 1262,
  /** C. Lender's title policy, settlement, title search, and related title charges. */
  titleFees: 1534,
  /** E. Recording fees. Indiana has no transfer tax. */
  recording: 140,
  /** Homeowners insurance per year by credit tier (CREDIT_RANGES order), when the listing has none. */
  insuranceByTier: [1500, 1600, 1700, 1850, 2000] as const,
  /** Property taxes per year as a % of the price, when the listing has none. */
  taxPct: 1,
  /** Months of property taxes collected at closing: 6 prepaid + 3 escrow (Indiana taxes are paid in arrears). */
  taxMonths: 9,
  /** Months of insurance in the escrow deposit (on top of the first year's premium). */
  insuranceEscrowMonths: 3,
  /** Days of prepaid interest (closing to month end; about half a month on average). */
  prepaidInterestDays: 15,
};

export interface ClosingCostItem {
  label: string;
  amount: number;
}

/** Itemized buyer closing costs and prepaids for one purchase. */
export function estimateClosingCosts(o: {
  price: number;
  loan: number;
  rate: number;
  creditTier?: number;
  taxesYr?: number | null;
  insuranceYr?: number | null;
}): { total: number; items: ClosingCostItem[] } {
  const C = CLOSING_COSTS;
  const tier = Math.min(Math.max(o.creditTier ?? 0, 0), C.insuranceByTier.length - 1);
  const insYr = o.insuranceYr || C.insuranceByTier[tier];
  const taxYr = o.taxesYr || (o.price * C.taxPct) / 100;
  const items: ClosingCostItem[] = [
    { label: "Lender fees (no points)", amount: C.lenderFees },
    { label: "Appraisal, credit & other services", amount: C.servicesFees },
    { label: "Title & settlement", amount: C.titleFees },
    { label: "Recording", amount: C.recording },
    { label: `Prepaid interest (${C.prepaidInterestDays} days)`, amount: (o.loan * o.rate) / 100 / 365 * C.prepaidInterestDays },
    { label: "Homeowners insurance (first year)", amount: insYr },
    { label: `Insurance escrow (${C.insuranceEscrowMonths} months)`, amount: (insYr / 12) * C.insuranceEscrowMonths },
    { label: `Property taxes (${C.taxMonths} months: prepaid + escrow)`, amount: (taxYr / 12) * C.taxMonths },
  ];
  return { total: items.reduce((s, i) => s + i.amount, 0), items };
}

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

/**
 * Conventional borrower-paid monthly MI, annual % of the loan, by LTV and credit tier.
 * Source: MGIC's published 30-year fixed BPMI rate card (July 2018, standard coverage), with two
 * credit bands averaged per tier, then reduced 25% to reflect the industry's lower premiums today
 * (Urban Institute: average in-force premium 0.525% in 2017 vs 0.394% in 2024).
 * Tiers match CREDIT_RANGES: 760+, 740–759, 700–739, 660–699, 620–659.
 * COMPLIANCE / ACCURACY: estimates. Replace with real quotes (e.g., from Encompass) when available.
 */
export const CONV_MI_TABLE: { minLtv: number; pct: [number, number, number, number, number] }[] = [
  { minLtv: 95, pct: [0.44, 0.53, 0.7, 1.03, 1.32] }, // 95.01–97%
  { minLtv: 90, pct: [0.29, 0.4, 0.54, 0.84, 1.03] }, // 90.01–95%
  { minLtv: 85, pct: [0.21, 0.29, 0.38, 0.58, 0.69] }, // 85.01–90%
  { minLtv: 80, pct: [0.14, 0.15, 0.18, 0.25, 0.32] }, // 80.01–85%
];

export function convMiPct(ltv: number, creditTier = 0): number {
  const row = CONV_MI_TABLE.find((r) => ltv > r.minLtv);
  if (!row) return 0; // 80% LTV or less: no MI
  return row.pct[Math.min(Math.max(creditTier, 0), row.pct.length - 1)];
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

// ── APR (Reg Z) ───────────────────────────────────────────────────────────
// Any advertised rate needs its APR. When Dillon hasn't entered today's APR from Rate's pricing, we
// estimate it from this assumption: prepaid finance charges (origination, discount, and similar
// lender fees) as a % of the loan. FHA upfront MIP / VA funding fee are counted on top (financed).
// COMPLIANCE: confirm this assumption with Rate before relying on estimated APRs in advertising.
export const APR_PREPAID_FINANCE_PCT = 1;

// Full monthly payment (PITI + mortgage insurance + HOA) for the listing page's "Full payment" view.
// Taxes and insurance use the agent's figures when given, otherwise the program-rules estimates.
import { estimateTaxesAndInsurance } from "@/content/program-rules";
import type { CalcResult } from "./buydown";

export interface Extras {
  taxes: number;
  insurance: number;
  mi: number;
  hoa: number;
  total: number;
  taxesEstimated: boolean;
  insuranceEstimated: boolean;
}

interface ListingCosts {
  price: number;
  taxesYr?: number | null;
  insuranceYr?: number | null;
  hoaMo?: number | null;
}

/** Monthly taxes + insurance + MI + HOA at a given price and loan amount. */
export function monthlyExtras(l: ListingCosts, c: CalcResult, price = l.price, loan = c.loan): Extras {
  const est = estimateTaxesAndInsurance(price);
  // Agent figures are for the actual home; only estimates move with a price cut.
  const taxesYr = l.taxesYr ? l.taxesYr : est.taxesYr;
  const insYr = l.insuranceYr ? l.insuranceYr : est.insuranceYr;
  const mi = c.mi ? (loan * c.mi.pct) / 1200 : 0;
  const hoa = l.hoaMo ?? 0;
  const taxes = taxesYr / 12;
  const insurance = insYr / 12;
  return {
    taxes,
    insurance,
    mi,
    hoa,
    total: taxes + insurance + mi + hoa,
    taxesEstimated: !l.taxesYr,
    insuranceEstimated: !l.insuranceYr,
  };
}

/** Extras for each option: everything but the price cut shares the list-price figures. */
export function extrasByOption(l: ListingCosts, c: CalcResult) {
  const base = monthlyExtras(l, c);
  const cut = c.opts.find((o) => o.key === "cut")?.priceCut;
  const cutExtras = cut ? monthlyExtras(l, c, cut.newPrice, cut.newLoan) : base;
  return { base, cut: cutExtras, forKey: (key: string) => (key === "cut" ? cutExtras.total : base.total) };
}

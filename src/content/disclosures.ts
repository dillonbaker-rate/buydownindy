// COMPLIANCE: Every string in this file is copied verbatim from the approved design handoff and
// must be reviewed by Rate compliance before public launch. Edit copy here only; components read it.

export const FOOTER_LINE =
  "Powered by Dillon Baker, NMLS #2681440 | Rate NMLS #2611 | Equal Housing Opportunity";

export const RATE_LINE = (info: { source: "daily" | "pmms"; date: string; rates: string }) =>
  info.source === "daily"
    ? ({
        lead: `Rates as of ${info.date}:`,
        // COMPLIANCE: Rate's own daily rates are advertised rates. Before launch compliance must
        // approve this wording and supply the pricing assumptions (points, credit score, LTV, loan
        // amount, occupancy) and APR that have to appear with them.
        body: `${info.rates} 30-year fixed rates offered by Rate on this date, used here as example rates. Your rate depends on your credit, down payment, loan amount, and other factors. All figures on this page are estimates for illustration only. They are not a loan offer, a rate quote, a Loan Estimate, or a commitment to lend.`,
      } as const)
    : ({
        lead: `Rate as of week of ${info.date}:`,
        // COMPLIANCE: advertised-rate rules — this is a survey average labeled as a sample, not an offered rate.
        body: `${info.rates} sample rate, based on the Freddie Mac Primary Mortgage Market Survey weekly average for a 30-year fixed-rate mortgage. All figures on this page are estimates for illustration only. They are not a loan offer, a rate quote, a Loan Estimate, or a commitment to lend.`,
      } as const);

export const EDUCATIONAL_LINE =
  "BuyDown Indy is an educational tool. It does not provide tax, legal, or financial advice. Talk to a licensed loan officer and a tax professional about your situation.";

export interface DisclosureSection {
  title: string;
  body: string;
  link?: { href: string; label: string; after: string };
}

export const representativeExample = (loan: string, rate: string, payment: string): DisclosureSection => ({
  title: "Representative example",
  // COMPLIANCE: Reg Z trigger terms. Stating a payment/rate likely requires a real APR here. Do not
  // launch until compliance supplies an APR (or approves this wording).
  body: `A ${loan} 30-year fixed loan at ${rate} has 360 monthly principal and interest payments of ${payment}. This example does not include taxes, insurance, or mortgage insurance, so the actual payment obligation will be greater. The annual percentage rate (APR) will be higher than the interest rate once lender fees and points are included. Your Loan Estimate will show your actual APR.`,
});

export const fullDisclaimer = (example: DisclosureSection): DisclosureSection[] => [
  {
    title: "Interest rates change daily",
    body: "Mortgage rates move every day, and sometimes several times a day. The sample rate is a national average and may not be available to you. Your rate depends on your credit score, down payment, loan amount, loan program, property type, occupancy, and the lender you choose. A rate is not guaranteed until it is locked with a lender.",
  },
  {
    title: "Buydown pricing changes daily",
    body: "Temporary buydown costs shown here are estimated as the difference between the full payment and the reduced payment, paid by the seller at closing. Actual buydown costs are set by the lender and change with daily rate pricing. Permanent buydowns (discount points) are not estimated here because point pricing changes daily and differs by lender and investor; a loan officer can quote current options.",
  },
  {
    title: "Temporary buydowns",
    body: "With a temporary buydown, your payment rises each year until it reaches the full note-rate payment. You qualify for the loan at the full note rate, not the reduced rate. Buydown funds are held in a custodial account and applied each month. If the loan is refinanced or paid off early, treatment of unused funds depends on your lender and loan program. Not all lenders or loan programs offer every buydown type.",
  },
  {
    title: "Lenders have different fees",
    body: "Lenders charge different fees, including origination, underwriting, processing, discount points, and lender credits. Third-party costs such as appraisal, title, settlement, recording, and transfer fees also vary. Closing cost credit amounts shown here do not reflect any specific lender. Compare Loan Estimates from more than one lender before you choose.",
  },
  {
    title: "Seller concession limits",
    body: "Seller concessions must be agreed to in the purchase contract and are subject to loan program limits: Conventional 3% (under 10% down), 6% (10–25% down), or 9% (over 25% down); FHA 6%; VA 4% (certain closing costs are excluded from the VA limit). Concessions cannot exceed your actual allowable closing costs and prepaids. Any excess may need to be applied as a price reduction or may be lost. The seller is not obligated to provide a concession until it is in a signed contract.",
  },
  {
    title: "What the payment includes",
    body: "Payments shown are principal and interest only. They do not include property taxes, homeowners insurance, flood insurance, private mortgage insurance (PMI), FHA mortgage insurance premiums (upfront and monthly), the VA funding fee, or HOA dues. Your actual monthly payment will be higher.",
  },
  {
    title: "Tax and insurance estimates",
    body: "Property tax, insurance, and HOA figures are provided by the listing agent and have not been verified. Indiana property taxes are often reassessed after a sale, and the seller’s homestead or other deductions do not transfer to the buyer, so your taxes may be higher than the current bill. Insurance premiums vary by carrier, coverage, and the property’s condition and location.",
  },
  example,
  {
    // COMPLIANCE: new copy (not in the approved design handoff). Closing-cost estimate and the
    // financed FHA/VA fee follow Rate's Buydown & IPC Calculator; needs compliance review.
    title: "Closing costs and loan fees",
    body: "Closing costs and prepaids are estimated at 4% of the loan amount and will vary by lender, title company, and property. Seller credits can be used only for actual closing costs and prepaids. FHA loan amounts include the 1.75% upfront mortgage insurance premium and VA loan amounts include the first-use VA funding fee, both financed into the loan. Mortgage insurance estimates assume a 740+ credit score.",
  },
  {
    title: "Listing information",
    body: "Listing details, photos, price, and concession amounts are provided by the listing agent and are not verified by BuyDown Indy, Dillon Baker, or Rate. Listings may be sold, changed, or withdrawn at any time. Verify all information with the listing agent.",
  },
  {
    title: "Lender and licensing",
    body: "Not a commitment to lend. All loans are subject to credit approval, underwriting, property appraisal, and program eligibility. Terms and programs may change without notice. You are free to work with any lender you choose. Dillon Baker, NMLS #2681440. Rate NMLS #2611.",
    link: { href: "https://www.nmlsconsumeraccess.org", label: "nmlsconsumeraccess.org", after: ". Equal Housing Opportunity." },
  },
];

// COMPLIANCE: TCPA consent wording — have compliance confirm before launch. This exact string is
// stored with every lead (consent_text) so the record matches what the buyer saw.
export const LENDER_CONSENT =
  "I agree to be contacted by Dillon Baker (NMLS #2681440) at Rate (NMLS #2611) by phone, text, or email about this request. Consent is not a condition of any purchase.";

export const FREE_TO_CHOOSE = "You're free to work with any lender you choose.";
export const FREE_TO_USE = "You're free to use any lender.";

export const PHOTO_RIGHTS = "I confirm I have the right to post these photos.";

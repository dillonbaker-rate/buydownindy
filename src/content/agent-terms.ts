// Agent Terms: what every agent agrees to when they set up an account.
// DRAFT FOR COUNSEL REVIEW. Have Rate's compliance/legal team review and finalize this text (RESPA §8,
// Indiana license law, Rate's co-marketing policy) before relying on it. When the text changes, bump
// AGENT_TERMS_VERSION: every agent is asked to accept the new version the next time they sign in.

export const AGENT_TERMS_VERSION = "2026-10-02";
/** Remove once counsel has approved the text. Shows a "draft" note on the terms page. */
export const AGENT_TERMS_DRAFT = true;

export const AGENT_TERMS_TITLE = "BuyDown Indy Agent Terms";

export const AGENT_TERMS_SUMMARY = "Free to use. No obligation to refer anyone or use any lender. Nothing in return for referrals. Same access for every licensed agent.";

export const AGENT_TERMS: { heading: string; body: string }[] = [
  {
    heading: "1. What this is",
    body: "BuyDown Indy is a free tool provided by Dillon Baker (NMLS #2681440), a loan officer with Rate (NMLS #2611). It helps real estate agents show buyers and sellers how a seller concession can lower a buyer's payment or closing costs.",
  },
  {
    heading: "2. Free, with no obligation",
    body: "There is no cost to use BuyDown Indy. You have no obligation to refer any buyer or seller to Dillon Baker, Rate, or any other lender, and no obligation to recommend or use any lender. Your clients are free to choose any lender they like, and you're free to tell them so.",
  },
  {
    heading: "3. Nothing in exchange for referrals",
    body: "You will not receive any payment, gift, lead, marketing, priority, feature, or anything else of value for referring business to Dillon Baker or Rate, and we don't count or reward referrals. Please don't ask for anything in exchange for a referral; we won't offer it. (This is required by the Real Estate Settlement Procedures Act, Section 8.)",
  },
  {
    heading: "4. The same access for every licensed agent",
    body: "Every agent with an active Indiana real estate license that we can verify gets the same features on the same terms, whether or not they or their clients ever work with Dillon Baker or Rate. Your access will never be expanded, limited, or ended based on referrals.",
  },
  {
    heading: "5. Lender information on the tool",
    body: "Listing pages and graphics show Dillon Baker's contact information and required disclosures because he provides the tool. That information is not a recommendation from you, and you may not remove or change the disclosures.",
  },
  {
    heading: "6. Your listings",
    body: "Post only listings you're authorized to market, with accurate details, a seller concession the seller has agreed to offer, and photos you have the right to use. Follow Indiana license law, MLS rules, and fair housing law.",
  },
  {
    heading: "7. Estimates, not loan offers",
    body: "Rates, payments, and closing costs on BuyDown Indy are estimates for education. They are not a loan offer, a rate lock, or a commitment to lend. Buyers qualify with the lender they choose.",
  },
  {
    heading: "8. Changes and your account",
    body: "We may update these terms; if we do, we'll ask you to accept the new version. We may suspend an account for false information, misuse, or breaking these terms, never because of referrals or the lack of them. You can stop using BuyDown Indy at any time and ask us to delete your account.",
  },
];

/** True when an agent needs to accept (or re-accept) the current terms. */
export function needsAgentTerms(agent: { termsTracked?: boolean; termsVersion?: string | null } | null | undefined): boolean {
  return !!agent?.termsTracked && agent.termsVersion !== AGENT_TERMS_VERSION;
}

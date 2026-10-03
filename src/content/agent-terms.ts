// Agent Terms: what every agent agrees to when they set up an account.
// DRAFT FOR COUNSEL REVIEW. Have Rate's compliance/legal team review and finalize this text (RESPA §8,
// Indiana license law, Rate's co-marketing policy) before relying on it. When the text changes, bump
// AGENT_TERMS_VERSION: every agent is asked to accept the new version the next time they sign in.

export const AGENT_TERMS_VERSION = "2026-10-02.3";
/** Set to false once counsel has approved the text. While true, the terms page shows a "draft" note. */
export const AGENT_TERMS_DRAFT = true;
/**
 * Whether new agents can create accounts. Opened by Dillon on 2026-10-03 while the terms are still a
 * draft (the terms page keeps its "Draft pending legal review" label until AGENT_TERMS_DRAFT is false).
 */
export const AGENT_SIGNUP_OPEN = true;

export const AGENT_TERMS_TITLE = "BuyDown Indy Agent Terms";

export const AGENT_TERMS_SUMMARY = "Free to use. Nothing on BuyDown Indy depends on referrals. You never have to use or recommend any lender.";

export const AGENT_TERMS: { heading: string; body: string }[] = [
  {
    heading: "1. What this is",
    body: "BuyDown Indy is a free educational tool that shows homebuyers how a seller concession can lower a payment or closing costs. It is provided by Dillon Baker (NMLS #2681440), a loan officer with Rate (NMLS #2611). Licensed agents may post listings they are authorized to market.",
  },
  {
    heading: "2. Free, with no obligation",
    body: "There is no cost to post a listing. You are never required to use or recommend any lender, and homebuyers are free to choose any lender.",
  },
  {
    heading: "3. Nothing depends on referrals",
    body: "Nothing on BuyDown Indy depends on whether you refer business to Dillon Baker, Rate, or anyone else. You will not receive any payment, gift, lead, or other benefit because of a referral. You are never required to use or recommend any lender.",
  },
  {
    heading: "4. The same access for every licensed agent",
    body: "Every agent with an active Indiana real estate license that we can verify gets the same features on the same terms. Access is never expanded, limited, or ended based on referrals.",
  },
  {
    heading: "5. Homebuyer inquiries",
    body: "When a homebuyer uses \u201cTalk to a lender,\u201d their request goes only to Dillon Baker. Listing agents do not receive these requests, and we do not share homebuyers\u2019 contact information with agents. Homebuyers who want to reach a listing agent contact the agent directly.",
  },
  {
    heading: "6. Your listings",
    body: "Post only listings you are authorized to market, with accurate details, a seller concession the seller has agreed to offer, and photos you have the right to use. Follow Indiana license law, MLS rules, and fair housing law. Do not remove or change the disclosures shown with the numbers. You give BuyDown Indy a free, non-exclusive license to display, resize, and share the photos and listing details you post, only to show the listing on BuyDown Indy, until you delete it. You can delete a listing at any time from My listings. To report a listing or photo that is inaccurate or used without permission, email dillon.baker@rate.com and we will review it and remove it if warranted.",
  },
  {
    heading: "7. Listing graphics and flyers",
    body: "Every live listing has the same standard share graphics, available to anyone on the public listing page, including homebuyers. They show the home, the payment examples with the required disclosures, Dillon Baker's contact information, and a plain \u201cListing courtesy of\u201d credit. They are not made for any agent and do not include your photo, logo, or contact details. If you want a custom flyer with your name, photo, logo, or contact details, contact Dillon Baker. Custom flyers are shared marketing, and the cost of designing, printing, and promoting them is split 50/50 between you and Dillon Baker. You pay your share directly, and it is never reduced or waived because of referrals.",
  },
  {
    heading: "8. Estimates, not loan offers",
    body: "Rates, payments, and closing costs on BuyDown Indy are estimates for education. They are not a loan offer, a rate lock, or a commitment to lend. Homebuyers qualify with the lender they choose.",
  },
  {
    heading: "9. Changes and your account",
    body: "We may update these terms; if we do, we will ask you to accept the new version. We may suspend an account for false information, misuse, or breaking these terms. You can stop using BuyDown Indy at any time and ask us to delete your account.",
  },
];

/** True when an agent needs to accept (or re-accept) the current terms. */
export function needsAgentTerms(agent: { termsTracked?: boolean; termsVersion?: string | null } | null | undefined): boolean {
  return !!agent?.termsTracked && agent.termsVersion !== AGENT_TERMS_VERSION;
}

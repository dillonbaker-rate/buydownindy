// Consumer privacy policy and terms of use.
// DRAFT FOR COUNSEL REVIEW. Written to describe what the app actually does today (see the notes on each
// section). If the app changes what it collects or who receives it, update this text in the same change.

export const LEGAL_DRAFT = true;
export const LEGAL_UPDATED = "October 2, 2026";

export type LegalSection = { heading: string; body: string };

export const PRIVACY: LegalSection[] = [
  {
    heading: "Who we are",
    body: "BuyDown Indy is a free educational tool provided by Dillon Baker (NMLS #2681440), a loan officer with Rate (NMLS #2611). This policy covers information collected on BuyDown Indy. If you apply for a loan, Rate's own privacy notice also applies.",
  },
  {
    heading: "What we collect",
    body: "When you send a “Talk to a lender” request: your name, email, phone number, your quiz answers, any message you write, the listing you asked about, the consent wording you agreed to and when, and your browser type. When an agent signs up: their account email, profile details, and listings. We don't run advertising trackers or analytics on this site. Browsing homes doesn't require an account.",
  },
  {
    heading: "How we use it",
    body: "We use your request only to contact you about it by phone, text, or email, as you agreed. Nothing on this site checks your credit.",
  },
  {
    heading: "Who receives it",
    body: "Your request goes only to Dillon Baker. We don't sell your information, and we don't share it with real estate agents, including the listing agent. Service providers that run the site (hosting, database, and email delivery) process it on our behalf. Maps are loaded from a map provider, which sees your device's internet address like any website you visit.",
  },
  {
    heading: "Cookies",
    body: "We use cookies only to keep agents signed in. The site may remember display settings (such as showing the full payment) in your browser.",
  },
  {
    heading: "Your choices",
    body: "Reply STOP to any text to stop texts, or ask us by email to stop contacting you. To see, correct, or delete the information you sent, email dillon.baker@rate.com.",
  },
  {
    heading: "Changes",
    body: "If we change this policy, we'll update it here with a new date.",
  },
];

export const TERMS_OF_USE: LegalSection[] = [
  {
    heading: "Education, not a loan offer",
    body: "BuyDown Indy shows estimates to help you understand seller concessions, buydowns, and price cuts. Rates, APRs, payments, taxes, insurance, and closing costs are estimates. They are not a loan offer, a rate lock, a Loan Estimate, or a commitment to lend. Your actual terms depend on your credit, the property, and other factors, and come from the lender you choose.",
  },
  {
    heading: "Listings",
    body: "Listings are posted by real estate agents, who are responsible for their accuracy. A listing's price, concession, and availability can change at any time. Confirm details with the listing agent.",
  },
  {
    heading: "You choose your lender",
    body: "You're free to work with any lender. Using this site doesn't obligate you to work with Dillon Baker or Rate.",
  },
  {
    heading: "Using the site",
    body: "Don't misuse the site, submit false information, or try to access accounts or data that aren't yours. You may share listing pages and their share images as they are, without changing the numbers or removing the disclosures.",
  },
  {
    heading: "Contact",
    body: "Questions: dillon.baker@rate.com, (317) 847-6869.",
  },
];

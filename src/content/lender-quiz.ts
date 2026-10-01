// "Talk to a lender" quiz. Edit questions and options here; the page renders whatever is defined.
// Each main question can have a follow-up that depends on the answer.
// COMPLIANCE: fair lending — never ask about protected characteristics (race, religion, sex, familial
// status, national origin, disability, age, marital status, receipt of public assistance).

export interface QuizOption {
  value: string;
  label: string;
}

export type QuizQuestion =
  | { id: string; kind: "single"; prompt: string; help?: string; options: QuizOption[] }
  | { id: string; kind: "multi"; prompt: string; help?: string; options: QuizOption[] }
  | { id: string; kind: "debts"; prompt: string; help?: string; fields: QuizOption[] };

export interface MainQuestion {
  q: QuizQuestion;
  /** Follow-up asked right after, based on the answer (single-choice questions only). */
  followUp?: (answer: string) => QuizQuestion | null;
}

const opts = (...labels: string[]): QuizOption[] => labels.map((l) => ({ value: l, label: l }));

export const PRICE_RANGES = [
  { label: "Under $250k", max: 250_000 },
  { label: "$250k–$350k", max: 350_000 },
  { label: "$350k–$500k", max: 500_000 },
  { label: "$500k–$750k", max: 750_000 },
  { label: "$750k+", max: Infinity },
];
export const priceRangeFor = (price: number) => PRICE_RANGES.find((r) => price < r.max)!.label;

export const QUIZ: MainQuestion[] = [
  {
    q: {
      id: "stage",
      kind: "single",
      prompt: "Where are you in the home-buying process?",
      options: opts("Just starting to look", "Pre-approved and touring homes", "Ready to make an offer", "Under contract"),
    },
    followUp: (a) =>
      a === "Just starting to look"
        ? { id: "timeline", kind: "single", prompt: "When are you hoping to buy?", options: opts("Within 3 months", "3–6 months", "6–12 months", "Not sure yet") }
        : a === "Pre-approved and touring homes"
          ? { id: "preapprovalWith", kind: "single", prompt: "Who is your pre-approval with?", options: opts("Rate", "Another lender", "Not sure") }
          : a === "Ready to make an offer"
            ? { id: "offerTiming", kind: "single", prompt: "When do you want to write an offer?", options: opts("This week", "Within 2 weeks", "Within a month") }
            : { id: "closingDate", kind: "single", prompt: "When is your closing date?", options: opts("Within 30 days", "30–45 days", "More than 45 days") },
  },
  {
    q: { id: "price", kind: "single", prompt: "What price range are you shopping in?", options: opts(...PRICE_RANGES.map((r) => r.label)) },
  },
  {
    q: {
      id: "credit",
      kind: "single",
      prompt: "What's your estimated credit score?",
      help: "Your best guess is fine. Nothing here checks your credit.",
      options: opts("740+", "700–739", "660–699", "620–659", "Below 620", "Not sure"),
    },
  },
  {
    q: {
      id: "income",
      kind: "single",
      prompt: "What's your household's monthly income before taxes?",
      help: "Include everyone who'll be on the loan.",
      options: opts("Under $4,000", "$4,000–$6,000", "$6,000–$8,000", "$8,000–$12,000", "$12,000+"),
    },
  },
  {
    q: {
      id: "debts",
      kind: "debts",
      prompt: "What do you pay each month toward debts?",
      help: "Minimum monthly payments only. Leave out rent, utilities, and phone bills.",
      fields: [
        { value: "car", label: "Car loans" },
        { value: "student", label: "Student loans" },
        { value: "card", label: "Credit card minimums" },
        { value: "other", label: "Other loans" },
      ],
    },
  },
  {
    q: { id: "firstTime", kind: "single", prompt: "Is this your first home purchase?", options: opts("Yes, my first home", "No, I've owned before") },
  },
  {
    q: { id: "otherLenders", kind: "single", prompt: "Are you talking with other lenders?", options: opts("Not yet", "Yes, one other", "Yes, a few") },
    followUp: (a) =>
      a === "Not yet"
        ? null
        : {
            id: "lenderChoice",
            kind: "single",
            prompt: "What will decide which lender you choose?",
            options: opts("Lowest rate", "Lowest monthly payment", "Lowest fees", "Clear communication", "Someone local"),
          },
  },
  {
    q: {
      id: "priority",
      kind: "single",
      prompt: "What matters most to you right now?",
      options: opts("Lowest monthly payment", "Lowest interest rate", "Least cash to close", "Closing quickly", "Understanding my options"),
    },
    followUp: (a) =>
      a === "Lowest monthly payment"
        ? {
            id: "comfortPayment",
            kind: "single",
            prompt: "What monthly payment would feel comfortable?",
            help: "Include taxes and insurance.",
            options: opts("Under $1,500", "$1,500–$2,000", "$2,000–$2,500", "$2,500–$3,000", "$3,000+"),
          }
        : a === "Lowest interest rate"
          ? {
              id: "yearsInHome",
              kind: "single",
              prompt: "How long do you plan to keep this home?",
              help: "This helps decide between a temporary and a permanent buydown.",
              options: opts("Under 5 years", "5–10 years", "10+ years", "Not sure"),
            }
          : a === "Least cash to close"
            ? {
                id: "savings",
                kind: "single",
                prompt: "How much have you saved for the down payment and closing costs?",
                options: opts("Under $10k", "$10k–$25k", "$25k–$50k", "$50k+"),
              }
            : a === "Closing quickly"
              ? { id: "closeBy", kind: "single", prompt: "How soon do you need to close?", options: opts("Within 30 days", "30–45 days", "I'm flexible") }
              : {
                  id: "learnAbout",
                  kind: "multi",
                  prompt: "What would you like to learn about?",
                  help: "Pick any that apply.",
                  options: opts(
                    "Temporary buydowns",
                    "Permanent buydowns (points)",
                    "Using seller concessions",
                    "FHA loans",
                    "VA loans",
                    "First-time buyer programs",
                  ),
                },
  },
];

export interface QuizAnswer {
  id: string;
  question: string;
  answer: string;
}

import { LENDER } from "@/content/lender";

/** Shown wherever agents see hidden listings as examples. */
export const EXAMPLE_DISCLAIMER =
  `Example listings are prepared by ${LENDER.name} to show how BuyDown Indy presents a seller concession. They are not live ` +
  "on BuyDown Indy and are not advertisements. The concession amounts and payments are illustrations only: not an offer by " +
  "any seller, not a quote, loan offer or commitment to lend. Contact the listing agent for a home's actual price and terms.";

export function ExampleDisclaimer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-[14px] p-3.5 text-[13px] leading-relaxed text-ink ${className}`}
      style={{ background: "var(--color-warn-bg)", border: "1px solid var(--color-warn-border)" }}
    >
      <strong>Examples only.</strong> {EXAMPLE_DISCLAIMER}
    </div>
  );
}

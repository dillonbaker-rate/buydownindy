import { ChevronUp } from "lucide-react";
import Link from "next/link";
import { BRANCH_ADDRESS, CREDIT_LINE, NMLS_CONSUMER_URL } from "@/content/disclosures";
import { EhoLogo } from "./EhoLogo";

// Always-visible lender disclosures on every page: legal name, NMLS, licensing link, branch, credit language, EHL logo.
// Phones: one line (both NMLS IDs and Equal Housing Lender stay visible) that opens to the full text, so the
// disclosures don't take a quarter of the screen. Desktop: the full text.
export function Footer() {
  const full = (
    <>
      <div>
        Dillon Baker, NMLS #2681440 · Guaranteed Rate, Inc. dba Rate; NMLS #2611; For licensing information visit{" "}
        <a href={NMLS_CONSUMER_URL} target="_blank" rel="noopener noreferrer" className="text-neutral-800">
          nmlsconsumeraccess.org
        </a>
        . Branch: {BRANCH_ADDRESS} · Equal Housing Lender ·{" "}
        <Link href="/privacy" className="text-neutral-800">
          Privacy
        </Link>{" "}
        ·{" "}
        <Link href="/terms" className="text-neutral-800">
          Terms
        </Link>
      </div>
      <div className="text-neutral-700">{CREDIT_LINE}</div>
    </>
  );
  return (
    <footer className="flex-none border-t border-divider bg-bg text-[10.5px] leading-[1.35] text-neutral-800">
      <details className="group lg:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-1.5 [&::-webkit-details-marker]:hidden">
          <EhoLogo size={16} />
          <span className="min-w-0 flex-1">Dillon Baker NMLS #2681440 · Rate NMLS #2611 · Equal Housing Lender</span>
          <span className="flex flex-none items-center gap-0.5 font-semibold text-accent">
            Disclosures
            <ChevronUp size={13} className="transition-transform group-open:rotate-180" />
          </span>
        </summary>
        <div className="max-h-[40vh] overflow-auto px-4 pb-2">{full}</div>
      </details>
      <div className="hidden items-start gap-2.5 px-8 py-2 lg:flex">
        <EhoLogo size={30} />
        <div className="min-w-0">{full}</div>
      </div>
    </footer>
  );
}

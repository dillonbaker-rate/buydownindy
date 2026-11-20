import Link from "next/link";
import { BRANCH_ADDRESS, CREDIT_LINE, NMLS_CONSUMER_URL } from "@/content/disclosures";
import { EhoLogo } from "./EhoLogo";

// Always-visible lender disclosures on every page: legal name, NMLS, licensing link, branch, credit language, EHL logo.
export function Footer() {
  return (
    <footer className="flex flex-none items-start gap-2.5 border-t border-divider bg-bg px-4 py-2 text-[10.5px] leading-[1.35] text-neutral-800 lg:px-8">
      <EhoLogo size={30} />
      <div className="min-w-0">
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
      </div>
    </footer>
  );
}

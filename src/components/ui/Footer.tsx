import Link from "next/link";
import { FOOTER_LINE } from "@/content/disclosures";
import { EhoLogo } from "./EhoLogo";

export function Footer() {
  return (
    <footer className="flex flex-none items-center gap-2.5 border-t border-divider bg-bg px-4 py-2 text-[11px] leading-[1.35] text-neutral-800 lg:px-8">
      <EhoLogo />
      <span>
        {FOOTER_LINE} ·{" "}
        <Link href="/privacy" className="text-neutral-800">
          Privacy
        </Link>{" "}
        ·{" "}
        <Link href="/terms" className="text-neutral-800">
          Terms
        </Link>
      </span>
    </footer>
  );
}

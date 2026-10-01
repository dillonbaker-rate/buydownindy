import Link from "next/link";
import type { ReactNode } from "react";
import { Star } from "lucide-react";
import { Footer } from "./Footer";

export function Wordmark() {
  return (
    <Link href="/" aria-label="BuyDown Indy, back to the map" className="mr-auto flex min-h-9 items-center no-underline">
      <span className="flex items-stretch text-[18px] leading-none font-bold tracking-[-0.03em]">
        <span className="py-1.5 pr-0.5 text-ink">BuyDown</span>
        <span className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-[5px] text-white">
          Indy
          <Star size={14} fill="currentColor" strokeWidth={0} />
        </span>
      </span>
    </Link>
  );
}

export function Header({ children }: { children?: ReactNode }) {
  return (
    <header className="flex flex-none items-center gap-2 border-b border-divider bg-bg px-4 py-2.5 lg:px-8">
      <Wordmark />
      {children}
    </header>
  );
}

/** Full-height app frame: header, a flexible content area, and the compliance footer pinned at the bottom. */
export function AppShell({ header, children }: { header?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header>{header}</Header>
      <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
      <Footer />
    </div>
  );
}


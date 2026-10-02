"use client";
import { Calculator, House, MessageCircle, Search, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean }[] = [
  { href: "/homes", label: "Search", icon: Search, match: (p) => p === "/" || p.startsWith("/homes") || p.startsWith("/listing") },
  { href: "/calculator", label: "Calculator", icon: Calculator, match: (p) => p.startsWith("/calculator") },
  { href: "/talk-to-a-lender", label: "Lender", icon: MessageCircle, match: (p) => p.startsWith("/talk-to-a-lender") },
  { href: "/agent", label: "List a home", icon: House, match: (p) => p.startsWith("/agent") },
];

/** App navigation: a left icon rail on desktop, a bottom tab bar on phones. */
export function SideNav({ mobile = true }: { mobile?: boolean }) {
  const path = usePathname() ?? "/";
  const item = (it: (typeof ITEMS)[number], bar: boolean) => {
    const on = it.match(path);
    const Icon = it.icon;
    return (
      <Link
        key={it.href}
        href={it.href}
        aria-current={on ? "page" : undefined}
        className={`flex flex-col items-center no-underline ${bar ? "min-w-0 flex-1 gap-0.5 py-1.5" : "gap-1.5 py-1"} ${on ? "text-accent" : "text-neutral-800 hover:text-ink"}`}
      >
        <span className={`grid place-items-center rounded-[16px] transition-colors ${bar ? "h-8 w-12" : "h-14 w-16"} ${on ? "bg-accent-100" : ""}`}>
          <Icon size={bar ? 20 : 24} strokeWidth={on ? 2.5 : 2} />
        </span>
        <span className={`${bar ? "text-[11px]" : "text-[13px]"} ${on ? "font-bold" : ""}`}>{it.label}</span>
      </Link>
    );
  };
  return (
    <>
      <nav aria-label="Main" className="hidden w-[92px] flex-none flex-col items-center gap-3 overflow-y-auto border-r border-divider bg-bg pt-4 lg:flex">
        {ITEMS.map((it) => item(it, false))}
      </nav>
      {mobile && (
        <nav aria-label="Main" className="order-last flex flex-none border-t border-divider bg-bg px-1 lg:hidden">
          {ITEMS.map((it) => item(it, true))}
        </nav>
      )}
    </>
  );
}

import { House } from "lucide-react";
import Link from "next/link";
import { calc, kUsd, MIN_DOWN, typeFor, usd, type LoanType } from "@/lib/buydown";
import type { Listing } from "@/lib/types";

export function cardNumbers(l: Listing, rate: number, loanFilter?: LoanType | "Any") {
  const type = typeFor(l.loanTypes, loanFilter);
  const c = calc(l.price, l.concession, type, Math.max(l.defaultDownPct, MIN_DOWN[type]), 0, rate);
  const b = c.best;
  return {
    type,
    low: usd(b ? b.y1 : c.cut),
    lowWhen: b ? (b.key === "perm" ? "for the life of the loan" : "in year 1") : "with a price cut",
    cut: usd(c.cut),
  };
}

export function PhotoOrPlaceholder({ url, alt, iconSize = 36 }: { url?: string; alt: string; iconSize?: number }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
  ) : (
    <House size={iconSize} strokeWidth={1.25} aria-hidden />
  );
}

export function ListingCard({
  listing: l,
  rate,
  loanFilter,
  selected,
  href,
}: {
  listing: Listing;
  rate: number;
  loanFilter?: LoanType | "Any";
  selected?: boolean;
  href: string;
}) {
  const n = cardNumbers(l, rate, loanFilter);
  return (
    <Link
      href={href}
      className="lift flex flex-col overflow-hidden rounded-[20px] border border-divider bg-bg text-ink no-underline hover:text-ink"
      style={{ outline: selected ? "2px solid var(--color-ink)" : undefined, outlineOffset: -2 }}
    >
      <div className="relative grid aspect-video place-items-center bg-neutral-300 text-neutral-600">
        <PhotoOrPlaceholder url={l.photos[0]?.url} alt={`${l.address}, ${l.city}`} />
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-0.5 rounded-[14px] bg-accent px-3 pt-2 pb-[7px] text-white shadow-md">
          <span className="text-2xl leading-none font-bold tracking-[-0.03em]">{kUsd(l.concession)}</span>
          <span className="text-[9px] font-semibold">from seller</span>
        </div>
        {l.isSample && <span className="tag tag-neutral absolute bottom-2.5 left-2.5">Sample</span>}
      </div>
      <div className="flex flex-col gap-0.5 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xl font-bold tracking-[-0.02em]">{usd(l.price)}</span>
          <span className="text-xs text-neutral-700">
            {l.beds} bd · {l.baths} ba · {l.sqft.toLocaleString("en-US")} sq ft
          </span>
        </div>
        <div className="text-[13px] text-neutral-700">
          {l.address}, {l.city}
        </div>
        <div className="mt-3 flex items-end justify-between gap-2 rounded-[14px] bg-accent-100 p-3">
          <div>
            <div className="text-[11px] text-neutral-700">As low as</div>
            <div className="text-[30px] leading-none font-bold tracking-[-0.03em] text-accent">
              {n.low}
              <span className="text-[13px] font-semibold tracking-normal">/mo</span>
            </div>
            <div className="mt-0.5 text-xs">{n.lowWhen}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-neutral-700">Price cut</div>
            <div className="text-[15px] font-semibold text-neutral-700 line-through">{n.cut}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

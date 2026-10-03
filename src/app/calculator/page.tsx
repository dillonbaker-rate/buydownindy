import Link from "next/link";
import { OfferCalculator } from "@/components/calculator/OfferCalculator";
import { PaymentCalculator } from "@/components/calculator/PaymentCalculator";
import { AppShell } from "@/components/ui/Header";
import { typeFor } from "@/lib/buydown";
import { getListing } from "@/lib/data";
import { longDate } from "@/lib/rate-info";
import { getRateInfo } from "@/lib/rates";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Calculators · BuyDown Indy",
  description: "Estimate a monthly mortgage payment, or add up what a temporary buydown and closing costs cost.",
};

const TABS = [
  { value: "payment", label: "Payment" },
  { value: "buydown", label: "Buydown & concessions" },
] as const;

// Public: anyone can use it, no account needed.
export default async function CalculatorPage({ searchParams }: { searchParams: Promise<{ listing?: string; tab?: string }> }) {
  const { listing, tab: t } = await searchParams;
  // Coming from a listing opens the buydown calculator for that home; otherwise start with Payment.
  const tab = t === "buydown" || t === "payment" ? t : listing ? "buydown" : "payment";
  const [info, l] = await Promise.all([getRateInfo(), listing ? getListing(listing) : Promise.resolve(null)]);
  const rateNote = info.source === "daily" ? `(rate as of ${longDate(info.date)})` : `(sample rate, Freddie Mac PMMS week of ${longDate(info.date)})`;
  const initial = l ? { price: l.price, type: typeFor(l.loanTypes), down: l.defaultDownPct, address: `${l.address}, ${l.city}` } : undefined;
  return (
    <AppShell>
      <nav aria-label="Calculators" className="flex flex-none gap-1 border-b border-divider px-4 lg:px-8">
        {TABS.map((x) => (
          <Link
            key={x.value}
            href={`/calculator?tab=${x.value}${listing ? `&listing=${encodeURIComponent(listing)}` : ""}`}
            aria-current={tab === x.value ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-3 text-sm font-semibold no-underline ${tab === x.value ? "border-accent text-accent" : "border-transparent text-neutral-700 hover:text-ink"}`}
          >
            {x.label}
          </Link>
        ))}
      </nav>
      {tab === "payment" ? (
        <PaymentCalculator rate={info.rates.Conventional} rateNote={rateNote} />
      ) : (
        <OfferCalculator rates={info.rates} rateNote={rateNote} initial={initial} />
      )}
    </AppShell>
  );
}

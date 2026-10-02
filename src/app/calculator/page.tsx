import { OfferCalculator } from "@/components/calculator/OfferCalculator";
import { AppShell } from "@/components/ui/Header";
import { typeFor } from "@/lib/buydown";
import { getListing } from "@/lib/data";
import { longDate } from "@/lib/rate-info";
import { getRateInfo } from "@/lib/rates";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Concession calculator · BuyDown Indy",
  description: "Add up what a temporary buydown and closing costs cost, and see what they do to the monthly payment.",
};

// Public: anyone can use it, no account needed.
export default async function CalculatorPage({ searchParams }: { searchParams: Promise<{ listing?: string }> }) {
  const { listing } = await searchParams;
  const [info, l] = await Promise.all([getRateInfo(), listing ? getListing(listing) : Promise.resolve(null)]);
  const rateNote = info.source === "daily" ? `(rate as of ${longDate(info.date)})` : `(sample rate, Freddie Mac PMMS week of ${longDate(info.date)})`;
  const initial = l ? { price: l.price, type: typeFor(l.loanTypes), down: l.defaultDownPct, address: `${l.address}, ${l.city}` } : undefined;
  return (
    <AppShell>
      <OfferCalculator rates={info.rates} rateNote={rateNote} initial={initial} />
    </AppShell>
  );
}

import { redirect } from "next/navigation";
import { mustAcceptTerms } from "@/lib/agent-terms-gate";
import { AgentHeader } from "@/components/agent/AgentHeader";
import { OfferCalculator } from "@/components/agent/OfferCalculator";
import { AppShell } from "@/components/ui/Header";
import { typeFor } from "@/lib/buydown";
import { getCurrentAgent, getListing } from "@/lib/data";
import { longDate } from "@/lib/rate-info";
import { getRateInfo } from "@/lib/rates";
import { agentsEnabled } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "Offer calculator · BuyDown Indy" };

export default async function OfferCalculatorPage({ searchParams }: { searchParams: Promise<{ listing?: string }> }) {
  const { listing } = await searchParams;
  const next = `/agent/offer-calculator${listing ? `?listing=${encodeURIComponent(listing)}` : ""}`;
  if (agentsEnabled) {
    const me = await getCurrentAgent();
    if (!me) redirect(`/agent/login?next=${encodeURIComponent(next)}`);
    if (!me.agent) redirect("/agent");
    if (mustAcceptTerms(me.agent, me.email)) redirect("/agent");
  }
  const [info, l] = await Promise.all([getRateInfo(), listing ? getListing(listing) : Promise.resolve(null)]);
  const rateNote = info.source === "daily" ? `(rate as of ${longDate(info.date)})` : `(sample rate, Freddie Mac PMMS week of ${longDate(info.date)})`;
  const initial = l ? { price: l.price, type: typeFor(l.loanTypes), down: l.defaultDownPct, address: `${l.address}, ${l.city}` } : undefined;
  return (
    <AppShell header={<AgentHeader />}>
      <OfferCalculator rates={info.rates} rateNote={rateNote} initial={initial} />
    </AppShell>
  );
}

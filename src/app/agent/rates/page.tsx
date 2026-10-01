import { notFound, redirect } from "next/navigation";
import { AgentHeader } from "@/components/agent/AgentHeader";
import { RatesForm } from "@/components/agent/RatesForm";
import { AppShell } from "@/components/ui/Header";
import { getCurrentAgent } from "@/lib/data";
import { indyToday } from "@/lib/rate-info";
import { getLatestDaily, getRateInfo, isRateAdmin } from "@/lib/rates";
import { supabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "Today's rates · BuyDown Indy" };

export default async function RatesPage() {
  let email: string | null = null;
  if (supabaseConfigured) {
    const me = await getCurrentAgent();
    if (!me) redirect("/agent/login?next=/agent/rates");
    email = me.email;
  }
  if (!isRateAdmin(email)) notFound();
  const [live, last] = await Promise.all([getRateInfo(), getLatestDaily()]);
  return (
    <AppShell header={<AgentHeader />}>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-[560px] p-4 lg:p-8">
          <RatesForm live={live} today={indyToday()} last={last} />
        </div>
      </div>
    </AppShell>
  );
}

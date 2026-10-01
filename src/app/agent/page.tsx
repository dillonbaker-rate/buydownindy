import { redirect } from "next/navigation";
import { AgentHeader, SetupNotice } from "@/components/agent/AgentHeader";
import { Dashboard } from "@/components/agent/Dashboard";
import { ProfileForm } from "@/components/agent/ProfileForm";
import { AppShell } from "@/components/ui/Header";
import { getCurrentAgent, getMyListings } from "@/lib/data";
import { isRateAdmin } from "@/lib/rates";
import { supabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "My listings · BuyDown Indy" };

export default async function AgentPage() {
  if (!supabaseConfigured)
    return (
      <AppShell>
        <SetupNotice />
      </AppShell>
    );
  const me = await getCurrentAgent();
  if (!me) redirect("/agent/login");
  if (!me.agent)
    return (
      <AppShell>
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-[560px] p-4 lg:p-8">
            <ProfileForm email={me.email} />
          </div>
        </div>
      </AppShell>
    );
  const listings = await getMyListings(me.userId);
  return (
    <AppShell header={<AgentHeader onDash admin={isRateAdmin(me.email)} />}>
      <Dashboard agent={me.agent} listings={listings} />
    </AppShell>
  );
}

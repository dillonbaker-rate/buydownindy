import { redirect } from "next/navigation";
import { AgentHeader, SetupNotice } from "@/components/agent/AgentHeader";
import { Dashboard } from "@/components/agent/Dashboard";
import { AgentProfileForm } from "@/components/agent/AgentProfileForm";
import { AppShell } from "@/components/ui/Header";
import { getCurrentAgent, getMyListings } from "@/lib/data";
import { listInvites } from "@/lib/invites";
import { isRateAdmin } from "@/lib/rates";
import { agentsEnabled } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "My listings · BuyDown Indy" };

export default async function AgentPage() {
  if (!agentsEnabled)
    return (
      <AppShell>
        <SetupNotice />
      </AppShell>
    );
  const me = await getCurrentAgent();
  if (!me) redirect("/agent/login");
  if (!me.agent)
    return (
      <AppShell header={<AgentHeader />}>
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-[720px] p-4 lg:p-8">
            <AgentProfileForm agent={null} email={me.email} userId={me.userId} onboarding />
          </div>
        </div>
      </AppShell>
    );
  const [listings, invites] = await Promise.all([getMyListings(me.userId), listInvites(me.userId)]);
  return (
    <AppShell header={<AgentHeader onDash admin={isRateAdmin(me.email)} />}>
      <Dashboard agent={me.agent} listings={listings} invites={invites} isAdmin={isRateAdmin(me.email)} />
    </AppShell>
  );
}

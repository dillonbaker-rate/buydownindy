import { redirect } from "next/navigation";
import { AgentHeader, SetupNotice } from "@/components/agent/AgentHeader";
import { Dashboard } from "@/components/agent/Dashboard";
import { AcceptAgentTerms } from "@/components/agent/AgentTerms";
import { AGENT_SIGNUP_OPEN, AGENT_TERMS_VERSION } from "@/content/agent-terms";
import { mustAcceptTerms } from "@/lib/agent-terms-gate";
import { AgentProfileForm } from "@/components/agent/AgentProfileForm";
import { AppShell } from "@/components/ui/Header";
import { getCurrentAgent, getMyListings } from "@/lib/data";
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
  if (!me.agent && !AGENT_SIGNUP_OPEN && !isRateAdmin(me.email))
    return (
      <AppShell header={<AgentHeader />}>
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="mx-auto flex max-w-[560px] flex-col gap-2 p-4 lg:p-8">
            <h1 className="text-[26px]">Agent accounts aren&apos;t open yet</h1>
            <p className="m-0 text-sm text-neutral-700">
              We&apos;re finishing the agent terms. You&apos;ll be able to set up your profile and post listings as soon as they&apos;re final.
            </p>
          </div>
        </div>
      </AppShell>
    );
  if (!me.agent)
    return (
      <AppShell header={<AgentHeader />}>
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-[720px] p-4 lg:p-8">
            <AgentProfileForm agent={null} email={me.email} userId={me.userId} onboarding termsAccepted={me.signupTermsVersion === AGENT_TERMS_VERSION} />
          </div>
        </div>
      </AppShell>
    );
  if (mustAcceptTerms(me.agent, me.email))
    return (
      <AppShell header={<AgentHeader />}>
        <AcceptAgentTerms />
      </AppShell>
    );
  const listings = await getMyListings(me.userId);
  return (
    <AppShell header={<AgentHeader onDash admin={isRateAdmin(me.email)} />}>
      <Dashboard agent={me.agent} listings={listings} isAdmin={isRateAdmin(me.email)} />
    </AppShell>
  );
}

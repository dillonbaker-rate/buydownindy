import { redirect } from "next/navigation";
import { AgentHeader } from "@/components/agent/AgentHeader";
import { AgentProfileForm } from "@/components/agent/AgentProfileForm";
import { AppShell } from "@/components/ui/Header";
import { getCurrentAgent } from "@/lib/data";
import { isAdmin } from "@/lib/rates";
import { agentsEnabled } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "My profile · BuyDown Indy" };

export default async function ProfilePage() {
  if (!agentsEnabled) redirect("/agent");
  const me = await getCurrentAgent();
  if (!me) redirect("/agent/login?next=/agent/profile");
  return (
    <AppShell header={<AgentHeader admin={isAdmin(me.email)} />}>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-[720px] p-4 lg:p-8">
          <AgentProfileForm agent={me.agent} email={me.email} userId={me.userId} onboarding={!me.agent} isAdmin={isAdmin(me.email)} />
        </div>
      </div>
    </AppShell>
  );
}

import { redirect } from "next/navigation";
import { mustAcceptTerms } from "@/lib/agent-terms-gate";
import { AgentHeader, SetupNotice } from "@/components/agent/AgentHeader";
import { PostWizard } from "@/components/agent/PostWizard";
import { AppShell } from "@/components/ui/Header";
import { getCurrentAgent } from "@/lib/data";
import { getRateInfo } from "@/lib/rates";
import { agentsEnabled } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "Post a listing · BuyDown Indy" };

export default async function PostPage() {
  if (!agentsEnabled)
    return (
      <AppShell>
        <SetupNotice />
      </AppShell>
    );
  const me = await getCurrentAgent();
  if (!me) redirect("/agent/login?next=/agent/post");
  if (!me.agent) redirect("/agent");
  if (mustAcceptTerms(me.agent, me.email)) redirect("/agent");
  const rateInfo = await getRateInfo();
  return (
    <AppShell header={<AgentHeader />}>
      <PostWizard rateInfo={rateInfo} userId={me.userId} />
    </AppShell>
  );
}

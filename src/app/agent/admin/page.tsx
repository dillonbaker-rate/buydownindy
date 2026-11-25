import { notFound, redirect } from "next/navigation";
import { AgentHeader } from "@/components/agent/AgentHeader";
import { AgentsAdmin } from "@/components/agent/AgentsAdmin";
import { AppShell } from "@/components/ui/Header";
import { getAllAgents, getCurrentAgent } from "@/lib/data";
import { getRateInfo, isAdmin } from "@/lib/rates";
import { StaleRateBanner } from "@/components/agent/StaleRateBanner";
import { agentsEnabled } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "Agents · BuyDown Indy" };

export default async function AdminAgentsPage() {
  if (!agentsEnabled) redirect("/agent");
  const me = await getCurrentAgent();
  if (!me) redirect("/agent/login?next=/agent/admin");
  if (!isAdmin(me.email)) notFound();
  return (
    <AppShell header={<AgentHeader admin />}>
      <StaleRateBanner info={await getRateInfo()} />
      <AgentsAdmin agents={await getAllAgents()} />
    </AppShell>
  );
}

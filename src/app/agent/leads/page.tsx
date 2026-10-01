import { notFound, redirect } from "next/navigation";
import { AgentHeader } from "@/components/agent/AgentHeader";
import { LeadsInbox } from "@/components/agent/LeadsInbox";
import { AppShell } from "@/components/ui/Header";
import { getCurrentAgent } from "@/lib/data";
import { isSuperAdmin, listLeads } from "@/lib/leads";
import { agentsEnabled } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leads · BuyDown Indy" };

export default async function LeadsPage() {
  if (!agentsEnabled) redirect("/agent");
  const me = await getCurrentAgent();
  if (!me) redirect("/agent/login?next=/agent/leads");
  if (!isSuperAdmin(me.email)) notFound();
  return (
    <AppShell header={<AgentHeader />}>
      <LeadsInbox leads={await listLeads()} />
    </AppShell>
  );
}

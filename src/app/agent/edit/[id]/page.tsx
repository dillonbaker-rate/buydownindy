import { notFound, redirect } from "next/navigation";
import { AgentHeader } from "@/components/agent/AgentHeader";
import { PostWizard } from "@/components/agent/PostWizard";
import { AppShell } from "@/components/ui/Header";
import { getCurrentAgent, getListing, getRate } from "@/lib/data";
import { supabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit listing · BuyDown Indy" };

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!supabaseConfigured) redirect("/agent");
  const me = await getCurrentAgent();
  if (!me) redirect(`/agent/login?next=/agent/edit/${id}`);
  const [l, rate] = await Promise.all([getListing(id), getRate()]);
  if (!l || l.agentId !== me.userId) notFound();
  return (
    <AppShell header={<AgentHeader />}>
      <PostWizard rate={rate.rate30yr} userId={me.userId} editing={l} />
    </AppShell>
  );
}

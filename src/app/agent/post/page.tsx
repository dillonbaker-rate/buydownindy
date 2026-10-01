import { redirect } from "next/navigation";
import { AgentHeader, SetupNotice } from "@/components/agent/AgentHeader";
import { PostWizard } from "@/components/agent/PostWizard";
import { AppShell } from "@/components/ui/Header";
import { getCurrentAgent } from "@/lib/data";
import { getRateInfo } from "@/lib/rates";
import { supabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "Post a listing · BuyDown Indy" };

export default async function PostPage() {
  if (!supabaseConfigured)
    return (
      <AppShell>
        <SetupNotice />
      </AppShell>
    );
  const me = await getCurrentAgent();
  if (!me) redirect("/agent/login?next=/agent/post");
  if (!me.agent) redirect("/agent");
  const rateInfo = await getRateInfo();
  return (
    <AppShell header={<AgentHeader />}>
      <PostWizard rateInfo={rateInfo} userId={me.userId} />
    </AppShell>
  );
}

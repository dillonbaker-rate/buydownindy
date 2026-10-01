import { redirect } from "next/navigation";
import { SetupNotice } from "@/components/agent/AgentHeader";
import { LoginForm } from "@/components/agent/LoginForm";
import { AppShell } from "@/components/ui/Header";
import { getCurrentAgent } from "@/lib/data";
import { agentsEnabled } from "@/lib/supabase/env";

export const metadata = { title: "Agent sign in · BuyDown Indy" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  if (!agentsEnabled)
    return (
      <AppShell>
        <SetupNotice />
      </AppShell>
    );
  if (await getCurrentAgent()) redirect(next?.startsWith("/agent") ? next : "/agent");
  return (
    <AppShell hideSignIn>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-[460px] p-4 lg:p-8">
          <LoginForm next={next} linkError={!!error} />
        </div>
      </div>
    </AppShell>
  );
}

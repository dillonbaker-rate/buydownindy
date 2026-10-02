import { AgentTermsText } from "@/components/agent/AgentTerms";
import { AppShell } from "@/components/ui/Header";
import { AGENT_TERMS_TITLE } from "@/content/agent-terms";

export const metadata = { title: `${AGENT_TERMS_TITLE} · BuyDown Indy` };

export default function AgentTermsPage() {
  return (
    <AppShell>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex max-w-[680px] flex-col gap-4 p-4 lg:p-8">
          <h1 className="text-[26px] lg:text-[32px]">{AGENT_TERMS_TITLE}</h1>
          <AgentTermsText />
        </div>
      </div>
    </AppShell>
  );
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { AGENT_TERMS_VERSION, needsAgentTerms } from "@/content/agent-terms";
import { isRateAdmin } from "./rates";
import type { Agent } from "./types";

/** Server-side: must this signed-in agent accept the current Agent Terms? Admins (the lender) are exempt. */
export const mustAcceptTerms = (agent: Agent | null | undefined, email?: string | null) => !isRateAdmin(email ?? agent?.email) && needsAgentTerms(agent);

/**
 * Permanent record of each acceptance (agent, version, time), kept even if the profile changes later.
 * Needs migration 0009; until then this quietly does nothing.
 */
export async function logTermsAcceptance(sb: SupabaseClient, agentId: string, email: string | null, acceptedAt: string, req: Request) {
  const { error } = await sb.from("agent_terms_acceptances").insert({
    agent_id: agentId,
    email,
    version: AGENT_TERMS_VERSION,
    accepted_at: acceptedAt,
    user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
  });
  if (error) console.warn("logTermsAcceptance", error.message);
}

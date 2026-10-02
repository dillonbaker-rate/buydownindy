import { needsAgentTerms } from "@/content/agent-terms";
import { isRateAdmin } from "./rates";
import type { Agent } from "./types";

/** Server-side: must this signed-in agent accept the current Agent Terms? Admins (the lender) are exempt. */
export const mustAcceptTerms = (agent: Agent | null | undefined, email?: string | null) => !isRateAdmin(email ?? agent?.email) && needsAgentTerms(agent);

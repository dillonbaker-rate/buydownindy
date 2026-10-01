import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AgentHeader } from "@/components/agent/AgentHeader";
import { WebsiteTools } from "@/components/agent/WebsiteTools";
import { AppShell } from "@/components/ui/Header";
import { getCurrentAgent, getLiveListings, getMyListings } from "@/lib/data";
import { isSuperAdmin } from "@/lib/leads";
import { canUseMarketing, listApiKeys, listingMarketing, marketingEnabled, newsletterHtml } from "@/lib/marketing";
import { longDate } from "@/lib/rate-info";
import { getRateInfo, isAdmin } from "@/lib/rates";
import { agentsEnabled } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "Website & newsletter tools · BuyDown Indy" };

export default async function WebsiteToolsPage() {
  if (!agentsEnabled) redirect("/agent");
  const me = await getCurrentAgent();
  if (!me) redirect("/agent/login?next=/agent/website-tools");
  if (!me.agent) redirect("/agent");
  const admin = isAdmin(me.email) || isSuperAdmin(me.email);
  const [can, enabled, info] = await Promise.all([canUseMarketing(me.email, me.agent), marketingEnabled(), getRateInfo()]);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const now = Date.now();
  // Admins can use any live listing; agents their own.
  const source = admin ? await getLiveListings() : await getMyListings(me.userId);
  const live = source.filter((l) => !l.isSample && l.status === "live" && new Date(l.expiresAt).getTime() > now);
  const listings = can.ok
    ? live.map((l) => ({ id: l.id, label: `${l.address}, ${l.city}`, newsletterHtml: newsletterHtml(listingMarketing(l, info, origin)) }))
    : [];
  const keys = can.ok ? await listApiKeys(me.userId) : [];
  return (
    <AppShell header={<AgentHeader />}>
      <WebsiteTools allowed={can.ok} reason={can.reason} admin={admin} enabled={enabled} listings={listings} keys={keys} origin={origin} asOf={longDate(info.date)} />
    </AppShell>
  );
}

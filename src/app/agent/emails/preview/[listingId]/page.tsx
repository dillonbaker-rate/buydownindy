import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EmailFrame } from "@/components/agent/EmailFrame";
import { SendTestEmail } from "@/components/agent/SendTestEmail";
import { AppShell } from "@/components/ui/Header";
import { handoffEmail } from "@/lib/agent-email";
import { getCurrentAgent, getListing } from "@/lib/data";
import { siteUrl } from "@/lib/email";
import { claimPath, firstName } from "@/lib/handoff";
import { isAdmin } from "@/lib/rates";
import { agentsEnabled } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "Email preview · BuyDown Indy" };

// Admin: what the "listing ready" email looks like for a hidden listing, before (or after) sending it, with a
// "Send me a test" form. Nothing goes to the agent from here.
export default async function EmailPreviewPage({ params }: { params: Promise<{ listingId: string }> }) {
  if (!agentsEnabled) redirect("/agent");
  const me = await getCurrentAgent();
  const { listingId } = await params;
  if (!me) redirect(`/agent/login?next=/agent/emails/preview/${listingId}`);
  if (!isAdmin(me.email)) notFound();
  const l = await getListing(listingId);
  if (!l) notFound();

  const sent = !!l.handoffToken;
  const claimUrl = sent ? `${siteUrl()}${claimPath(l.handoffToken!)}` : `${siteUrl()}/agent/claim/(private link created when you send it)`;
  const e = handoffEmail({ address: l.address, city: l.city, claimUrl, photo: l.photos[0]?.url, firstName: firstName(l.handoffName) });

  return (
    <AppShell
      header={
        <Link href="/agent" className="btn btn-ghost text-[13px] font-semibold">
          <ArrowLeft size={16} />
          My listings
        </Link>
      }
    >
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex max-w-[860px] flex-col gap-3 p-4 lg:p-8">
          <div>
            <div className="text-xs font-semibold text-neutral-700">Preview · nothing goes to the agent from this page</div>
            <h1 className="text-[22px] lg:text-[26px]">{e.subject}</h1>
            <div className="text-[13px] text-neutral-700">
              From BuyDown Indy · To {l.handoffEmail ?? "the agent you choose with Send to agent"}
              {sent ? " · the button opens this listing's current private link" : " · the button's link is created when you send it"}
            </div>
          </div>
          <SendTestEmail listingId={l.id} defaultTo={me.email} />
          <EmailFrame html={e.html} title={e.subject} />
        </div>
      </div>
    </AppShell>
  );
}

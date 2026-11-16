import Link from "next/link";
import { redirect } from "next/navigation";
import { AgentHeader } from "@/components/agent/AgentHeader";
import { ExampleDisclaimer } from "@/components/agent/ExampleDisclaimer";
import { PhotoOrPlaceholder } from "@/components/listing/ListingCard";
import { AppShell } from "@/components/ui/Header";
import { kUsd, usd } from "@/lib/buydown";
import { getCurrentAgent } from "@/lib/data";
import { adminHiddenListings, exampleListings } from "@/lib/examples";
import { isAdmin } from "@/lib/rates";
import { agentsEnabled } from "@/lib/supabase/env";
import type { Listing } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hidden listings · BuyDown Indy", robots: { index: false, follow: false } };

const when = (iso: string) => new Date(iso).toLocaleDateString("en-US", { timeZone: "America/Indiana/Indianapolis", month: "short", day: "numeric" });

function Card({ l, href, children }: { l: Listing; href: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-[18px] border border-divider bg-bg">
      <Link href={href} className="relative block aspect-[4/3] bg-neutral-300 text-neutral-600" aria-label={`Open ${l.address}`}>
        <PhotoOrPlaceholder url={l.photos[0]?.url} alt="" iconSize={28} />
        <span className="tag tag-accent absolute top-2.5 left-2.5 font-semibold">{kUsd(l.concession)} from seller</span>
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <Link href={href} className="text-base font-bold text-ink no-underline">
          {l.address}, {l.city}
        </Link>
        <div className="text-[13px] text-neutral-700">
          {usd(l.price)} · {l.beds} bd · {l.baths} ba · {l.sqft.toLocaleString("en-US")} sq ft
        </div>
        {children}
      </div>
    </div>
  );
}

// Hidden (not on the map) listings. Admins: every one, with who it was sent to. Agents: the same homes as examples,
// without who they were sent to, so they can see how listings are presented and which homes are being worked.
export default async function ExamplesPage() {
  if (!agentsEnabled) redirect("/agent");
  const me = await getCurrentAgent();
  if (!me) redirect("/agent/login?next=/agent/examples");
  if (!me.agent) redirect("/agent");
  const admin = isAdmin(me.email);
  const list = admin ? await adminHiddenListings() : await exampleListings();

  return (
    <AppShell header={<AgentHeader admin={admin} />}>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-[1080px] p-4 lg:p-8">
          <div className="mb-4">
            <h1 className="text-[26px] lg:text-[32px]">{admin ? "Hidden listings" : "Example listings"}</h1>
            <div className="text-[13px] text-neutral-700">
              {admin
                ? "Every hidden listing, sent or not. Agents see these as examples without who they were sent to."
                : "Homes being set up on BuyDown Indy, not on the map yet. See how a concession is shown to buyers, and what's coming in your area."}
            </div>
          </div>
          {!admin && <ExampleDisclaimer className="mb-5" />}

          {list === null ? (
            <p className="text-sm text-neutral-700">Examples aren&apos;t available yet. Check back soon.</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-neutral-700">No hidden listings right now.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((l) =>
                admin ? (
                  <Card key={l.id} l={l} href={`/listing/${l.id}`}>
                    <div className="text-[13px] text-neutral-700">
                      {l.handoffToken ? (
                        <>
                          Sent to <strong className="text-ink">{l.handoffName || l.handoffEmail}</strong>
                          {l.handoffSentAt ? ` · ${when(l.handoffSentAt)}` : ""}
                        </>
                      ) : l.handoffEmail || l.handoffName ? (
                        <>
                          For <strong className="text-ink">{l.handoffName || l.handoffEmail}</strong> · not sent yet
                        </>
                      ) : (
                        "Not sent yet"
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Link href={`/agent/edit/${l.id}`} className="btn btn-secondary min-h-9 px-3 text-[12px]">
                        Edit
                      </Link>
                      <Link href={`/agent/emails/preview/${l.id}`} className="btn btn-secondary min-h-9 px-3 text-[12px]">
                        Preview email
                      </Link>
                      <Link href={`/agent/examples/${l.id}`} className="btn btn-ghost min-h-9 px-3 text-[12px]">
                        As agents see it
                      </Link>
                    </div>
                  </Card>
                ) : (
                  <Card key={l.id} l={l} href={`/agent/examples/${l.id}`} />
                ),
              )}
            </div>
          )}
          {admin && <p className="mt-5 text-xs text-neutral-700">Send hidden listings to agents from My listings (Send to agent).</p>}
        </div>
      </div>
    </AppShell>
  );
}

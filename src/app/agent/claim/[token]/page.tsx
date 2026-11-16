import Link from "next/link";
import { ClaimPanel, type ClaimState } from "@/components/agent/ClaimPanel";
import { ListingView } from "@/components/listing/ListingView";
import { AppShell } from "@/components/ui/Header";
import { getCurrentAgent } from "@/lib/data";
import { getListingByHandoff } from "@/lib/handoff";
import { getRateInfo } from "@/lib/rates";
import { agentsEnabled } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your listing · BuyDown Indy", robots: { index: false, follow: false } };

// Private page for a hidden listing an admin sent to an agent. Anyone with the link can preview it;
// only the agent it was sent to (matched on sign-in email) can take it live.
export default async function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [listing, rateInfo, me] = await Promise.all([
    getListingByHandoff(token),
    getRateInfo(),
    agentsEnabled ? getCurrentAgent().catch(() => null) : Promise.resolve(null),
  ]);

  if (!listing)
    return (
      <AppShell>
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="mx-auto flex max-w-[560px] flex-col gap-2.5 p-4 lg:p-8">
            <h1 className="text-[26px]">This link isn&apos;t active</h1>
            <p className="m-0 text-sm text-neutral-700">
              The listing has already been taken live, or the link was replaced with a newer one. If it&apos;s yours, check My listings.
            </p>
            <Link href="/agent" className="btn btn-primary self-start">
              Go to My listings
            </Link>
          </div>
        </div>
      </AppShell>
    );

  const sentTo = listing.handoffEmail ?? null;
  const state: ClaimState = !me
    ? "signed-out"
    : sentTo && me.email.toLowerCase() !== sentTo.toLowerCase()
      ? "wrong-email"
      : !me.agent
        ? "no-profile"
        : "ready";

  // Show it the way buyers will see it once it's theirs.
  const shown = {
    ...listing,
    agentName: me?.agent?.name ?? "Your name",
    brokerage: me?.agent?.brokerage ?? "Your brokerage",
    agentPhotoUrl: me?.agent?.photoUrl ?? null,
    agentVerified: me?.agent?.verificationStatus === "verified",
    agentPhone: null,
    agentEmail: null,
  };

  return (
    <AppShell mobileNav={false}>
      <ClaimPanel token={token} state={state} address={listing.address} sentTo={sentTo} signedInAs={me?.email ?? null} />
      <ListingView listing={shown} rateInfo={rateInfo} preview />
    </AppShell>
  );
}

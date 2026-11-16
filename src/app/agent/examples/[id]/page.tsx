import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ExampleDisclaimer } from "@/components/agent/ExampleDisclaimer";
import { ListingView } from "@/components/listing/ListingView";
import { AppShell } from "@/components/ui/Header";
import { getCurrentAgent } from "@/lib/data";
import { exampleListing } from "@/lib/examples";
import { getRateInfo } from "@/lib/rates";
import { agentsEnabled } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "Example listing · BuyDown Indy", robots: { index: false, follow: false } };

// One hidden listing shown to a signed-in agent as an example: no listing agent, no sharing, with the disclaimer.
export default async function ExampleListingPage({ params }: { params: Promise<{ id: string }> }) {
  if (!agentsEnabled) redirect("/agent");
  const { id } = await params;
  const me = await getCurrentAgent();
  if (!me) redirect(`/agent/login?next=/agent/examples/${id}`);
  if (!me.agent) redirect("/agent");
  const [l, rateInfo] = await Promise.all([exampleListing(id), getRateInfo()]);
  if (!l) notFound();

  return (
    <AppShell
      mobileNav={false}
      header={
        <Link href="/agent/examples" className="btn btn-ghost text-[13px] font-semibold">
          <ArrowLeft size={16} />
          Examples
        </Link>
      }
    >
      <div className="flex-none border-b border-divider px-4 py-3 lg:px-8">
        <ExampleDisclaimer className="mx-auto max-w-[1080px]" />
      </div>
      {/* isSample: shows the "Sample" tag and leaves out the listing agent card. */}
      <ListingView listing={{ ...l, isSample: true }} rateInfo={rateInfo} preview="This is an example listing. Contact the listing agent for this home." />
    </AppShell>
  );
}

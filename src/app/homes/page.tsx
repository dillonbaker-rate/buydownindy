import Link from "next/link";
import { MapScreen } from "@/components/map/MapScreen";
import { AppShell } from "@/components/ui/Header";
import { getCurrentAgent, getLiveListings } from "@/lib/data";
import { adminHiddenListings, exampleListings } from "@/lib/examples";
import { isAdmin } from "@/lib/rates";
import { getRateInfo } from "@/lib/rates";
import { parseArea } from "@/lib/areas";

export const dynamic = "force-dynamic";

export const metadata = { title: "Homes · BuyDown Indy" };

export default async function Homes({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const area = parseArea((await searchParams).area);
  const [listings, rateInfo, me] = await Promise.all([getLiveListings(), getRateInfo(), getCurrentAgent().catch(() => null)]);
  // Signed-in agents also see hidden listings on the map (admins: all of them; agents: as examples). Never the public.
  const admin = !!me && isAdmin(me.email);
  const hidden = !me?.agent ? [] : admin ? await adminHiddenListings().catch(() => []) : ((await exampleListings().catch(() => null)) ?? []);
  return (
    <AppShell
      header={
        // Signed out: the header shows only "Agent sign in". Signed in: a shortcut to post (desktop).
        me ? (
          <Link href="/agent/post" className="btn btn-ghost hidden text-[13px] font-semibold sm:inline-flex">
            Post a listing
          </Link>
        ) : null
      }
    >
      <MapScreen
        listings={listings}
        hidden={hidden.length ? { listings: hidden, admin } : undefined}
        rateInfo={rateInfo}
        area={area}
        key={area ? `${area.kind}:${area.value}` : "all"}
      />
    </AppShell>
  );
}

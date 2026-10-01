import Link from "next/link";
import { MapScreen } from "@/components/map/MapScreen";
import { AppShell } from "@/components/ui/Header";
import { cookies } from "next/headers";
import { getCurrentAgent, getLiveListings } from "@/lib/data";
import { INVITE_COOKIE, openInvite } from "@/lib/invites";
import { getRateInfo } from "@/lib/rates";
import { parseArea } from "@/lib/areas";

export const dynamic = "force-dynamic";

export const metadata = { title: "Homes · BuyDown Indy" };

export default async function Homes({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const area = parseArea((await searchParams).area);
  const code = (await cookies()).get(INVITE_COOKIE)?.value;
  const [listings, rateInfo, invite, me] = await Promise.all([
    getLiveListings(),
    getRateInfo(),
    code ? openInvite(code, false) : null,
    getCurrentAgent().catch(() => null),
  ]);
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
      <MapScreen listings={listings} rateInfo={rateInfo} invite={invite} area={area} key={area ? `${area.kind}:${area.value}` : "all"} />
    </AppShell>
  );
}

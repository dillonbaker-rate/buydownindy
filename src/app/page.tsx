import Link from "next/link";
import { MapScreen } from "@/components/map/MapScreen";
import { AppShell } from "@/components/ui/Header";
import { cookies } from "next/headers";
import { getCurrentAgent, getLiveListings } from "@/lib/data";
import { INVITE_COOKIE, openInvite } from "@/lib/invites";
import { getRateInfo } from "@/lib/rates";

export const dynamic = "force-dynamic";

export default async function Home() {
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
      <MapScreen listings={listings} rateInfo={rateInfo} invite={invite} />
    </AppShell>
  );
}

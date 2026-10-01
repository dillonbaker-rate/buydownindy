import Link from "next/link";
import { MapScreen } from "@/components/map/MapScreen";
import { AppShell } from "@/components/ui/Header";
import { cookies } from "next/headers";
import { getLiveListings } from "@/lib/data";
import { INVITE_COOKIE, openInvite } from "@/lib/invites";
import { getRateInfo } from "@/lib/rates";

export const dynamic = "force-dynamic";

export default async function Home() {
  const code = (await cookies()).get(INVITE_COOKIE)?.value;
  const [listings, rateInfo, invite] = await Promise.all([
    getLiveListings(),
    getRateInfo(),
    code ? openInvite(code, false) : null,
  ]);
  return (
    <AppShell
      header={
        <Link href="/agent/post" className="btn btn-ghost text-[13px] font-semibold">
          Agents: post a listing
        </Link>
      }
    >
      <MapScreen listings={listings} rateInfo={rateInfo} invite={invite} />
    </AppShell>
  );
}

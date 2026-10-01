import Link from "next/link";
import { MapScreen } from "@/components/map/MapScreen";
import { AppShell } from "@/components/ui/Header";
import { getLiveListings } from "@/lib/data";
import { getRateInfo } from "@/lib/rates";

export const revalidate = 60;

export default async function Home() {
  const [listings, rateInfo] = await Promise.all([getLiveListings(), getRateInfo()]);
  return (
    <AppShell
      header={
        <Link href="/agent/post" className="btn btn-ghost text-[13px] font-semibold">
          Agents: post a listing
        </Link>
      }
    >
      <MapScreen listings={listings} rateInfo={rateInfo} />
    </AppShell>
  );
}

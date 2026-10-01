import Link from "next/link";
import { MapScreen } from "@/components/map/MapScreen";
import { AppShell } from "@/components/ui/Header";
import { getLiveListings, getRate } from "@/lib/data";

export const revalidate = 60;

export default async function Home() {
  const [listings, rate] = await Promise.all([getLiveListings(), getRate()]);
  return (
    <AppShell
      header={
        <Link href="/agent/post" className="btn btn-ghost text-[13px] font-semibold">
          Agents: post a listing
        </Link>
      }
    >
      <MapScreen listings={listings} rate={rate.rate30yr} />
    </AppShell>
  );
}

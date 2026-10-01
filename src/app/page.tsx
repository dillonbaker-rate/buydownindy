import { AreaSearch } from "@/components/search/AreaSearch";
import { AppShell } from "@/components/ui/Header";
import { getLiveListings } from "@/lib/data";

export const dynamic = "force-dynamic";

// Landing: a full-screen search by city, county, or ZIP, leading to the map for that area.
export default async function Home() {
  const listings = await getLiveListings();
  const zips = [...new Set(listings.map((l) => l.zip).filter((z): z is string => !!z))];
  return (
    <AppShell>
      <AreaSearch listingZips={zips} count={listings.length} />
    </AppShell>
  );
}

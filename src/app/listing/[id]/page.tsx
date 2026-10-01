import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingView } from "@/components/listing/ListingView";
import { AppShell } from "@/components/ui/Header";
import { kUsd, LOAN_TYPES, usd, type LoanType } from "@/lib/buydown";
import { getListing } from "@/lib/data";
import { shareSummary } from "@/lib/share";
import { getRateInfo } from "@/lib/rates";

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ type?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const [l, rateInfo] = await Promise.all([getListing((await params).id), getRateInfo()]);
  if (!l) return { title: "Listing not found · BuyDown Indy" };
  const s = shareSummary(l, rateInfo);
  const title = `${l.address}, ${l.city} · ${kUsd(l.concession)} seller concession`;
  const description = `${usd(l.price)} · ${l.beds} bd · ${l.baths} ba. Seller pays ${usd(l.concession)}: ${s.deal}.`;
  // Link previews (iMessage, Facebook, email) show the cover photo, price and concession.
  const images = [
    l.photos[0]?.url ? { url: l.photos[0].url, alt: `${l.address}, ${l.city}` } : { url: "/search-bg.jpg", alt: "BuyDown Indy" },
  ];
  return {
    title: `${title} · BuyDown Indy`,
    description,
    openGraph: { type: "website", siteName: "BuyDown Indy", title, description, images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export default async function ListingPage({ params, searchParams }: Params) {
  const [{ id }, { type }] = await Promise.all([params, searchParams]);
  const [l, rateInfo] = await Promise.all([getListing(id), getRateInfo()]);
  if (!l) notFound();
  const preferred = LOAN_TYPES.includes(type as LoanType) ? (type as LoanType) : undefined;
  return (
    <AppShell
      header={
        <Link href="/homes" className="btn btn-ghost text-[13px] font-semibold">
          <ArrowLeft size={16} />
          <span>
            Back<span className="hidden sm:inline"> to map</span>
          </span>
        </Link>
      }
    >
      <ListingView listing={l} rateInfo={rateInfo} preferredType={preferred} />
    </AppShell>
  );
}

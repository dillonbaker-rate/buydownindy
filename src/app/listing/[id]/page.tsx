import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingView } from "@/components/listing/ListingView";
import { AppShell } from "@/components/ui/Header";
import { kUsd, LOAN_TYPES, usd, type LoanType } from "@/lib/buydown";
import { getListing } from "@/lib/data";
import { getRateInfo } from "@/lib/rates";

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ type?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const l = await getListing((await params).id);
  if (!l) return { title: "Listing not found · BuyDown Indy" };
  return {
    title: `${l.address}, ${l.city} · ${kUsd(l.concession)} seller concession · BuyDown Indy`,
    description: `${usd(l.price)} · ${l.beds} bd · ${l.baths} ba. See what a ${usd(l.concession)} seller concession does as a buydown compared with a price cut.`,
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

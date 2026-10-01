import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { LenderQuiz } from "@/components/lender/LenderQuiz";
import { AppShell } from "@/components/ui/Header";
import { getListing } from "@/lib/data";

export const metadata = { title: "Talk to a lender · BuyDown Indy" };

type Props = { searchParams: Promise<{ listing?: string; topic?: string }> };

export default async function TalkToALender({ searchParams }: Props) {
  const { listing: id, topic } = await searchParams;
  const l = id ? await getListing(id) : null;
  const back = l ? `/listing/${l.id}` : "/";
  return (
    <AppShell
      header={
        <Link href={back} className="btn btn-ghost text-[13px] font-semibold">
          <ArrowLeft size={16} />
          {l ? "Back to listing" : "Back to map"}
        </Link>
      }
    >
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-[560px] p-4 lg:p-8">
          <LenderQuiz
            listing={l ? { id: l.id, address: l.address, city: l.city, price: l.price, concession: l.concession } : null}
            topic={topic === "points" ? "points" : "general"}
          />
        </div>
      </div>
    </AppShell>
  );
}

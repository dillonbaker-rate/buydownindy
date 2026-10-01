/* eslint-disable @next/next/no-img-element */
import { headers } from "next/headers";
import { getListing } from "@/lib/data";
import { marketingEnabled, listingMarketing } from "@/lib/marketing";
import { getRateInfo, isAdmin } from "@/lib/rates";

export const dynamic = "force-dynamic";
export const metadata = { title: "BuyDown Indy", robots: { index: false } };

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

// Embeddable widget for agents' websites: <iframe src="/embed/listing/:id">. Always uses today's numbers.
export default async function EmbedListing({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [l, info, enabled] = await Promise.all([getListing(id), getRateInfo(), marketingEnabled()]);
  const allowed = !!l && l.status === "live" && (enabled || isAdmin(l.agentEmail));
  if (!l || !allowed) {
    return <div style={{ padding: 16, fontSize: 14, color: "#5a636e" }}>This home isn&apos;t available right now.</div>;
  }
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const m = listingMarketing(l, info, origin);
  const best = m.payments.best;
  return (
    <div className="min-h-dvh bg-bg p-3 text-ink">
      <a href={m.links.listing} target="_blank" rel="noopener" className="block overflow-hidden rounded-[18px] border border-divider text-ink no-underline hover:text-ink">
        <div className="flex gap-3 p-3">
          {m.photo && <img src={m.photo} alt="" className="h-20 w-28 flex-none rounded-[12px] object-cover" />}
          <div className="min-w-0">
            <div className="text-lg leading-tight font-bold">{money(m.price)}</div>
            <div className="truncate text-[13px] text-neutral-700">
              {m.address}, {m.city}
            </div>
            <span className="tag mt-1 bg-accent font-semibold text-white">{m.concessionShort} from the seller</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 bg-accent-100 p-3">
          <div>
            <div className="text-[12px] font-semibold">{m.concessionShort} price cut</div>
            <div className="text-[22px] leading-tight font-bold">{money(m.payments.priceCut)}/mo</div>
            <div className="text-[11px] text-neutral-700">saves {money(m.payments.priceCutSavings)}/mo</div>
          </div>
          <div className="rounded-[12px] bg-bg p-2 shadow-sm">
            <div className="text-[12px] font-semibold">{best ? `${best.option}, year 1` : "Closing cost credit"}</div>
            <div className="text-[22px] leading-tight font-bold text-accent">{best ? `${money(best.year1)}/mo` : money(m.concession)}</div>
            <div className="text-[11px] font-semibold text-accent-700">{best ? `saves ${money(best.savings)}/mo` : "toward closing costs"}</div>
          </div>
        </div>
        <div className="px-3 pt-2 pb-1 text-[13px] font-semibold text-accent-700">See all the options →</div>
        <p className="m-0 px-3 pb-3 text-[10px] leading-snug text-neutral-700">{m.disclaimer}</p>
      </a>
    </div>
  );
}

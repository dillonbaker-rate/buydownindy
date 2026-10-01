"use client";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PhotoOrPlaceholder } from "@/components/listing/ListingCard";
import { useToast } from "@/components/ui/Toast";
import { usd } from "@/lib/buydown";
import { daysLeft } from "@/lib/format";
import type { Agent, Listing } from "@/lib/types";

type Action = "renew" | "pending" | "sold" | "live";

function statusOf(l: Listing) {
  if (l.status === "sold") return { label: "Sold", bg: "var(--color-neutral-200)", fg: "var(--color-neutral-800)" };
  if (l.status === "pending") return { label: "Pending", bg: "var(--color-ink)", fg: "#fff" };
  const d = daysLeft(l.expiresAt);
  if (d === 0) return { label: "Expired", bg: "var(--color-warn-tag)", fg: "var(--color-warn-text)" };
  if (d <= 7) return { label: `Expires in ${d} day${d === 1 ? "" : "s"}`, bg: "var(--color-warn-tag)", fg: "var(--color-warn-text)" };
  return { label: `Live · ${d} days left`, bg: "var(--color-accent-100)", fg: "var(--color-accent-800)" };
}

export function Dashboard({ agent, listings }: { agent: Agent; listings: Listing[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (l: Listing, action: Action) => {
    setBusy(l.id + action);
    const res = await fetch(`/api/listings/${l.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(null);
    if (!res.ok) {
      toast("Couldn't update that listing. Try again.");
      return;
    }
    if (action === "renew") toast(`${l.address} renewed for 30 days.`);
    router.refresh();
  };

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="mx-auto max-w-[1080px] p-4 lg:p-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[26px] lg:text-[32px]">My listings</h1>
            <div className="text-[13px] text-neutral-700">
              {agent.name} · {agent.brokerage}
            </div>
          </div>
          <Link href="/agent/post" className="btn btn-primary">
            <Plus size={16} />
            Post a listing
          </Link>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-3">
          {["Listing views", "Buyer leads"].map((t) => (
            <div key={t} className="rounded-[18px] bg-surface p-4">
              <div className="text-xs text-neutral-700">{t}</div>
              <div className="text-[28px] font-bold text-neutral-500">—</div>
              <div className="text-[11px] text-neutral-700">Coming in Phase 2</div>
            </div>
          ))}
        </div>

        {listings.length ? (
          listings.map((l) => {
            const st = statusOf(l);
            const btn = (label: string, action: Action) => (
              <button
                key={action}
                className="btn btn-secondary min-h-10 text-[13px]"
                disabled={busy != null}
                onClick={() => act(l, action)}
              >
                {busy === l.id + action ? "…" : label}
              </button>
            );
            return (
              <div
                key={l.id}
                className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 border-b border-divider py-4 lg:grid-cols-[96px_minmax(0,1fr)_auto]"
              >
                <Link
                  href={`/listing/${l.id}`}
                  aria-label="Open listing"
                  className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-[14px] bg-neutral-300 text-neutral-600"
                >
                  <PhotoOrPlaceholder url={l.photos[0]?.url} alt="" iconSize={20} />
                </Link>
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold">
                      {l.address}, {l.city}
                    </span>
                    <span className="tag font-semibold" style={{ background: st.bg, color: st.fg }}>
                      {st.label}
                    </span>
                  </div>
                  <div className="text-[13px] text-neutral-700">
                    {usd(l.price)} · {usd(l.concession)} seller concession
                  </div>
                </div>
                <div className="col-span-full flex flex-wrap gap-1.5 lg:col-span-1">
                  {l.status !== "sold" && btn("Renew", "renew")}
                  <Link href={`/agent/edit/${l.id}`} className="btn btn-secondary min-h-10 text-[13px]">
                    Edit
                  </Link>
                  {l.status === "live" && btn("Mark pending", "pending")}
                  {l.status === "pending" && [btn("Mark sold", "sold"), btn("Back to live", "live")]}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-start gap-2.5 py-8">
            <div className="text-[22px] font-bold">No listings yet</div>
            <p className="m-0 max-w-[460px] text-sm text-pretty text-neutral-700">
              Post a listing with a seller concession. Buyers will see what it does for their monthly payment compared with a price cut.
            </p>
            <Link href="/agent/post" className="btn btn-primary">
              <Plus size={16} />
              Post your first listing
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

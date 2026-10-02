"use client";
import { Download, Image as ImageIcon, PartyPopper, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PhotoOrPlaceholder } from "@/components/listing/ListingCard";
import { useToast } from "@/components/ui/Toast";
import { usd } from "@/lib/buydown";
import { daysLeft } from "@/lib/format";
import type { Agent, Listing } from "@/lib/types";
import { VerificationBadge } from "./AgentProfileForm";

type Action = "renew" | "pending" | "sold" | "live";

function statusOf(l: Listing) {
  if (l.status === "sold") return { label: "Sold", bg: "var(--color-neutral-200)", fg: "var(--color-neutral-800)" };
  if (l.status === "pending") return { label: "Pending", bg: "var(--color-ink)", fg: "#fff" };
  const d = daysLeft(l.expiresAt);
  if (d === 0) return { label: "Expired", bg: "var(--color-warn-tag)", fg: "var(--color-warn-text)" };
  if (d <= 7) return { label: `Expires in ${d} day${d === 1 ? "" : "s"}`, bg: "var(--color-warn-tag)", fg: "var(--color-warn-text)" };
  return { label: `Live · ${d} days left`, bg: "var(--color-accent-100)", fg: "var(--color-accent-800)" };
}

export function Dashboard({
  agent,
  listings,
  isAdmin = false,
  posted,
}: {
  agent: Agent;
  listings: Listing[];
  /** Admins (the lender) don't hold a real estate license, so skip the license prompt. */
  isAdmin?: boolean;
  /** Id of a listing that was just posted: show its flyer. */
  posted?: string;
}) {
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

  const remove = async (l: Listing) => {
    if (!confirm(`Delete ${l.address}? It comes off the map right away and can't be undone.`)) return;
    setBusy(l.id + "delete");
    const res = await fetch(`/api/listings/${l.id}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) {
      toast((await res.json().catch(() => ({}))).error ?? "Couldn't delete that listing. Try again.");
      return;
    }
    toast(`${l.address} deleted.`);
    router.refresh();
  };

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="mx-auto max-w-[1080px] p-4 lg:p-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/agent/profile" aria-label="My profile" className="relative grid h-14 w-14 flex-none place-items-center overflow-hidden rounded-full bg-neutral-300 text-neutral-600">
              {agent.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={agent.photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-lg font-bold">{agent.name.slice(0, 1)}</span>
              )}
            </Link>
            <div>
              <h1 className="text-[26px] lg:text-[32px]">My listings</h1>
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-neutral-700">
                <span>
                  {agent.name} · {agent.brokerage}
                </span>
                <VerificationBadge status={agent.verificationStatus} />
              </div>
            </div>
          </div>
          <Link href="/agent/post" className="btn btn-primary">
            <Plus size={16} />
            Post a listing
          </Link>
        </div>
        {!agent.licenseNumber && !isAdmin && (
          <Link
            href="/agent/profile"
            className="mb-4 flex items-center justify-between gap-3 rounded-[18px] p-4 text-sm text-ink no-underline"
            style={{ background: "var(--color-warn-bg)", border: "1px solid var(--color-warn-border)" }}
          >
            <span>
              <strong>Finish your profile.</strong> Add your headshot and Indiana license number so buyers see a verified agent.
            </span>
            <span className="font-semibold text-accent-700">Update profile →</span>
          </Link>
        )}
        {(() => {
          const l = listings.find((x) => x.id === posted && x.status === "live");
          return l ? <FlyerReady listing={l} onClose={() => router.replace("/agent")} /> : null;
        })()}

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
                  {l.status === "live" && (
                    <Link href={`/listing/${l.id}?share=1`} className="btn btn-secondary min-h-10 text-[13px]">
                      <ImageIcon size={14} />
                      Flyer
                    </Link>
                  )}
                  {l.status === "live" && btn("Mark pending", "pending")}
                  {l.status === "pending" && [btn("Mark sold", "sold"), btn("Back to live", "live")]}
                  <button className="btn btn-ghost min-h-10 text-[13px] text-warn-text" disabled={busy != null} onClick={() => remove(l)}>
                    <Trash2 size={14} />
                    {busy === l.id + "delete" ? "…" : "Delete"}
                  </button>
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

/** Shown right after posting: the listing's ready-made flyer and social graphics. */
function FlyerReady({ listing: l, onClose }: { listing: Listing; onClose: () => void }) {
  const src = (size: string) => `/api/share/${encodeURIComponent(l.id)}?size=${size}&design=0`;
  const dl = (size: string, label: string) => (
    <a href={`${src(size)}&download=1`} download className="btn btn-secondary min-h-10 text-[13px]">
      <Download size={14} />
      {label}
    </a>
  );
  return (
    <section className="relative mb-4 grid gap-4 rounded-[20px] border border-accent-300 bg-accent-100 p-4 sm:grid-cols-[160px_minmax(0,1fr)] lg:p-5">
      <button type="button" onClick={onClose} aria-label="Dismiss" className="absolute top-2 right-2 grid h-9 w-9 cursor-pointer place-items-center rounded-full hover:bg-bg">
        <X size={16} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src("post")} alt={`Social graphic for ${l.address}`} className="w-[160px] rounded-[12px] bg-neutral-200 shadow-md" style={{ aspectRatio: "4 / 5" }} />
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2 text-[19px] font-bold">
          <PartyPopper size={20} className="text-accent" />
          Your flyer is ready
        </div>
        <p className="m-0 max-w-[560px] text-sm text-neutral-800">
          {l.address} is live. We made a printable flyer and social graphics with today&apos;s buydown numbers, your headshot, and the
          required disclosures. They update with each day&apos;s rate, so download a fresh one before you post.
        </p>
        <div className="flex flex-wrap gap-2">
          {dl("flyer", "Printable flyer")}
          {dl("post", "Instagram post")}
          {dl("story", "Story")}
          <Link href={`/listing/${l.id}?share=1`} className="btn btn-primary min-h-10 text-[13px]">
            More designs &amp; sharing
          </Link>
        </div>
      </div>
    </section>
  );
}

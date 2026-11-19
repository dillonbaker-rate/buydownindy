"use client";
import { EyeOff, Link2, Mail, Plus, Search, Send, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PhotoOrPlaceholder } from "@/components/listing/ListingCard";
import { useToast } from "@/components/ui/Toast";
import { usd } from "@/lib/buydown";
import { daysLeft } from "@/lib/format";
import type { Agent, Listing } from "@/lib/types";
import { VerificationBadge } from "./AgentProfileForm";

type Action = "renew" | "pending" | "sold" | "live" | "draft";
export type Handoff = { token: string; address: string; city: string };

function statusOf(l: Listing) {
  if (l.status === "draft") {
    const who = l.handoffName || l.handoffEmail;
    const label = l.handoffToken ? `Hidden · sent to ${l.handoffEmail}` : who ? `Hidden · for ${who}, not sent yet` : "Hidden · not on the map";
    return { label, bg: "var(--color-neutral-200)", fg: "var(--color-neutral-800)" };
  }
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
  handoffs = [],
}: {
  agent: Agent;
  listings: Listing[];
  /** Admins (the lender) don't hold a real estate license, so skip the license prompt. */
  isAdmin?: boolean;
  /** Hidden listings an admin sent to this agent's email, waiting to be taken live. */
  handoffs?: Handoff[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [show, setShow] = useState<"all" | "hidden" | "live">("all");

  // Search by address, city or ZIP, or by the agent (saved name/email on hidden listings, or the listing agent).
  const counts = useMemo(
    () => ({ all: listings.length, hidden: listings.filter((l) => l.status === "draft").length, live: listings.filter((l) => l.status !== "draft").length }),
    [listings],
  );
  const shown = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return listings.filter((l) => {
      if (show === "hidden" && l.status !== "draft") return false;
      if (show === "live" && l.status === "draft") return false;
      if (!words.length) return true;
      const hay = [l.address, l.city, l.zip, l.county, l.handoffName, l.handoffEmail, l.agentName].filter(Boolean).join(" ").toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [listings, q, show]);

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
    if (action === "draft") toast(`${l.address} is hidden. It's off the map.`);
    if (action === "live" && l.status === "draft") toast(`${l.address} is on the map now.`);
    router.refresh();
  };

  const copy = async (path: string) => {
    try {
      await navigator.clipboard.writeText(`${location.origin}${path}`);
      toast("Link copied. Text it to the agent, or paste it anywhere.");
    } catch {
      prompt("Copy this link:", `${location.origin}${path}`);
    }
  };

  /** Admin: email a hidden listing's private link to an agent. One click when the agent was saved with the listing. */
  const sendToAgent = async (l: Listing) => {
    let email = l.handoffEmail ?? "";
    let name = l.handoffName ?? "";
    const saved = !!email && !l.handoffToken;
    const who = name ? `${name} (${email})` : email;
    if (!saved || !confirm(`Send ${l.address} to ${who}?\n\nOK sends it now. Cancel lets you change who it goes to.`)) {
      const typed = prompt(
        `Send ${l.address} to which agent? Enter their email. They'll get a private link, and once they make an account with this email they can take it live.`,
        email,
      );
      if (!typed?.trim()) return;
      const typedName = prompt("Their name? (For \"Hey Jane,\" in the email. Leave blank for \"Hey there,\".)", name);
      if (typedName === null) return;
      email = typed;
      name = typedName;
    }
    setBusy(l.id + "send");
    const res = await fetch(`/api/listings/${l.id}/handoff`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: email.trim(), ...(name.trim() ? { name: name.trim() } : {}) }),
    });
    setBusy(null);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return toast(j.error ?? "Couldn't send it. Try again.");
    toast(`Sent to ${email.trim()}.`);
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

        {handoffs.map((h) => (
          <Link
            key={h.token}
            href={`/agent/claim/${h.token}`}
            className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-accent-100 p-4 text-sm text-ink no-underline"
          >
            <span>
              <strong>A listing is ready for you:</strong> {h.address}, {h.city}. Review it and take it live under your name.
            </span>
            <span className="font-semibold text-accent-700">Review listing →</span>
          </Link>
        ))}

        {listings.length ? (
          <>
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Search your listings</span>
                <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-600" />
                <input
                  type="text"
                  enterKeyHint="search"
                  className="input w-full"
                  style={{ paddingLeft: 36, paddingRight: 40 }}
                  placeholder="Search by address, city, ZIP or agent"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                {q && (
                  <button type="button" aria-label="Clear search" onClick={() => setQ("")} className="absolute top-1/2 right-2 grid h-8 w-8 -translate-y-1/2 cursor-pointer place-items-center">
                    <X size={15} />
                  </button>
                )}
              </label>
              <div className="flex gap-1.5">
                {(
                  [
                    ["all", "All"],
                    ["hidden", "Hidden"],
                    ["live", "On the map"],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={show === k}
                    onClick={() => setShow(k)}
                    className={`btn min-h-10 px-3 text-[13px] ${show === k ? "btn-primary" : "btn-secondary"}`}
                  >
                    {label} <span className="opacity-75">{counts[k]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-1 text-xs text-neutral-700">
              {shown.length === listings.length ? `${listings.length} listing${listings.length === 1 ? "" : "s"}` : `Showing ${shown.length} of ${listings.length}`}
            </div>
            {shown.length === 0 && <p className="py-6 text-sm text-neutral-700">No listings match{q ? ` "${q}"` : ""}.</p>}
            {shown.map((l) => {
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
                  {l.status === "draft" && (
                    <>
                      <button className="btn btn-primary min-h-10 text-[13px]" disabled={busy != null} onClick={() => sendToAgent(l)}>
                        <Send size={14} />
                        {busy === l.id + "send"
                          ? "…"
                          : l.handoffToken
                            ? "Send again"
                            : l.handoffEmail
                              ? `Send to ${l.handoffName?.trim().split(/\s+/)[0] || "agent"}`
                              : "Send to agent"}
                      </button>
                      {l.handoffToken && (
                        <button className="btn btn-secondary min-h-10 text-[13px]" onClick={() => copy(`/agent/claim/${l.handoffToken}`)}>
                          <Link2 size={14} />
                          Copy link
                        </button>
                      )}
                      <Link href={`/agent/emails/preview/${l.id}`} className="btn btn-secondary min-h-10 text-[13px]">
                        <Mail size={14} />
                        Preview email
                      </Link>
                    </>
                  )}
                  {l.status !== "sold" && l.status !== "draft" && btn("Renew", "renew")}
                  <Link href={`/agent/edit/${l.id}`} className="btn btn-secondary min-h-10 text-[13px]">
                    Edit
                  </Link>
                  {l.status === "draft" && btn("Put on map", "live")}
                  {l.status === "live" && btn("Mark pending", "pending")}
                  {l.status === "pending" && [btn("Mark sold", "sold"), btn("Back to live", "live")]}
                  {isAdmin && (l.status === "live" || l.status === "pending") && (
                    <button className="btn btn-ghost min-h-10 text-[13px]" disabled={busy != null} onClick={() => act(l, "draft")}>
                      <EyeOff size={14} />
                      {busy === l.id + "draft" ? "…" : "Hide"}
                    </button>
                  )}
                  <button className="btn btn-ghost min-h-10 text-[13px] text-warn-text" disabled={busy != null} onClick={() => remove(l)}>
                    <Trash2 size={14} />
                    {busy === l.id + "delete" ? "…" : "Delete"}
                  </button>
                </div>
              </div>
            );
          })}
          </>
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


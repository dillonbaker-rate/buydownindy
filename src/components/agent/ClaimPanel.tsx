"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { LENDER } from "@/content/lender";

export type ClaimState = "signed-out" | "no-profile" | "wrong-email" | "ready";

/** Banner on a hidden listing's private page: explains it, and walks the agent to taking it live. */
export function ClaimPanel({
  token,
  state,
  address,
  sentTo,
  signedInAs,
}: {
  token: string;
  state: ClaimState;
  address: string;
  sentTo: string | null;
  signedInAs: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const here = `/agent/claim/${token}`;

  const claim = async () => {
    setBusy(true);
    setErr(null);
    const r = await fetch(`/api/listings/claim/${token}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirmed: true }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(j.error ?? "Couldn't take it live. Try again.");
    toast(`${address} is live on the map for 30 days.`);
    router.push(`/listing/${j.id}`);
    router.refresh();
  };

  return (
    <div className="flex-none border-b border-divider bg-accent-100 px-4 py-3.5 lg:px-8">
      <div className="mx-auto flex max-w-[1080px] flex-col gap-2.5 text-sm lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="min-w-0">
          <div className="font-bold">Private preview · not on the map yet</div>
          <div className="text-neutral-800">
            {LENDER.name} set this listing up for you
            {sentTo ? (
              <>
                {" "}
                (<strong>{sentTo}</strong>)
              </>
            ) : null}
            . Here&apos;s how buyers will see it once it&apos;s live under your name.
          </div>
        </div>

        <div className="flex flex-none flex-col gap-2 lg:items-end">
          {state === "signed-out" && (
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/agent/login?next=${encodeURIComponent(here)}&mode=signup${sentTo ? `&email=${encodeURIComponent(sentTo)}` : ""}`}
                className="btn btn-primary min-h-10 text-[13px]"
              >
                Create your free account to take it live
              </Link>
            </div>
          )}
          {state === "no-profile" && (
            <Link href="/agent" className="btn btn-primary min-h-10 text-[13px]">
              Finish your agent profile first
            </Link>
          )}
          {state === "wrong-email" && (
            <div className="max-w-[420px] text-[13px]">
              You&apos;re signed in as <strong>{signedInAs}</strong>, but this listing was sent to <strong>{sentTo}</strong>. Sign in with
              that email to take it live, or ask {LENDER.name.split(" ")[0]} to send it to this one.
            </div>
          )}
          {state === "ready" && (
            <>
              <label className="flex max-w-[460px] cursor-pointer items-start gap-2 text-[13px]">
                <input type="checkbox" checked={ok} onChange={() => setOk((v) => !v)} className="mt-0.5 h-[18px] w-[18px] flex-none accent-accent" />
                <span>This is my listing, the seller agreed to this concession, and I have the right to use these photos.</span>
              </label>
              <button className="btn btn-primary min-h-10 text-[13px]" disabled={!ok || busy} onClick={claim}>
                {busy ? "Taking it live…" : "Take it live under my name"}
              </button>
            </>
          )}
          {err && <div className="text-[13px] text-warn-text">{err}</div>}
        </div>
      </div>
    </div>
  );
}

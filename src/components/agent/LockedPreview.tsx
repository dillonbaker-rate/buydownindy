"use client";
import { Calculator, FileImage, Lock, TrendingDown, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ListingView } from "@/components/listing/ListingView";
import type { RateInfo } from "@/lib/rate-info";
import type { Listing } from "@/lib/types";

const DELAY_MS = 5000;

/**
 * Private listing preview for an agent who isn't signed in yet: the listing shows, the payment math is blurred, and
 * 5 seconds in (or on any click on the blurred parts) a prompt invites them to create their free account.
 */
export function LockedPreview({
  listing,
  rateInfo,
  signupHref,
  signinHref,
  sentTo,
}: {
  listing: Listing;
  rateInfo: RateInfo;
  signupHref: string;
  signinHref: string;
  sentTo: string | null;
}) {
  const [open, setOpen] = useState(false);
  const shown = useRef(false);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!shown.current) setOpen(true);
    }, DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    shown.current = true;
    card.current?.focus();
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);

  return (
    <>
      <ListingView listing={listing} rateInfo={rateInfo} preview="Once it's live, buyers call or email you from here." lockMath={() => setOpen(true)} />
      {open && (
        <div
          className="fixed inset-0 z-[4000] grid place-items-center bg-[rgba(16,24,40,0.45)] p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={card}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="lp-title"
            className="relative w-full max-w-[440px] rounded-[22px] bg-bg p-6 shadow-xl outline-none"
          >
            <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="absolute top-3 right-3 grid h-9 w-9 cursor-pointer place-items-center">
              <X size={18} />
            </button>
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-accent-100 text-accent">
              <Lock size={20} />
            </div>
            <h2 id="lp-title" className="text-[24px] leading-tight">
              See the full math
            </h2>
            <p className="mt-2 mb-4 text-sm text-neutral-800">
              Create your free agent account to unlock what the {listing.concession ? `$${listing.concession.toLocaleString("en-US")}` : "seller"}{" "}
              concession does for a buyer on {listing.address}, and take this listing live under your name.
            </p>
            <ul className="m-0 mb-5 flex list-none flex-col gap-2.5 p-0 text-sm">
              <li className="flex items-start gap-2.5">
                <TrendingDown size={18} className="mt-0.5 flex-none text-accent" />
                Buydown vs. price cut, side by side, with the monthly payment for each
              </li>
              <li className="flex items-start gap-2.5">
                <FileImage size={18} className="mt-0.5 flex-none text-accent" />
                Flyers and social graphics ready to download
              </li>
              <li className="flex items-start gap-2.5">
                <Calculator size={18} className="mt-0.5 flex-none text-accent" />
                Payment and buydown calculators for every what-if
              </li>
            </ul>
            <Link href={signupHref} className="btn btn-primary btn-flush min-h-12 w-full justify-center text-[15px]">
              Create my free account
            </Link>
            <div className="mt-3 text-center text-xs text-neutral-700">
              {sentTo ? (
                <>
                  Use <strong className="text-ink">{sentTo}</strong>. It takes about a minute.{" "}
                </>
              ) : (
                "It takes about a minute. "
              )}
              Already have one?{" "}
              <Link href={signinHref} className="font-semibold">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

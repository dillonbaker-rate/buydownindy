"use client";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useState } from "react";
import { kUsd } from "@/lib/buydown";
import { PHOTO_LABELS } from "@/lib/sample-data";
import { MAX_PHOTOS, type Listing } from "@/lib/types";
import { PhotoOrPlaceholder } from "./ListingCard";

export function Gallery({ listing: l }: { listing: Listing }) {
  // Sample listings show 7 labeled placeholders; real listings show their uploads (≤ 7).
  const real = l.photos.slice(0, MAX_PHOTOS);
  const slots = real.length
    ? real.map((p, i) => ({ url: p.url, label: `Photo ${i + 1}` }))
    : PHOTO_LABELS.map((label) => ({ url: undefined as string | undefined, label }));
  const n = slots.length;
  const [i, setI] = useState(0);
  const cur = slots[i];

  return (
    <div className="mb-5 flex flex-col gap-2">
      <div className="relative grid h-[260px] place-items-center overflow-hidden rounded-[22px] bg-neutral-300 text-neutral-700 lg:h-[440px]">
        {cur.url ? (
          <PhotoOrPlaceholder url={cur.url} alt={`${l.address}, photo ${i + 1} of ${n}`} />
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <PhotoOrPlaceholder alt="" />
            <span className="text-[13px]">
              {cur.label} · {i + 1} of {n}
            </span>
          </div>
        )}
        <span className="tag absolute top-3 left-3 bg-accent text-xs font-bold text-white">
          {kUsd(l.concession)} from seller
        </span>
        {n > 1 && (
          <>
            <button
              onClick={() => setI((i + n - 1) % n)}
              aria-label="Previous photo"
              className="absolute top-1/2 left-2 -mt-[22px] grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-bg text-ink shadow-md"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setI((i + 1) % n)}
              aria-label="Next photo"
              className="absolute top-1/2 right-2 -mt-[22px] grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-bg text-ink shadow-md"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
        <span className="tag tag-ink absolute right-3 bottom-3">
          {i + 1} / {n}
        </span>
        {!real.length && <span className="tag tag-neutral absolute bottom-3 left-3">Sample photo</span>}
      </div>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {slots.map((s, k) => (
          <button
            key={k}
            onClick={() => setI(k)}
            aria-label={s.label}
            className="relative h-11 w-16 flex-none cursor-pointer overflow-hidden rounded-[10px] bg-neutral-300"
            style={{ outline: k === i ? "2px solid var(--color-ink)" : "none", outlineOffset: -2 }}
          >
            {s.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.url} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
            )}
          </button>
        ))}
        {l.externalUrl && (
          <a
            href={l.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 inline-flex flex-none items-center gap-1 text-[13px] font-semibold"
          >
            More photos on Zillow/Redfin
            <ExternalLink size={13} />
          </a>
        )}
      </div>
    </div>
  );
}

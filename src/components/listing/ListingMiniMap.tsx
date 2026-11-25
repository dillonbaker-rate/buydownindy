"use client";
import { ExternalLink, MapPin } from "lucide-react";
import dynamic from "next/dynamic";
import { MapErrorBoundary } from "@/components/map/MapErrorBoundary";
import { kUsd } from "@/lib/buydown";
import type { Listing } from "@/lib/types";

const LeafletMap = dynamic(() => import("@/components/map/LeafletMap").then((m) => m.LeafletMap), { ssr: false });

/** A small map of where the home is, with a link out to Google Maps for directions. */
export function ListingMiniMap({ listing: l }: { listing: Listing }) {
  const full = `${l.address}, ${l.city}, IN${l.zip ? " " + l.zip : ""}`;
  return (
    <section aria-label="Location" className="flex flex-col gap-2.5 py-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="m-0 flex items-center gap-1.5 text-[17px] font-bold">
          <MapPin size={17} />
          Location
        </h2>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(full)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[13px] font-semibold"
        >
          Open in Google Maps
          <ExternalLink size={13} />
        </a>
      </div>
      <div className="relative h-[240px] overflow-hidden rounded-[20px] border border-divider bg-neutral-200 lg:h-[280px]">
        <MapErrorBoundary className="absolute inset-0">
          <LeafletMap
            className="absolute inset-0"
            interactive={false}
            center={[l.lat, l.lng]}
            zoom={14}
            pins={[{ id: l.id, lat: l.lat, lng: l.lng, label: kUsd(l.concession), title: full }]}
            selectedId={l.id}
          />
        </MapErrorBoundary>
      </div>
      <div className="text-[13px] text-neutral-700">{full}</div>
    </section>
  );
}

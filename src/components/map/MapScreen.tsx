"use client";
import { ChevronDown, ChevronUp, List, Map as MapIcon, SlidersHorizontal, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ListingCard } from "@/components/listing/ListingCard";
import { PriceRange } from "@/components/ui/DualRange";
import { Segmented } from "@/components/ui/Segmented";
import { calc, kUsd, pct, saving, usd, type LoanType } from "@/lib/buydown";
import { useIsDesktop } from "@/lib/hooks";
import { CENTER_DESK, CENTER_PHONE } from "@/lib/map-config";
import { COUNTIES, type Listing } from "@/lib/types";
import { inArea, type Area } from "@/lib/areas";
import type { InviteGreeting } from "@/lib/invites";
import { rateFor, rateNoun, type RateInfo } from "@/lib/rate-info";
import type { LeafletMapHandle } from "./LeafletMap";
import { MapErrorBoundary } from "./MapErrorBoundary";

const LeafletMap = dynamic(() => import("./LeafletMap").then((m) => m.LeafletMap), { ssr: false });

interface Filters {
  county: string;
  min: number;
  max: number;
  conc: number;
  loan: LoanType | "Any";
}
const NO_FILTERS: Filters = { county: "All counties", min: 0, max: 0, conc: 0, loan: "Any" };

export function MapScreen({
  listings,
  rateInfo,
  invite,
  area,
}: {
  listings: Listing[];
  rateInfo: RateInfo;
  /** Set when the visitor arrived through their agent's invite link. */
  invite?: InviteGreeting | null;
  /** City, county, or ZIP chosen on the search screen. */
  area?: Area | null;
}) {
  const [inviteOn, setInviteOn] = useState(true);
  const desk = useIsDesktop();
  const phone = !desk;
  const [view, setView] = useState<"map" | "list">("map");
  const [sheet, setSheet] = useState<"peek" | "full">("peek");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [f, setF] = useState<Filters>(NO_FILTERS);
  const [selId, setSelId] = useState<string | null>(null);
  const [heroOn, setHeroOn] = useState(true);
  const mapRef = useRef<LeafletMapHandle>(null);
  const drag = useRef<{ y: number | null; dragged: boolean }>({ y: null, dragged: false });
  const touch = useRef<{ y: number | null; top: boolean }>({ y: null, top: false });

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((s) => ({ ...s, [k]: v }));

  const inPlace = useMemo(() => (area ? listings.filter((l) => inArea(area, l)) : listings), [listings, area]);
  // Center on the area's homes if it has any, otherwise on the place itself.
  const areaView = useMemo((): { center: [number, number]; zoom: number } | null => {
    if (!area) return null;
    if (inPlace.length) {
      const lat = inPlace.reduce((a, l) => a + l.lat, 0) / inPlace.length;
      const lng = inPlace.reduce((a, l) => a + l.lng, 0) / inPlace.length;
      return { center: [lat, lng], zoom: area.zoom ?? 12.5 };
    }
    return area.center ? { center: area.center, zoom: area.zoom ?? 12 } : null;
  }, [area, inPlace]);

  const shown = useMemo(
    () =>
      inPlace.filter(
        (l) =>
          (f.county === "All counties" || l.county === f.county) &&
          (!f.min || l.price >= f.min) &&
          (!f.max || l.price <= f.max) &&
          l.concession >= f.conc &&
          (f.loan === "Any" || l.loanTypes.includes(f.loan)),
      ),
    [inPlace, f],
  );
  const sorted = selId ? [...shown].sort((a, b) => Number(b.id === selId) - Number(a.id === selId)) : shown;
  const nf =
    Number(f.county !== "All counties") + Number(!!f.min) + Number(!!f.max) + Number(!!f.conc) + Number(f.loan !== "Any");

  // Savings story from the featured listing.
  const hero = useMemo(() => {
    const ex = listings.find((l) => l.isExample) ?? listings[0];
    if (!ex) return null;
    const type = ex.loanTypes.includes("Conventional") ? "Conventional" : ex.loanTypes[0];
    const rate = rateFor(rateInfo, type);
    const c = calc(ex.price, ex.concession, type, ex.defaultDownPct, 0, rate);
    if (!c.best) return null;
    return {
      k: kUsd(ex.concession),
      cut: "−" + usd(saving(c.base, c.cut)),
      best: "−" + usd(saving(c.base, c.best.y1)),
      cutW: ((c.base - c.cut) / (c.base - c.best.y1)) * 100 + "%",
      bestName: c.best.name,
      basis: `${ex.address}, ${usd(ex.price)}, ${ex.defaultDownPct}% down, ${pct(rate)} ${rateNoun(rateInfo)}`,
    };
  }, [listings, rateInfo]);

  const expanded = sheet === "full" || filtersOpen;
  const pick = (id: string) => {
    setSelId(id);
    setSheet("peek");
    const l = listings.find((x) => x.id === id);
    if (l) mapRef.current?.flyTo(l.lat, l.lng);
  };
  const toggleSheet = () => {
    if (drag.current.dragged) {
      drag.current.dragged = false;
      return;
    }
    setSheet(expanded ? "peek" : "full");
    setFiltersOpen(false);
  };

  const pins = shown.map((l) => ({
    id: l.id,
    lat: l.lat,
    lng: l.lng,
    label: kUsd(l.concession),
    title: `${l.address}, ${kUsd(l.concession)} seller concession`,
  }));
  const anySample = listings.some((l) => l.isSample);
  const heroPhone = phone && view === "map" && heroOn && !expanded && hero;
  const heroDesk = desk && heroOn && hero;
  const href = (l: Listing) => `/listing/${l.id}` + (f.loan !== "Any" ? `?type=${f.loan}` : "");

  // Split: list 40%, map 60% (desktop width; phone sheet starts at 40% of the height).
  const LIST_SHARE = "40%";
  const paneTop = desk ? "0px" : view === "list" ? "0px" : expanded ? "64px" : "60%";
  const paneW = desk ? (view === "list" ? "100%" : LIST_SHARE) : "100%";

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      {view === "map" && (
        <>
          <div className="absolute inset-y-0 right-0" style={{ left: desk ? LIST_SHARE : 0 }}>
          <MapErrorBoundary className="absolute inset-0">
          <LeafletMap
            ref={mapRef}
            pins={pins}
            selectedId={selId}
            center={areaView?.center ?? (desk ? CENTER_DESK : CENTER_PHONE)}
            zoom={areaView?.zoom ?? 10}
            zoomControl={desk}
            viewKey={desk ? "desk" : "phone"}
            onPick={pick}
            onMapClick={() => {
              if (phone && expanded) {
                setSheet("peek");
                setFiltersOpen(false);
              }
            }}
            className="absolute inset-0 bg-neutral-200"
          />
          </MapErrorBoundary>
          </div>
          {anySample && (
            <span
              className="tag tag-ink absolute z-[500] font-semibold"
              style={{ top: heroPhone ? 92 : 12, left: desk ? `calc(${LIST_SHARE} + 16px)` : 12 }}
            >
              Sample listings
            </span>
          )}
        </>
      )}

      {heroPhone && (
        <div className="absolute inset-x-2.5 top-2.5 z-[550] grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] bg-bg py-2.5 pr-1.5 pl-3.5 text-ink shadow-md">
          <div className="text-[10px] leading-tight font-semibold">
            Same
            <br />
            {hero.k}
          </div>
          <div className="border-l border-divider pl-2.5">
            <div className="text-[11px] text-neutral-700">As a price cut</div>
            <div className="text-[22px] leading-[1.1] font-bold tracking-[-0.03em]">
              {hero.cut}
              <span className="text-[11px] font-semibold">/mo</span>
            </div>
          </div>
          <div className="border-l border-divider pl-2.5">
            <div className="text-[11px] text-neutral-700">As a buydown</div>
            <div className="text-[22px] leading-[1.1] font-bold tracking-[-0.03em] text-accent">
              {hero.best}
              <span className="text-[11px] font-semibold">/mo</span>
            </div>
          </div>
          <button
            onClick={() => setHeroOn(false)}
            aria-label="Dismiss"
            className="grid h-11 w-9 cursor-pointer place-items-center text-neutral-600"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div
        className="absolute bottom-0 left-0 z-[600] flex flex-col bg-bg transition-[top] duration-[250ms] ease-[ease]"
        style={{
          top: paneTop,
          width: paneW,
          borderRadius: phone && view === "map" ? "24px 24px 0 0" : 0,
          borderRight: desk && view === "map" ? "1px solid var(--color-divider)" : 0,
          boxShadow: phone && view === "map" ? "var(--shadow-lg)" : "none",
        }}
      >
        {phone && view === "map" && (
          <button
            onClick={toggleSheet}
            onPointerDown={(e) => {
              drag.current = { y: e.clientY, dragged: false };
            }}
            onPointerUp={(e) => {
              const y0 = drag.current.y;
              if (y0 == null) return;
              drag.current.y = null;
              const dy = e.clientY - y0;
              if (Math.abs(dy) > 20) {
                drag.current.dragged = true;
                setSheet(dy < 0 ? "full" : "peek");
                setFiltersOpen(false);
              }
            }}
            aria-label={expanded ? "Show map" : `Show all ${shown.length} listings`}
            className="flex min-h-11 cursor-grab touch-none flex-col items-center gap-1.5 pt-2.5 pb-1"
          >
            <span className="h-[5px] w-11 rounded-full bg-neutral-400" />
            <span className="flex items-center gap-1 text-xs font-semibold text-accent">
              {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              {expanded ? "Show map" : `Show all ${shown.length} listings`}
            </span>
          </button>
        )}

        {invite && inviteOn && (
          <div className="relative mx-4 mt-3 flex flex-col gap-1 rounded-[18px] border border-accent-300 bg-bg p-3.5 pr-11 text-[13px]">
            <div className="text-[15px] font-bold">Hi {invite.clientFirst}!</div>
            <div>
              {invite.agentName}
              {invite.brokerage ? ` at ${invite.brokerage}` : ""} shared these homes with you. In each one the seller will pay
              concessions. Tap a home to see what that money does to your monthly payment.
            </div>
            {invite.agentPhone && (
              <a href={`tel:${invite.agentPhone.replace(/[^0-9+]/g, "")}`} className="mt-1 self-start text-[13px] font-semibold">
                Call {invite.agentName.split(" ")[0]} · {invite.agentPhone}
              </a>
            )}
            <button
              onClick={() => setInviteOn(false)}
              aria-label="Dismiss"
              className="absolute top-1.5 right-1.5 grid h-9 w-9 cursor-pointer place-items-center text-neutral-600"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {heroDesk && (
          <div className="relative mx-4 mt-3 mb-1 flex flex-col gap-3.5 rounded-[20px] bg-accent-100 px-[18px] pt-5 pb-[18px] text-ink">
            <div className="max-w-[360px] pr-7 text-[26px] leading-[1.08] font-bold tracking-[-0.03em] text-pretty">
              {hero.k} off the price barely moves your payment. {hero.k} toward a buydown moves it a lot.
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <div className="grid grid-cols-[96px_minmax(0,1fr)_64px] items-center gap-2.5 text-[13px]">
                <span>Price cut</span>
                <span className="h-3 overflow-hidden rounded-full bg-accent-200">
                  <span className="block h-full rounded-full bg-neutral-600" style={{ width: hero.cutW }} />
                </span>
                <span className="text-right font-bold">{hero.cut}</span>
              </div>
              <div className="grid grid-cols-[96px_minmax(0,1fr)_64px] items-center gap-2.5 text-[13px]">
                <span>{hero.bestName}</span>
                <span className="h-3 rounded-full bg-accent" />
                <span className="text-right font-bold">{hero.best}</span>
              </div>
              <div className="text-[11px] text-neutral-700">Monthly savings, year 1 · {hero.basis}</div>
            </div>
            <button
              onClick={() => setHeroOn(false)}
              aria-label="Dismiss"
              className="absolute top-2 right-2 grid h-9 w-9 cursor-pointer place-items-center"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 px-4 py-2">
          <div className="mr-auto min-w-0">
            <div className="text-base font-bold">
              {shown.length} listing{shown.length === 1 ? "" : "s"}
              {area ? ` in ${area.value}` : ""}
            </div>
            {area ? (
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                <Link href="/homes" className="tag tag-accent font-semibold no-underline" aria-label={`Clear ${area.label}`}>
                  {area.label}
                  <X size={12} />
                </Link>
                <Link href="/" className="text-xs font-semibold">
                  New search
                </Link>
              </div>
            ) : (
              <div className="text-xs text-neutral-700">Seller pays concessions · Indy metro</div>
            )}
          </div>
          {phone && (
            <button
              className="btn btn-secondary"
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
            >
              <SlidersHorizontal size={16} />
              Filters{nf ? ` (${nf})` : ""}
            </button>
          )}
          <Segmented
            className="flex-none"
            label="View"
            value={view}
            onChange={setView}
            options={[
              { value: "map", ariaLabel: "Map", label: <><MapIcon size={14} />{desk && "Map"}</> },
              { value: "list", ariaLabel: "List", label: <><List size={14} />{desk && "List"}</> },
            ]}
          />
        </div>

        <div
          className="min-h-0 flex-1 overflow-auto overscroll-contain px-4 pb-4"
          onScroll={(e) => {
            if (phone && view === "map" && sheet === "peek" && e.currentTarget.scrollTop > 4) setSheet("full");
          }}
          onWheel={(e) => {
            if (!phone || view !== "map") return;
            const top = e.currentTarget.scrollTop <= 0;
            if (sheet === "peek" && e.deltaY > 0) setSheet("full");
            else if (sheet === "full" && top && e.deltaY < -10 && !filtersOpen) setSheet("peek");
          }}
          onTouchStart={(e) => {
            touch.current = { y: e.touches[0].clientY, top: e.currentTarget.scrollTop <= 0 };
          }}
          onTouchMove={(e) => {
            if (!phone || view !== "map" || touch.current.y == null) return;
            const dy = e.touches[0].clientY - touch.current.y;
            if (sheet === "peek" && dy < -12) {
              touch.current.y = null;
              setSheet("full");
            } else if (sheet === "full" && touch.current.top && dy > 40 && !filtersOpen) {
              touch.current.y = null;
              setSheet("peek");
            }
          }}
        >
          {(desk || filtersOpen) && (
            <div className="mb-4 grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-x-4 gap-y-3 border-y border-divider pt-3 pb-4">
              <div className="field">
                <label htmlFor="f-county">County</label>
                <select
                  id="f-county"
                  className="input"
                  value={f.county}
                  onChange={(e) => set("county", e.target.value)}
                >
                  {["All counties", ...COUNTIES].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <span className="field-label">Price range</span>
                <PriceRange min={f.min} max={f.max} onChange={(min, max) => setF((s) => ({ ...s, min, max }))} />
              </div>
              <div className="field">
                <span className="field-label">Minimum concession</span>
                <Segmented
                  label="Minimum concession"
                  value={f.conc}
                  onChange={(v) => set("conc", v)}
                  options={[
                    { value: 0, label: "Any" },
                    { value: 5000, label: "$5k+" },
                    { value: 10000, label: "$10k+" },
                    { value: 15000, label: "$15k+" },
                  ]}
                />
              </div>
              <div className="field">
                <span className="field-label">Loan type</span>
                <Segmented
                  label="Loan type"
                  value={f.loan}
                  onChange={(v) => set("loan", v)}
                  options={[
                    { value: "Any", label: "Any" },
                    { value: "Conventional", label: "Conv." },
                    { value: "FHA", label: "FHA" },
                    { value: "VA", label: "VA" },
                  ]}
                />
              </div>
            </div>
          )}

          {area && inPlace.length === 0 && listings.length > 0 ? (
            <div className="flex flex-col items-start gap-2 border-t border-divider py-6">
              <div className="text-xl font-bold">No listings in {area.label} yet</div>
              <p className="m-0 text-sm text-neutral-700">
                There are {listings.length} Indy-area home{listings.length === 1 ? "" : "s"} with seller concessions right now.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/homes" className="btn btn-primary">
                  See all homes
                </Link>
                <Link href="/" className="btn btn-secondary">
                  Search another area
                </Link>
              </div>
            </div>
          ) : listings.length === 0 ? (
            <div className="flex flex-col items-start gap-2 border-t border-divider py-6">
              <div className="text-xl font-bold">No listings yet</div>
              <p className="m-0 text-sm text-neutral-700">
                Listing agents are adding Indy-area homes where the seller will pay concessions. Check back soon.
              </p>
              <Link href="/agent/post" className="btn btn-primary">
                Agents: post a listing
              </Link>
            </div>
          ) : shown.length > 0 ? (
            <div
              className={`grid gap-3 ${
                // Beside the map, cards stretch to fill the panel; full-screen list keeps even columns.
                view === "map" ? "grid-cols-[repeat(auto-fit,minmax(260px,1fr))]" : "grid-cols-[repeat(auto-fill,minmax(300px,1fr))]"
              }`}
            >
              {sorted.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  rateInfo={rateInfo}
                  loanFilter={f.loan}
                  selected={l.id === selId}
                  href={href(l)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-start gap-2 border-t border-divider py-6">
              <div className="text-xl font-bold">No listings match these filters</div>
              <p className="m-0 text-sm text-neutral-700">
                Try a wider price range, a lower minimum concession, or another county.
              </p>
              <button className="btn btn-primary" onClick={() => setF(NO_FILTERS)}>
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

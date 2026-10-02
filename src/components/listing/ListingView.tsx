"use client";
import { ArrowRight, BadgeCheck, Bath, BedDouble, ChevronDown, Maximize } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CountUp } from "@/components/ui/CountUp";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import {
  EDUCATIONAL_LINE,
  FREE_TO_USE,
  fullDisclaimer,
  RATE_LINE,
  representativeExample,
} from "@/content/disclosures";
import {
  bestNote,
  calc,
  CREDIT_RANGES,
  kUsd,
  LOAN_TYPES,
  MIN_DOWN,
  pct,
  saving,
  SHORT_TYPE,
  typeFor,
  usd,
  type LoanType,
} from "@/lib/buydown";
import { CLOSING_COST_PCT } from "@/content/program-rules";
import { useIsDesktop } from "@/lib/hooks";
import { longDate, rateFor, type RateInfo } from "@/lib/rate-info";
import { extrasByOption } from "@/lib/piti";
import { shareSummary } from "@/lib/share";
import { ShareListing } from "./ShareListing";
import type { Listing } from "@/lib/types";
import { LenderCard } from "@/components/lender/LenderCard";
import { Gallery } from "./Gallery";
import { OptionCard } from "./OptionCard";

export function ListingView({
  listing: l,
  rateInfo,
  preferredType,
}: {
  listing: Listing;
  rateInfo: RateInfo;
  preferredType?: LoanType;
}) {
  const desk = useIsDesktop();
  const toast = useToast();
  const defaults = () => {
    const t = typeFor(l.loanTypes, preferredType);
    return { type: t, down: Math.max(l.defaultDownPct, MIN_DOWN[t]), credit: 0 };
  };
  const [sc, setSc] = useState(defaults);
  const [discOpen, setDiscOpen] = useState(false);
  // Principal & interest, or the full payment with estimated taxes, insurance, MI and HOA (remembered per viewer).
  const [full, setFullState] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem("bd-full-payment") === "1") setFullState(true);
    } catch {}
  }, []);
  const setFull = (v: boolean) => {
    setFullState(v);
    try {
      localStorage.setItem("bd-full-payment", v ? "1" : "0");
    } catch {}
  };

  const adj = CREDIT_RANGES[sc.credit].adj;
  const baseRate = rateFor(rateInfo, sc.type);
  const c = calc(l.price, l.concession, sc.type, sc.down, adj, baseRate, sc.credit);
  const b = c.best;
  const bestY1 = b ? b.y1 : c.base;
  const share = shareSummary(l, rateInfo);
  const ex = extrasByOption(l, c);
  const addBase = full ? ex.base.total : 0;
  const addCut = full ? ex.cut.total : 0;
  // Payments in the current view (P&I or full). Buydown options share the list-price extras.
  const P = { base: c.base + addBase, cut: c.cut + addCut, best: bestY1 + addBase };
  const maxSave = Math.max(
    ...c.opts.map((o) => Math.max(...o.rows.map((r) => P.base - (r.v + (full ? ex.forKey(o.key) : 0))))),
    1,
  );
  const cutW = b ? Math.max(2, ((P.base - P.cut) / (P.base - P.best)) * 100) + "%" : "100%";
  const viewToggle = (
    <Segmented
      label="Show payments as"
      value={full ? "full" : "pi"}
      onChange={(v) => setFull(v === "full")}
      optClassName="!text-xs"
      options={[
        { value: "pi", label: "Principal & interest" },
        { value: "full", label: "Full payment (PITI)" },
      ]}
    />
  );
  const bestLabel = b ? (b.key === "perm" ? "Permanent buydown" : `${b.name}, year 1`) : "No buydown unlocked";
  const bestShort = b ? (b.key === "perm" ? "Permanent buydown" : b.name) : "Buydown";
  const rateLine = RATE_LINE({
    source: rateInfo.source,
    date: longDate(rateInfo.date),
    rates:
      rateInfo.source === "daily"
        ? `Conventional ${pct(rateInfo.rates.Conventional)}, FHA ${pct(rateInfo.rates.FHA)}, and VA ${pct(rateInfo.rates.VA)}`
        : pct(rateInfo.rates.Conventional),
  });

  const lenderHref = `/talk-to-a-lender?listing=${encodeURIComponent(l.id)}`;
  const contact = () => {
    if (l.agentPhone) window.location.href = `tel:${l.agentPhone.replace(/[^0-9+]/g, "")}`;
    else if (l.agentEmail)
      window.location.href = `mailto:${l.agentEmail}?subject=${encodeURIComponent(`${l.address}, ${l.city}`)}`;
    else toast(`Demo: calls or emails ${l.agentName}, ${l.brokerage}.`);
  };

  const meta = l.isExample
    ? `Built ${l.builtYear} · HOA ${usd(l.hoaMo ?? 0)}/mo · Real home, example concession amount`
    : [
        l.builtYear ? `Built ${l.builtYear}` : null,
        l.hoaMo ? `HOA ${usd(l.hoaMo)}/mo` : null,
        `Listed by ${l.agentName}${l.brokerage ? ", " + l.brokerage : ""}`,
      ]
        .filter(Boolean)
        .join(" · ");

  const offerLink = (
    <Link href={`/calculator?listing=${encodeURIComponent(l.id)}`} className="text-[13px] font-semibold">
      Making an offer? Work out the concession to ask for →
    </Link>
  );

  const actions = (
    <div className="flex flex-col gap-2 border-t border-divider pt-4">
      <button className="btn btn-primary btn-flush px-4 py-3.5 text-[15px]" onClick={contact}>
        Contact listing agent
        <ArrowRight size={16} className="ml-auto" />
      </button>
      <div className="mt-2">
        <LenderCard contactHref={lenderHref} />
      </div>
      <div className="mt-1">{offerLink}</div>
    </div>
  );

  return (
    <div className="relative min-h-0 flex-1 overflow-auto">
      <div className="mx-auto max-w-[1200px] p-4 lg:p-8">
        <Gallery listing={l} />

        <div
          className="grid gap-x-10"
          style={{
            gridTemplateColumns: desk ? "minmax(0,1fr) 360px" : "minmax(0,1fr)",
            gridTemplateAreas: desk
              ? '"details side" "headline side" "options side" "disc side"'
              : '"details" "headline" "side" "options" "lender" "disc"',
          }}
        >
          {/* Details */}
          <div className="flex flex-col gap-1.5 border-b border-divider pb-5" style={{ gridArea: "details" }}>
            <div className="flex flex-wrap gap-2">
              <span className="tag tag-accent font-semibold">{usd(l.concession)} seller concession</span>
              {l.isSample && <span className="tag tag-neutral">Sample</span>}
            </div>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h1 className="text-[34px] leading-[1.05] font-bold tracking-[-0.02em] lg:text-[44px]">{usd(l.price)}</h1>
              <ShareListing id={l.id} title={share.title} text={share.text} post={share.post} />
            </div>
            <div className="text-base">
              {l.address}, {l.city}, IN{l.zip ? " " + l.zip : ""}
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-neutral-800">
              <span className="flex items-center gap-1.5">
                <BedDouble size={16} />
                {l.beds} bed
              </span>
              <span className="flex items-center gap-1.5">
                <Bath size={16} />
                {l.baths} bath
              </span>
              <span className="flex items-center gap-1.5">
                <Maximize size={16} />
                {l.sqft.toLocaleString("en-US")} sq ft
              </span>
            </div>
            <div className="text-xs text-neutral-700">{meta}</div>
            {Boolean(l.taxesYr || l.insuranceYr) && (
              <div className="text-xs text-neutral-700">
                {[l.taxesYr ? `Est. property taxes ${usd(l.taxesYr)}/yr` : null, l.insuranceYr ? `est. insurance ${usd(l.insuranceYr)}/yr` : null]
                  .filter(Boolean)
                  .join(" · ")}{" "}
                (not included in the payments shown)
              </div>
            )}
            {!l.isSample && (
              <div className="mt-2 flex items-center gap-3 rounded-[18px] border border-divider p-3">
                <div className="grid h-12 w-12 flex-none place-items-center overflow-hidden rounded-full bg-neutral-300 font-bold text-neutral-600">
                  {l.agentPhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.agentPhotoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    l.agentName.slice(0, 1)
                  )}
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="text-[11px] text-neutral-700">Listed by</div>
                  <div className="truncate text-sm font-bold">{l.agentName}</div>
                  <div className="truncate text-xs text-neutral-700">{l.brokerage}</div>
                </div>
                {l.agentVerified && (
                  <span className="tag tag-accent flex-none font-semibold">
                    <BadgeCheck size={13} />
                    Licensed agent
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Headline comparison */}
          <section
            aria-label="Price cut versus buydown"
            className="my-5 flex flex-col gap-3.5 rounded-[24px] bg-accent-100 p-4 text-ink lg:p-6"
            style={{ gridArea: "headline" }}
          >
            <div className="text-[11px] font-semibold">Same {usd(l.concession)} from the seller · {full ? "full monthly payment, est." : "monthly P&I"}</div>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-2">
              <div className="py-3.5 pr-2 pl-1">
                <div className="text-[13px] font-semibold">{kUsd(l.concession)} price cut</div>
                <div className="mt-2.5 mb-2 text-[38px] leading-none font-bold tracking-[-0.03em] lg:text-[76px]">
                  <CountUp value={P.cut} from={P.base} />
                </div>
                <div className="text-[13px] text-neutral-700">/mo · saves {usd(saving(P.base, P.cut))}</div>
              </div>
              <div className="rounded-[18px] bg-bg px-4 py-3.5 text-ink shadow-md">
                <div className="text-[13px] font-semibold">{bestLabel}</div>
                <div className="mt-2.5 mb-2 text-[38px] leading-none font-bold tracking-[-0.03em] text-accent lg:text-[76px]">
                  <CountUp value={P.best} from={P.base} />
                </div>
                <div className="text-[13px] font-semibold text-accent-700">/mo · saves {usd(saving(P.base, P.best))}</div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-[minmax(0,110px)_minmax(0,1fr)_64px] items-center gap-2.5 text-[13px]">
                <span>Price cut</span>
                <span className="h-3 overflow-hidden rounded-full bg-accent-200">
                  <span
                    className="block h-full rounded-full bg-neutral-600 transition-[width] duration-[600ms] ease-[cubic-bezier(.2,.8,.2,1)]"
                    style={{ width: cutW }}
                  />
                </span>
                <span className="text-right font-bold">
                  <CountUp value={saving(P.base, P.cut)} from={0} prefix="−" />
                </span>
              </div>
              <div className="grid grid-cols-[minmax(0,110px)_minmax(0,1fr)_64px] items-center gap-2.5 text-[13px]">
                <span>{bestShort}</span>
                <span className="h-3 overflow-hidden rounded-full bg-accent-200">
                  <span
                    className="block h-full rounded-full bg-accent transition-[width] duration-[600ms] ease-[cubic-bezier(.2,.8,.2,1)]"
                    style={{ width: b ? "100%" : "0%" }}
                  />
                </span>
                <span className="text-right font-bold">
                  <CountUp value={saving(P.base, P.best)} from={0} prefix="−" />
                </span>
              </div>
            </div>
            <div className="border-t border-accent-200 pt-2.5 text-[13px] text-pretty text-neutral-800">
              {bestNote(c, addBase)} With no concession: {usd(P.base)}/mo at {pct(c.rate)}
              {full ? ", including estimated taxes, insurance" + (ex.base.mi ? ", mortgage insurance" : "") + (ex.base.hoa ? " and HOA" : "") : ""}.
            </div>
          </section>

          {/* Scenario */}
          <div
            className="flex flex-col gap-4 self-start border-b border-divider py-5 lg:border-b-0"
            style={{ gridArea: "side" }}
          >
            <div className="flex items-baseline justify-between">
              <span className="text-[17px] font-bold">Your scenario</span>
              <button className="btn btn-ghost min-h-9 text-xs" onClick={() => setSc(defaults())}>
                Reset to listing defaults
              </button>
            </div>
            <div className="field">
              <span className="field-label">Loan type</span>
              <Segmented
                label="Loan type"
                value={sc.type}
                onChange={(t) => setSc((s) => ({ ...s, type: t, down: Math.max(s.down, MIN_DOWN[t]) }))}
                options={LOAN_TYPES.map((t) => ({ value: t, label: SHORT_TYPE[t], disabled: !l.loanTypes.includes(t) }))}
              />
              <div className="mt-1 text-[11px] text-neutral-700">This seller accepts {l.loanTypes.join(", ")}.</div>
            </div>
            <div className="field">
              <label htmlFor="down">
                Down payment:{" "}
                <strong className="text-ink">
                  {sc.down}% ({usd((l.price * sc.down) / 100)})
                </strong>
              </label>
              <input
                id="down"
                className="range"
                type="range"
                min={MIN_DOWN[sc.type]}
                max={20}
                step={0.5}
                value={sc.down}
                onChange={(e) => setSc((s) => ({ ...s, down: +e.target.value }))}
              />
              <div className="flex justify-between text-[11px] text-neutral-700">
                <span>{MIN_DOWN[sc.type]}%</span>
                <span>Loan {usd(c.loan)}</span>
                <span>20%</span>
              </div>
              <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-neutral-700">
                {c.upfront && (
                  <span>
                    Includes {usd(c.upfront.amount)} {c.upfront.name} ({pct(c.upfront.pct)}), financed.
                  </span>
                )}
                {c.mi && (
                  <span>
                    Plus about {usd(c.mi.monthly)}/mo {c.mi.name}, not included in P&amp;I.
                  </span>
                )}
                <span>
                  Cash to close with no concession: {usd(c.downPayment + c.closingCosts)} ({usd(c.downPayment)} down +{" "}
                  {usd(c.closingCosts)} est. closing costs, including estimated taxes and insurance).
                </span>
              </div>
            </div>
            <div className="field">
              <span className="field-label">Credit score range</span>
              <Segmented
                label="Credit score range"
                optClassName="!px-1.5 !text-xs"
                value={sc.credit}
                onChange={(v) => setSc((s) => ({ ...s, credit: v }))}
                options={CREDIT_RANGES.map((r, i) => ({ value: i, label: r.label }))}
              />
              <div className="mt-1 text-[11px] text-neutral-700">{rateInfo.source === "daily" ? "Example rate" : "Sample rate"} for this range: {pct(c.rate)}</div>
            </div>
            <div className="field">
              <span className="field-label">Show payments as</span>
              {viewToggle}
              {full && (
                <div className="mt-2 overflow-hidden rounded-[14px] border border-divider text-xs">
                  {[
                    ["Principal & interest", c.base, ""],
                    ["Property taxes", ex.base.taxes, ex.base.taxesEstimated ? "est. 1% of price" : "from listing agent"],
                    ["Homeowners insurance", ex.base.insurance, ex.base.insuranceEstimated ? "est. $5 per $1,000" : "from listing agent"],
                    ...(ex.base.mi ? [[c.mi!.name.replace(/^./, (x) => x.toUpperCase()), ex.base.mi, sc.type === "Conventional" ? `est. ${pct(c.mi!.pct)}/yr, ${CREDIT_RANGES[sc.credit].label} credit` : `${pct(c.mi!.pct)}/yr`] as const] : []),
                    ...(ex.base.hoa ? [["HOA", ex.base.hoa, "from listing agent"] as const] : []),
                  ].map(([k, v, hint]) => (
                    <div key={k as string} className="flex justify-between gap-2 border-b border-divider px-3 py-1.5">
                      <span>
                        {k} {hint && <span className="text-neutral-600">({hint})</span>}
                      </span>
                      <span className="font-semibold">{usd(v as number)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between gap-2 bg-surface px-3 py-1.5 font-bold">
                    <span>Full payment, no concession</span>
                    <span>{usd(P.base)}/mo</span>
                  </div>
                </div>
              )}
            </div>
            {desk && actions}
          </div>

          {!desk && (
            <div className="flex flex-col gap-3 pb-5" style={{ gridArea: "lender" }}>
              <LenderCard contactHref={lenderHref} />
              {offerLink}
            </div>
          )}

          {/* Options */}
          <div className="py-5" style={{ gridArea: "options" }}>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[22px]">What {usd(l.concession)} can do</h2>
              <div className="w-full sm:w-auto">{viewToggle}</div>
            </div>
            <p className="mt-0 mb-3.5 text-[13px] text-neutral-700">
              {c.limitTxt}. Cash to close is your down payment ({usd(c.downPayment)}) plus closing costs, estimated at{" "}
              {CLOSING_COST_PCT}% of the loan ({usd(c.closingCosts)}). Seller credits can pay closing costs, never the down payment.
            </p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
              {c.opts.map((o) => (
                <OptionCard
                  key={o.key}
                  o={o}
                  base={c.base}
                  maxSave={maxSave}
                  askHref={`${lenderHref}&topic=points`}
                  full={full}
                  extra={ex.forKey(o.key)}
                  baseExtra={ex.base.total}
                />
              ))}
            </div>
          </div>

          {/* Disclosures */}
          <div
            className="mt-2 mb-6 flex flex-col gap-3 rounded-[22px] bg-surface p-4 text-xs leading-[1.55] text-neutral-800 lg:p-6"
            style={{ gridArea: "disc" }}
          >
            <div className="flex flex-col gap-1">
              <div className="text-[17px] font-bold text-ink">Important disclosures</div>
              <p className="m-0">
                <strong className="text-ink">{rateLine.lead}</strong> {rateLine.body}
              </p>
            </div>
            <button
              onClick={() => setDiscOpen((o) => !o)}
              aria-expanded={discOpen}
              className="flex cursor-pointer items-center justify-between gap-2 rounded-[14px] bg-bg px-4 py-3 text-sm font-bold text-accent hover:bg-accent-100"
            >
              <span>{discOpen ? "Hide full disclaimer" : "Read full disclaimer"}</span>
              <ChevronDown size={14} className="transition-transform duration-200" style={{ transform: discOpen ? "rotate(180deg)" : "none" }} />
            </button>
            {discOpen && (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-2">
                {fullDisclaimer(representativeExample(usd(c.loan), pct(c.rate), usd(c.base))).map((s) => (
                  <div key={s.title} className="flex flex-col gap-1 rounded-[14px] bg-bg p-3.5">
                    <div className="text-[13px] font-bold text-ink">{s.title}</div>
                    <p className="m-0">
                      {s.body}
                      {s.link && (
                        <>
                          {" "}
                          <a href={s.link.href} target="_blank" rel="noopener noreferrer">
                            {s.link.label}
                          </a>
                          {s.link.after}
                        </>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <p className="m-0 text-neutral-700">{EDUCATIONAL_LINE}</p>
          </div>
        </div>
      </div>

      {!desk && (
        <div className="sticky bottom-0 z-10 flex flex-col gap-1.5 bg-bg px-4 pt-3 pb-2 text-ink shadow-[0_-6px_20px_rgba(38,44,51,0.1)]">
          <div className="grid grid-cols-2 gap-2">
            <button className="btn btn-primary btn-flush min-h-12" onClick={contact}>
              Contact listing agent
            </button>
            <Link href={lenderHref} className="btn btn-secondary btn-flush min-h-12">
              Talk to a lender
            </Link>
          </div>
          <div className="text-[11px] text-neutral-700">{FREE_TO_USE}</div>
        </div>
      )}

    </div>
  );
}

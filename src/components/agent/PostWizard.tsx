"use client";
import { ArrowLeft, ArrowRight, House, MapPin } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Suggestion } from "@/app/api/geocode/route";
import { StatePill } from "@/components/listing/OptionCard";
import { CountUp } from "@/components/ui/CountUp";
import { Segmented } from "@/components/ui/Segmented";
import { useToast } from "@/components/ui/Toast";
import { PHOTO_RIGHTS } from "@/content/disclosures";
import { calc, kUsd, LOAN_TYPES, MIN_DOWN, pct, usd, type LoanType } from "@/lib/buydown";
import { commas, digitsOnly, num } from "@/lib/format";
import { useIsDesktop } from "@/lib/hooks";
import { rateFor, rateNoun, type RateInfo } from "@/lib/rate-info";
import type { Listing } from "@/lib/types";
import { MapErrorBoundary } from "@/components/map/MapErrorBoundary";
import { PhotoGrid, type FormPhoto } from "./PhotoGrid";

const LeafletMap = dynamic(() => import("@/components/map/LeafletMap").then((m) => m.LeafletMap), { ssr: false });

interface Form {
  address: string;
  city: string;
  county: string;
  zip: string;
  lat: number | null;
  lng: number | null;
  price: string;
  beds: string;
  baths: string;
  sqft: string;
  conc: string;
  loans: Record<LoanType, boolean>;
  down: number;
  taxes: string;
  ins: string;
  hoa: string;
  photos: FormPhoto[];
  rights: boolean;
  link: string;
}

const blank = (): Form => ({
  address: "",
  city: "",
  county: "",
  zip: "",
  lat: null,
  lng: null,
  price: "",
  beds: "",
  baths: "",
  sqft: "",
  conc: "10000",
  loans: { Conventional: true, FHA: true, VA: false },
  down: 5,
  taxes: "",
  ins: "",
  hoa: "",
  photos: [],
  rights: false,
  link: "",
});

const fromListing = (l: Listing): Form => ({
  address: l.address,
  city: l.city,
  county: l.county,
  zip: l.zip ?? "",
  lat: l.lat,
  lng: l.lng,
  price: String(l.price),
  beds: String(l.beds),
  baths: String(l.baths),
  sqft: String(l.sqft),
  conc: String(l.concession),
  loans: { Conventional: l.loanTypes.includes("Conventional"), FHA: l.loanTypes.includes("FHA"), VA: l.loanTypes.includes("VA") },
  down: l.defaultDownPct,
  taxes: l.taxesYr != null ? String(l.taxesYr) : "",
  ins: l.insuranceYr != null ? String(l.insuranceYr) : "",
  hoa: l.hoaMo != null ? String(l.hoaMo) : "",
  photos: l.photos.map((p) => ({ id: p.path ?? p.url, url: p.url, path: p.path })),
  rights: l.photoRightsConfirmed,
  link: l.externalUrl ?? "",
});

const LINK_RE = /^https:\/\/(www\.)?(zillow|redfin)\.com\//i;

function stepValid(i: number, f: Form) {
  if (i === 0) return f.lat != null;
  if (i === 1) return num(f.price) > 0 && num(f.beds) > 0 && num(f.baths) > 0 && num(f.sqft) > 0;
  if (i === 2) return num(f.conc) > 0;
  if (i === 3) return LOAN_TYPES.some((t) => f.loans[t]);
  if (i === 4) return f.photos.length > 0 && f.rights && (!f.link.trim() || LINK_RE.test(f.link.trim()));
  return true;
}

const STEP_LABELS = ["Address", "Property", "Concession", "Buyer defaults", "Photos & links", "Preview"];
const HINTS = [
  "Pick an address from the list to continue.",
  "Enter price, beds, baths and square feet.",
  "Enter a concession amount.",
  "Pick at least one loan type.",
  "Add at least one photo and confirm you have the right to post it.",
  "",
];

export function PostWizard({ rateInfo, userId, editing }: { rateInfo: RateInfo; userId: string; editing?: Listing }) {
  const router = useRouter();
  const toast = useToast();
  const desk = useIsDesktop();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(() => (editing ? fromListing(editing) : blank()));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => scroller.current?.scrollTo({ top: 0 }), [step]);

  // Address typeahead
  const [sugg, setSugg] = useState<Suggestion[]>([]);
  const [lookupErr, setLookupErr] = useState<string | null>(null);
  useEffect(() => {
    if (f.lat != null) return;
    const q = f.address.trim();
    if (q.length < 3) {
      setSugg([]);
      return;
    }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, { signal: ctl.signal });
        const j = await r.json();
        setSugg(j.suggestions ?? []);
        setLookupErr(j.error ?? (j.suggestions?.length ? null : "No matches in Boone, Hamilton, Hancock, Hendricks, Johnson or Marion County."));
      } catch {
        /* aborted */
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [f.address, f.lat]);

  const price = num(f.price) || 350000;
  const conc = num(f.conc);
  const ptype = LOAN_TYPES.find((t) => f.loans[t]) ?? "Conventional";
  const pdown = Math.max(f.down, MIN_DOWN[ptype]);
  const rate = rateFor(rateInfo, ptype);
  const pc = useMemo(() => calc(price, conc, ptype, pdown, 0, rate), [price, conc, ptype, pdown, rate]);
  const pb = pc.best;
  const unlocks = pc.opts.filter((o) => o.key !== "cut");
  const unlockedN = unlocks.filter((o) => o.state === "unlocked").length;
  // Permanent buydowns aren't priced (lender pricing), so the meter counts the other options.
  const pricedN = unlocks.filter((o) => o.state !== "ask").length;
  const low = pb ? pb.y1 : pc.cut;
  const lowWhen = pb ? (pb.key === "perm" ? "for life" : "in year 1") : "with a price cut";

  const valid = stepValid(step, f);
  const nextLabel = step === 5 ? (editing ? "Save changes" : "Publish listing") : step === 4 ? "Preview listing" : "Continue";
  const titles = [
    "Where is the home?",
    "Property details",
    "How much will the seller pay?",
    "Buyer defaults",
    "Photos and links",
    editing ? "Review your changes" : "Preview your listing",
  ];

  const publish = async () => {
    setBusy(true);
    setErr(null);
    const body = {
      address: f.address,
      city: f.city,
      county: f.county,
      zip: f.zip || null,
      lat: f.lat,
      lng: f.lng,
      price: num(f.price),
      beds: num(f.beds),
      baths: num(f.baths),
      sqft: num(f.sqft),
      concession: conc,
      loanTypes: LOAN_TYPES.filter((t) => f.loans[t]),
      defaultDownPct: f.down,
      taxesYr: f.taxes ? num(f.taxes) : null,
      insuranceYr: f.ins ? num(f.ins) : null,
      hoaMo: f.hoa ? num(f.hoa) : null,
      photos: f.photos.map((p) => ({ url: p.url, ...(p.path ? { path: p.path } : {}) })),
      photoRightsConfirmed: f.rights,
      externalUrl: f.link.trim() || null,
    };
    const res = await fetch(editing ? `/api/listings/${editing.id}` : "/api/listings", {
      method: editing ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? "Couldn't save the listing. Try again.");
      return;
    }
    toast(editing ? "Changes saved. Your listing is updated." : "Listing published. It is live on the map for 30 days.");
    router.push("/agent");
    router.refresh();
  };

  const next = () => {
    if (!valid || busy) return;
    if (step === 5) publish();
    else setStep(step + 1);
  };

  const card = {
    badge: conc ? `${kUsd(conc)} from seller` : "Concession",
    price: num(f.price) ? usd(num(f.price)) : "$—",
    specs: `${f.beds || "—"} bd · ${f.baths || "—"} ba · ${num(f.sqft) ? num(f.sqft).toLocaleString("en-US") : "—"} sq ft`,
    addr: f.lat != null ? `${f.address}, ${f.city}` : "Address",
  };
  const PreviewCard = (
    <div className="flex flex-col overflow-hidden rounded-[20px] border border-divider bg-bg">
      <div className="relative grid aspect-video place-items-center bg-neutral-300 text-neutral-600">
        {f.photos[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={f.photos[0].url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <House size={36} strokeWidth={1.25} />
        )}
        <span className="tag absolute top-2.5 left-2.5 bg-accent text-xs font-bold text-white">{card.badge}</span>
      </div>
      <div className="flex flex-col gap-0.5 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xl font-bold">{card.price}</span>
          <span className="text-xs text-neutral-700">{card.specs}</span>
        </div>
        <div className="text-[13px] text-neutral-700">{card.addr}</div>
        <div className="mt-2 rounded-xl bg-accent-100 px-3 py-2.5 text-sm">
          As low as <strong className="text-lg text-accent">{usd(low)}/mo</strong> {lowWhen}
        </div>
      </div>
    </div>
  );

  const money = (k: "price" | "taxes" | "ins" | "hoa", label: string, ph: string) => (
    <div className="field">
      <label htmlFor={`w-${k}`}>{label}</label>
      <input
        id={`w-${k}`}
        className="input"
        inputMode="numeric"
        placeholder={ph}
        value={commas(f[k])}
        onChange={(e) => set(k, digitsOnly(e.target.value))}
      />
    </div>
  );

  return (
    <div ref={scroller} className="min-h-0 flex-1 overflow-auto">
      <div className="mx-auto max-w-[1080px] p-4 lg:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h1 className="text-[26px] lg:text-[32px]">{titles[step]}</h1>
          <span className="text-xs text-neutral-700">About 2 minutes · Step {step + 1} of 6</span>
        </div>
        <div className="mt-4 mb-6 grid grid-cols-6 gap-1">
          {STEP_LABELS.map((label, i) => (
            <button
              key={label}
              onClick={() => {
                for (let j = 0; j < i; j++) if (!stepValid(j, f)) return;
                setStep(i);
              }}
              className="flex min-w-0 cursor-pointer flex-col gap-1.5 text-left"
              aria-current={i === step ? "step" : undefined}
            >
              <span className="h-1.5 rounded-full" style={{ background: i <= step ? "var(--color-accent)" : "var(--color-neutral-300)" }} />
              <span
                className="text-[11px] leading-[1.2]"
                style={{ fontWeight: i === step ? 800 : 400, color: i === step ? "var(--color-ink)" : "var(--color-neutral-700)" }}
              >
                {label}
              </span>
            </button>
          ))}
        </div>

        <div className="grid items-start gap-8" style={{ gridTemplateColumns: desk && step < 5 ? "minmax(0,1fr) 320px" : "minmax(0,1fr)" }}>
          <div className="flex min-w-0 flex-col gap-4">
            {step === 0 && (
              <>
                <div className="field">
                  <label htmlFor="w-addr">Street address</label>
                  <input
                    id="w-addr"
                    className="input"
                    autoComplete="off"
                    placeholder="Start typing, e.g. 12135 Ashland Dr"
                    value={f.address}
                    onChange={(e) => setF((s) => ({ ...s, address: e.target.value, lat: null, lng: null, city: "", county: "", zip: "" }))}
                  />
                </div>
                {f.lat == null && sugg.length > 0 && (
                  <div className="-mt-2 flex flex-col overflow-hidden rounded-[14px] border border-divider shadow-md" role="listbox">
                    {sugg.map((a) => (
                      <button
                        key={`${a.address}-${a.lat}`}
                        role="option"
                        aria-selected={false}
                        onClick={() => setF((s) => ({ ...s, address: a.address, city: a.city, county: a.county, zip: a.zip ?? "", lat: a.lat, lng: a.lng }))}
                        className="flex min-h-11 cursor-pointer items-center gap-2 border-b border-divider p-3 text-left text-sm leading-[1.35] last:border-b-0 hover:bg-accent-100"
                      >
                        <MapPin size={16} className="flex-none" />
                        <span className="min-w-0 flex-1">
                          <strong>{a.address}</strong>, {a.city}, IN {a.zip}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {f.lat == null && f.address.trim().length >= 3 && !sugg.length && lookupErr && (
                  <div className="-mt-2 text-xs text-neutral-700">{lookupErr}</div>
                )}
                <div className="relative h-60 overflow-hidden rounded-[18px] border border-divider bg-neutral-200">
                  <MapErrorBoundary className="absolute inset-0">
                  <LeafletMap
                    className="absolute inset-0"
                    interactive={false}
                    zoomControl={false}
                    center={f.lat != null ? [f.lat, f.lng!] : [39.8, -86.15]}
                    zoom={f.lat != null ? 13 : 9}
                    pins={f.lat != null ? [{ id: "new", lat: f.lat, lng: f.lng!, label: conc ? kUsd(conc) : "New", title: f.address }] : []}
                    selectedId="new"
                  />
                  </MapErrorBoundary>
                  {f.lat == null && (
                    <div className="tag tag-neutral absolute bottom-3 left-3 z-[500]">Pick an address to drop the pin</div>
                  )}
                </div>
                {f.lat != null && (
                  <div className="text-[13px] text-neutral-800">
                    Pin placed in {f.city}, {f.county} County.
                  </div>
                )}
              </>
            )}

            {step === 1 && (
              <>
                {money("price", "List price", "$350,000")}
                <div className="grid grid-cols-3 gap-3">
                  <div className="field">
                    <label htmlFor="w-beds">Beds</label>
                    <input id="w-beds" className="input" inputMode="numeric" placeholder="3" value={f.beds} onChange={(e) => set("beds", digitsOnly(e.target.value))} />
                  </div>
                  <div className="field">
                    <label htmlFor="w-baths">Baths</label>
                    <input id="w-baths" className="input" inputMode="decimal" placeholder="2" value={f.baths} onChange={(e) => set("baths", e.target.value.replace(/[^0-9.]/g, ""))} />
                  </div>
                  <div className="field">
                    <label htmlFor="w-sqft">Sq ft</label>
                    <input
                      id="w-sqft"
                      className="input"
                      inputMode="numeric"
                      placeholder="1,850"
                      value={f.sqft ? Number(f.sqft).toLocaleString("en-US") : ""}
                      onChange={(e) => set("sqft", digitsOnly(e.target.value))}
                    />
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="field">
                  <label htmlFor="w-conc">Seller concession amount</label>
                  <input
                    id="w-conc"
                    className="input !min-h-[52px] !text-2xl !font-bold"
                    inputMode="numeric"
                    value={commas(f.conc)}
                    onChange={(e) => set("conc", digitsOnly(e.target.value))}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {[5000, 10000, 15000].map((v) => {
                    const on = conc === v;
                    return (
                      <button
                        key={v}
                        className="btn btn-flush min-h-[52px] min-w-[84px] flex-1 rounded-full text-xl tracking-[-0.02em]"
                        aria-pressed={on}
                        onClick={() => set("conc", String(v))}
                        style={{
                          border: `2px solid ${on ? "var(--color-accent)" : "var(--color-divider)"}`,
                          background: on ? "var(--color-accent)" : "transparent",
                          color: on ? "#fff" : "var(--color-ink)",
                        }}
                      >
                        {kUsd(v)}
                      </button>
                    );
                  })}
                </div>
                <input
                  className="range"
                  type="range"
                  min={0}
                  max={25000}
                  step={500}
                  value={Math.min(conc, 25000)}
                  onChange={(e) => set("conc", e.target.value)}
                  aria-label="Concession amount"
                />
                <div className="flex flex-col gap-2.5 rounded-[18px] bg-accent-100 p-4 text-ink">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[11px] font-semibold">Options unlocked</span>
                    <span className="text-[32px] leading-none font-bold tracking-[-0.03em]">
                      {unlockedN}
                      <span className="text-[15px] text-neutral-600"> / {pricedN}</span>
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {unlocks.filter((o) => o.state !== "ask").map((o) => (
                      <span
                        key={o.key}
                        className="h-2.5 flex-1 rounded-full transition-[background] duration-300"
                        style={{
                          background:
                            o.state === "unlocked"
                              ? "var(--color-accent)"
                              : o.state === "over"
                                ? "var(--color-warn-border)"
                                : "var(--color-neutral-300)",
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2.5 pt-1.5">
                  <div className="text-[11px] text-neutral-700">What buyers will see</div>
                  <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
                    <div>
                      <div className="text-[13px]">As low as</div>
                      <div className="text-[48px] leading-none font-bold tracking-[-0.03em] text-accent">
                        <CountUp value={low} />
                        <span className="text-[15px] tracking-normal">/mo</span>
                      </div>
                    </div>
                    <div className="pb-1 text-sm">
                      {lowWhen}, vs. <span className="line-through">{usd(pc.cut)}</span> with a price cut
                    </div>
                  </div>
                  <div className="flex flex-col">
                    {unlocks.map((o) => (
                      <div key={o.key} className="flex items-center gap-2.5 border-b border-divider py-2.5">
                        <span className="flex-1 text-sm font-semibold" style={{ opacity: o.state === "unlocked" ? 1 : 0.6 }}>
                          {o.name}
                        </span>
                        <span className="text-[13px] text-neutral-700">{o.costLabel}</span>
                        <StatePill state={o.state} style={{ minWidth: 96 }} />
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-neutral-700">
                    Based on {num(f.price) ? usd(price) : "a sample $350,000 price"}, {ptype}, {pdown}% down, {pct(rate)} {rateNoun(rateInfo)}.
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="field">
                  <span className="field-label">Loan types accepted</span>
                  <div className="flex flex-wrap gap-2">
                    {LOAN_TYPES.map((t) => (
                      <label
                        key={t}
                        className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-semibold"
                        style={{
                          border: `1px solid ${f.loans[t] ? "var(--color-accent)" : "var(--color-divider)"}`,
                          background: f.loans[t] ? "var(--color-accent-100)" : "transparent",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={f.loans[t]}
                          onChange={() => setF((s) => ({ ...s, loans: { ...s.loans, [t]: !s.loans[t] } }))}
                          className="m-0 h-[18px] w-[18px] accent-accent"
                        />
                        {t}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <span className="field-label">Default down payment</span>
                  <Segmented
                    label="Default down payment"
                    optClassName="min-h-11"
                    value={f.down}
                    onChange={(v) => set("down", v)}
                    options={[3, 3.5, 5, 10, 20].map((v) => ({ value: v, label: v + "%" }))}
                  />
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
                  {money("taxes", "Property taxes / yr", "$4,200")}
                  {money("ins", "Insurance / yr", "$1,500")}
                  {money("hoa", "HOA / mo", "$0")}
                </div>
                <div className="text-xs text-neutral-700">
                  Buyers can change these on the listing. Taxes, insurance and HOA show as notes; payment comparisons use principal and interest.
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div className="field">
                  <span className="field-label">Photos ({f.photos.length} of 7) · drag to reorder, first photo is the cover</span>
                  <PhotoGrid photos={f.photos} onChange={(p) => set("photos", p)} userId={userId} />
                </div>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-[14px] bg-surface p-3.5 text-sm">
                  <input
                    type="checkbox"
                    checked={f.rights}
                    onChange={() => set("rights", !f.rights)}
                    className="mt-0.5 h-[18px] w-[18px] flex-none accent-accent"
                  />
                  <span>
                    {PHOTO_RIGHTS} <span className="text-neutral-700">(Required)</span>
                  </span>
                </label>
                <div className="field">
                  <label htmlFor="w-link">Zillow or Redfin link (optional)</label>
                  <input
                    id="w-link"
                    className="input"
                    inputMode="url"
                    placeholder="https://www.zillow.com/homedetails/…"
                    value={f.link}
                    onChange={(e) => set("link", e.target.value)}
                  />
                  {f.link.trim() && !LINK_RE.test(f.link.trim()) && (
                    <div className="mt-1 text-xs text-warn-text">Use a full zillow.com or redfin.com link.</div>
                  )}
                </div>
              </>
            )}

            {step === 5 && (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] items-start gap-4">
                {PreviewCard}
                <div className="flex flex-col text-sm">
                  {[
                    ["Address", `${f.address}, ${f.city}, IN${f.zip ? " " + f.zip : ""}`],
                    ["Price", usd(num(f.price))],
                    ["Beds / baths / sq ft", `${f.beds} / ${f.baths} / ${num(f.sqft).toLocaleString("en-US")}`],
                    ["Seller concession", usd(conc)],
                    ["Loan types", LOAN_TYPES.filter((t) => f.loans[t]).join(", ")],
                    ["Default down payment", f.down + "%"],
                    ["Photos", String(f.photos.length)],
                    ["Zillow/Redfin link", f.link.trim() || "None"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 border-b border-divider py-2">
                      <span className="text-neutral-700">{k}</span>
                      <span className="text-right font-semibold break-all">{v}</span>
                    </div>
                  ))}
                  <div className="mt-2 text-xs text-neutral-700">
                    Listings stay live for 30 days. You can renew, edit, or mark them pending or sold from My listings.
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 border-t border-divider pt-4">
              {step > 0 && (
                <button className="btn btn-secondary min-h-12" onClick={() => setStep(step - 1)}>
                  <ArrowLeft size={16} />
                  Back
                </button>
              )}
              <button
                className="btn btn-primary btn-flush min-h-12 flex-1 px-4 text-[15px]"
                onClick={next}
                disabled={!valid || busy}
              >
                {busy ? "Saving…" : nextLabel}
                <ArrowRight size={16} className="ml-auto" />
              </button>
            </div>
            {!valid && <div className="-mt-2 text-xs text-neutral-700">{HINTS[step]}</div>}
            {err && <div className="-mt-2 text-xs text-warn-text">{err}</div>}
          </div>

          {desk && step < 5 && (
            <div className="sticky top-4 flex flex-col gap-2.5">
              <div className="text-[11px] text-neutral-700">Live preview</div>
              {PreviewCard}
              <div className="text-xs text-neutral-700">
                {unlockedN} of {pricedN} options unlocked at {conc ? usd(conc) : "$0"}.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

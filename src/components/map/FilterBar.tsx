"use client";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PriceRange } from "@/components/ui/DualRange";
import { Segmented } from "@/components/ui/Segmented";
import type { LoanType } from "@/lib/buydown";
import { COUNTIES } from "@/lib/types";

export interface Filters {
  county: string;
  min: number;
  max: number;
  conc: number;
  loan: LoanType | "Any";
}
export const NO_FILTERS: Filters = { county: "All counties", min: 0, max: 0, conc: 0, loan: "Any" };

const short = (n: number) => (n >= 1_000_000 ? `$${+(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n / 1000)}k`);
const priceLabel = (min: number, max: number) =>
  min && max ? `${short(min)}–${short(max)}` : min ? `${short(min)}+` : max ? `Up to ${short(max)}` : "Price";

/** A pill that opens a small panel underneath it. */
function Pill({ label, active, children, width = 300 }: { label: string; active: boolean; children: ReactNode; width?: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-sm font-semibold whitespace-nowrap"
        style={{
          borderColor: active ? "var(--color-accent)" : "var(--color-divider)",
          background: active ? "var(--color-accent-100)" : "var(--color-bg)",
        }}
      >
        {label}
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-[900] mt-2 rounded-[16px] border border-divider bg-bg p-4 shadow-lg" style={{ width }}>
          {children}
        </div>
      )}
    </div>
  );
}

/** Filters as a row of pills across the top of the map (desktop). */
export function FilterBar({ f, setF, right }: { f: Filters; setF: (fn: (s: Filters) => Filters) => void; right?: ReactNode }) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setF((s) => ({ ...s, [k]: v }));
  const any = f.county !== NO_FILTERS.county || f.min || f.max || f.conc || f.loan !== "Any";
  return (
    <div className="flex items-center gap-2 border-b border-divider bg-bg px-4 py-2.5">
      <Pill label={f.county === NO_FILTERS.county ? "County" : `${f.county} County`} active={f.county !== NO_FILTERS.county} width={240}>
        <div className="flex flex-col gap-1">
          {["All counties", ...COUNTIES].map((c) => (
            <label key={c} className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-[10px] px-2 text-sm hover:bg-surface">
              <input type="radio" name="f-county" checked={f.county === c} onChange={() => set("county", c)} className="accent-accent" />
              {c}
            </label>
          ))}
        </div>
      </Pill>
      <Pill label={priceLabel(f.min, f.max)} active={!!(f.min || f.max)} width={360}>
        <PriceRange min={f.min} max={f.max} onChange={(min, max) => setF((s) => ({ ...s, min, max }))} />
      </Pill>
      <Pill label={f.conc ? `Concession $${f.conc / 1000}k+` : "Concession"} active={!!f.conc} width={340}>
        <div className="mb-2 text-[13px] font-semibold">Minimum seller concession</div>
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
      </Pill>
      <Pill label={f.loan === "Any" ? "Loan type" : f.loan} active={f.loan !== "Any"} width={340}>
        <div className="mb-2 text-[13px] font-semibold">Loan type</div>
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
      </Pill>
      {any ? (
        <button type="button" className="btn btn-ghost min-h-10 text-[13px]" onClick={() => setF(() => NO_FILTERS)}>
          Clear
        </button>
      ) : null}
      <div className="ml-auto flex items-center gap-2">{right}</div>
    </div>
  );
}

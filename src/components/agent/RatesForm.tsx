"use client";
import { ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LOAN_TYPES, pct, type LoanType } from "@/lib/buydown";
import { longDate, type RateInfo } from "@/lib/rate-info";

const KEY: Record<LoanType, "conventional" | "fha" | "va"> = { Conventional: "conventional", FHA: "fha", VA: "va" };

export function RatesForm({
  live,
  today,
  last,
}: {
  live: RateInfo;
  today: string;
  last: { date: string; conventional: number; fha: number; va: number } | null;
}) {
  const router = useRouter();
  const [v, setV] = useState<Record<LoanType, string>>(() => ({
    Conventional: last ? String(last.conventional) : "",
    FHA: last ? String(last.fha) : "",
    VA: last ? String(last.va) : "",
  }));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const enteredToday = live.source === "daily";

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = Object.fromEntries(LOAN_TYPES.map((t) => [KEY[t], parseFloat(v[t])]));
    if (Object.values(body).some((n) => !(n >= 1 && n <= 20))) {
      setErr("Enter each rate as a percent, e.g. 7.125.");
      return;
    }
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/rates", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (!res.ok) {
      setErr((await res.json().catch(() => ({}))).error ?? "Couldn't save. Try again.");
      return;
    }
    setSaved(true);
    router.refresh();
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <div>
        <h1 className="text-[26px] lg:text-[32px]">Today&apos;s rates</h1>
        <p className="mt-1 mb-0 text-sm text-neutral-700">
          Enter Rate&apos;s 30-year fixed rates for {longDate(today)}. If you skip a day, the site uses the Freddie Mac weekly average.
        </p>
      </div>

      <div
        className="flex flex-col gap-1 rounded-[18px] p-4 text-sm"
        style={{ background: enteredToday ? "var(--color-accent-100)" : "var(--color-warn-bg)" }}
      >
        <span className="text-[11px] font-semibold">The site is using now</span>
        {enteredToday ? (
          <span>
            <strong>Your rates for today:</strong> Conventional {pct(live.rates.Conventional)} · FHA {pct(live.rates.FHA)} · VA {pct(live.rates.VA)}
          </span>
        ) : (
          <span>
            <strong>Freddie Mac fallback:</strong> {pct(live.rates.Conventional)} for every loan type, week of {longDate(live.date)}.
            {" "}No rates entered for today yet.
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {LOAN_TYPES.map((t) => (
          <div className="field" key={t}>
            <label htmlFor={`r-${t}`}>{t} 30-yr</label>
            <div className="relative">
              <input
                id={`r-${t}`}
                className="input pr-7"
                inputMode="decimal"
                placeholder="7.125"
                value={v[t]}
                onChange={(e) => {
                  setSaved(false);
                  setV((s) => ({ ...s, [t]: e.target.value.replace(/[^0-9.]/g, "") }));
                }}
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-neutral-600">%</span>
            </div>
          </div>
        ))}
      </div>
      {last && !enteredToday && (
        <div className="-mt-2 text-xs text-neutral-700">Prefilled from your last entry ({longDate(last.date)}). Check them before saving.</div>
      )}
      {err && <div className="-mt-2 text-xs text-warn-text">{err}</div>}
      <button className="btn btn-primary btn-flush min-h-12 px-4 text-[15px]" disabled={busy}>
        {busy ? "Saving…" : saved ? "Saved" : enteredToday ? "Update today's rates" : "Save today's rates"}
        {saved ? <Check size={16} className="ml-auto" /> : <ArrowRight size={16} className="ml-auto" />}
      </button>
      <p className="m-0 text-xs text-neutral-700">
        {/* COMPLIANCE: showing Rate's own rates publicly is rate advertising (APR, assumptions, date). */}
        Rates you enter appear on every listing until midnight in Indianapolis. Showing Rate&apos;s own rates publicly needs
        compliance sign-off on the rate disclosure.
      </p>
    </form>
  );
}

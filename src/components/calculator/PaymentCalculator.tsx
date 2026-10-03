"use client";
import { useMemo, useState } from "react";
import { APR_ASSUMPTION } from "@/lib/ad-terms";
import { aprLabel } from "@/lib/apr";
import { pct, usd } from "@/lib/buydown";
import { paymentBreakdown } from "@/lib/payment";

const num = (s: string) => Number(s.replace(/[^0-9.]/g, "")) || 0;
const money = (s: string) => {
  const n = num(s);
  return n ? Math.round(n).toLocaleString("en-US") : "";
};
const TERMS = [30, 20, 15];

const COLORS = { pi: "var(--color-accent)", taxes: "#76808c", insurance: "#a9b4c2", hoa: "#d0d7e1", mi: "#5b8fd6" };

/** Basic monthly payment estimate, like a standard mortgage calculator. Estimates only. */
export function PaymentCalculator({ rate: marketRate, rateNote }: { rate: number; rateNote: string }) {
  const [price, setPrice] = useState("400,000");
  const [downPct, setDownPct] = useState("10");
  const [rate, setRate] = useState(String(marketRate));
  const [years, setYears] = useState(30);
  const [taxes, setTaxes] = useState("");
  const [ins, setIns] = useState("");
  const [hoa, setHoa] = useState("");

  const p = num(price);
  const d = Math.min(Math.max(num(downPct), 0), 100);
  const r = useMemo(
    () =>
      p > 0 && num(rate) > 0
        ? paymentBreakdown({ price: p, downPct: d, rate: num(rate), years, taxesYr: taxes ? num(taxes) : null, insuranceYr: ins ? num(ins) : null, hoaMo: num(hoa) })
        : null,
    [p, d, rate, years, taxes, ins, hoa],
  );

  const rows = r
    ? ([
        ["pi", "Principal & interest", r.parts.pi],
        ["taxes", `Property taxes${r.taxesEstimated ? " (est.)" : ""}`, r.parts.taxes],
        ["insurance", `Homeowners insurance${r.insuranceEstimated ? " (est.)" : ""}`, r.parts.insurance],
        ["mi", "Mortgage insurance (est.)", r.parts.mi],
        ["hoa", "HOA dues", r.parts.hoa],
      ] as const).filter(([, , v]) => v > 0)
    : [];
  const payoff = new Date();
  payoff.setMonth(payoff.getMonth() + years * 12);

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="mx-auto grid max-w-[1080px] gap-8 p-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:p-8">
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-[26px] lg:text-[32px]">Payment calculator</h1>
            <p className="m-0 mt-1 text-sm text-neutral-700">A starting place: a rough monthly payment for a home price. Every number here is an estimate.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="field">
              <label htmlFor="pc-price">Home price</label>
              <input id="pc-price" className="input" inputMode="numeric" value={price ? `$${price}` : ""} onChange={(e) => setPrice(money(e.target.value))} />
            </div>
            <div className="field">
              <label htmlFor="pc-down">Down payment</label>
              <div className="flex gap-2">
                <div className="relative w-[110px] flex-none">
                  <input id="pc-down" className="input pr-7" inputMode="decimal" value={downPct} onChange={(e) => setDownPct(e.target.value.replace(/[^0-9.]/g, ""))} />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-neutral-600">%</span>
                </div>
                <input
                  aria-label="Down payment in dollars"
                  className="input"
                  inputMode="numeric"
                  value={p ? `$${Math.round((p * d) / 100).toLocaleString("en-US")}` : ""}
                  onChange={(e) => p && setDownPct(String(+((num(e.target.value) / p) * 100).toFixed(2)))}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="pc-rate">Interest rate</label>
              <div className="relative">
                <input id="pc-rate" className="input pr-7" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value.replace(/[^0-9.]/g, ""))} />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-neutral-600">%</span>
              </div>
              <span className="mt-1 text-[11px] text-neutral-700">Starts at {pct(marketRate)} {rateNote}. Change it to try others.</span>
            </div>
            <div className="field">
              <span className="field-label">Loan term</span>
              <div className="flex gap-2">
                {TERMS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={years === t}
                    onClick={() => setYears(t)}
                    className="min-h-11 flex-1 cursor-pointer rounded-full text-sm font-semibold"
                    style={{ border: `1px solid ${years === t ? "var(--color-accent)" : "var(--color-divider)"}`, background: years === t ? "var(--color-accent-100)" : "transparent" }}
                  >
                    {t} years
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-[17px]">Optional</h2>
            <p className="m-0 mt-0.5 text-[13px] text-neutral-700">Leave taxes and insurance blank to use a rough estimate from the price.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="field">
              <label htmlFor="pc-tax">Property taxes / year</label>
              <input id="pc-tax" className="input" inputMode="numeric" placeholder={r ? `≈ ${usd(r.parts.taxes * 12)}` : ""} value={taxes ? `$${taxes}` : ""} onChange={(e) => setTaxes(money(e.target.value))} />
            </div>
            <div className="field">
              <label htmlFor="pc-ins">Insurance / year</label>
              <input id="pc-ins" className="input" inputMode="numeric" placeholder={r ? `≈ ${usd(r.parts.insurance * 12)}` : ""} value={ins ? `$${ins}` : ""} onChange={(e) => setIns(money(e.target.value))} />
            </div>
            <div className="field">
              <label htmlFor="pc-hoa">HOA dues / month</label>
              <input id="pc-hoa" className="input" inputMode="numeric" placeholder="$0" value={hoa ? `$${hoa}` : ""} onChange={(e) => setHoa(money(e.target.value))} />
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="flex flex-col gap-4 rounded-[22px] border border-divider bg-bg p-5 shadow-sm">
            {!r ? (
              <div className="text-sm text-neutral-700">Enter a price and rate to see an estimate.</div>
            ) : (
              <>
                <div>
                  <div className="text-[13px] font-semibold text-neutral-700">Estimated monthly payment</div>
                  <div className="text-[44px] leading-none font-bold tracking-[-0.02em] text-accent">{usd(r.total)}</div>
                </div>
                <div className="flex h-3 overflow-hidden rounded-full bg-neutral-200" aria-hidden>
                  {rows.map(([k, , v]) => (
                    <span key={k} style={{ width: `${(v / r.total) * 100}%`, background: COLORS[k] }} />
                  ))}
                </div>
                <div className="flex flex-col">
                  {rows.map(([k, label, v]) => (
                    <div key={k} className="flex items-center justify-between gap-3 py-1 text-sm">
                      <span className="flex items-center gap-2 text-neutral-800">
                        <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: COLORS[k] }} />
                        {label}
                      </span>
                      <span className="font-semibold">{usd(v)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-divider pt-3 text-sm">
                  {[
                    ["Loan amount", usd(r.loan)],
                    ["Down payment", usd(r.down)],
                    [`Interest over ${years} years`, usd(r.totalInterest)],
                    ["Paid off", payoff.toLocaleDateString("en-US", { month: "short", year: "numeric" })],
                  ].map(([a, b]) => (
                    <div key={a} className="flex justify-between gap-3 py-1">
                      <span className="text-neutral-700">{a}</span>
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
                <p className="m-0 rounded-[12px] bg-surface p-3 text-[12px] leading-snug text-neutral-800">
                  {`Estimates only, not a loan offer or a promise of any rate or payment. Example: ${usd(p)} price, ${d}% down (${usd(r.down)}), ${years}-year fixed, ${r.n} monthly payments at ${pct(num(rate))} (${aprLabel(r.apr)} APR). ${APR_ASSUMPTION} Taxes and insurance are rough estimates unless you enter your own${r.parts.mi ? "; mortgage insurance is a rough conventional-loan estimate and usually ends once you reach enough equity" : ""}. FHA and VA loans have different fees. Your actual rate and payment depend on your credit, the property, and the lender you choose.`}
                </p>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

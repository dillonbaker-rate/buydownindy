"use client";
import { useMemo, useState, type ReactNode } from "react";
import { CREDIT_RANGES, LOAN_TYPES, MIN_DOWN, pct, usd, type LoanType } from "@/lib/buydown";
import { buydownName, offerMath, type BuydownGoal, type ClosingGoal } from "@/lib/offer";
import { APR_ASSUMPTION } from "@/lib/ad-terms";
import { aprLabel, estimateApr } from "@/lib/apr";

const num = (s: string) => Number(s.replace(/[^0-9.]/g, "")) || 0;
const money = (s: string) => {
  const n = num(s);
  return n ? n.toLocaleString("en-US") : "";
};

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className="min-h-11 cursor-pointer rounded-full px-4 text-sm font-semibold"
      style={{ border: `1px solid ${on ? "var(--color-accent)" : "var(--color-divider)"}`, background: on ? "var(--color-accent-100)" : "transparent" }}
    >
      {children}
    </button>
  );
}

function Q({ n, title, hint, children }: { n: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <div>
        <h2 className="text-[17px]">
          <span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-full bg-accent text-[13px] text-white">{n}</span>
          {title}
        </h2>
        {hint && <p className="m-0 mt-0.5 text-[13px] text-neutral-700">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 py-1 text-sm ${strong ? "font-bold" : ""}`}>
      <span className={strong ? "" : "text-neutral-700"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function OfferCalculator({
  rates,
  rateNote,
  initial,
}: {
  rates: Record<LoanType, number>;
  rateNote: string;
  initial?: { price?: number; type?: LoanType; down?: number; address?: string };
}) {
  const [price, setPrice] = useState(initial?.price ? initial.price.toLocaleString("en-US") : "");
  const [type, setType] = useState<LoanType>(initial?.type ?? "Conventional");
  const [down, setDown] = useState(String(initial?.down ?? 5));
  const [tier, setTier] = useState(0);
  const [buydown, setBuydown] = useState<BuydownGoal>(2);
  const [target, setTarget] = useState("");
  const [closing, setClosing] = useState<ClosingGoal>("all");
  const [custom, setCustom] = useState("");

  const p = num(price);
  const d = Math.max(num(down), MIN_DOWN[type]);
  const r = useMemo(
    () =>
      p >= 50_000
        ? offerMath({
            price: p,
            type,
            down: d,
            creditTier: tier,
            baseRate: rates[type],
            buydown,
            targetPayment: num(target),
            closing,
            customClosing: num(custom),
          })
        : null,
    [p, type, d, tier, rates, buydown, target, closing, custom],
  );

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="mx-auto grid max-w-[1080px] gap-8 p-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:p-8">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-[26px] lg:text-[32px]">Buydown &amp; concession calculator</h1>
            <p className="m-0 mt-1 text-sm text-neutral-700">
              See how large a seller concession a buydown and closing costs add up to{initial?.address ? ` for ${initial.address}` : ""}, and what it does to the payment.
            </p>
          </div>

          <Q n={1} title="What's the price?">
            <div className="field max-w-[260px]">
              <label htmlFor="oc-price">Price</label>
              <input id="oc-price" className="input" inputMode="numeric" placeholder="$400,000" value={price ? `$${price}` : ""} onChange={(e) => setPrice(money(e.target.value))} />
            </div>
          </Q>

          <Q n={2} title="How is the buyer financing?">
            <div className="flex flex-wrap gap-2">
              {LOAN_TYPES.map((t) => (
                <Chip
                  key={t}
                  on={type === t}
                  onClick={() => {
                    setType(t);
                    setDown(String(Math.max(num(down), MIN_DOWN[t])));
                  }}
                >
                  {t}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="field w-[140px]">
                <label htmlFor="oc-down">Down payment %</label>
                <input id="oc-down" className="input" inputMode="decimal" value={down} onChange={(e) => setDown(e.target.value.replace(/[^0-9.]/g, ""))} />
              </div>
              {type === "Conventional" && d < 20 && (
                <div className="field w-[220px]">
                  <label htmlFor="oc-credit">Credit score (for mortgage insurance)</label>
                  <select id="oc-credit" className="input" value={tier} onChange={(e) => setTier(Number(e.target.value))}>
                    {CREDIT_RANGES.map((c, i) => (
                      <option key={c.label} value={i}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {num(down) < MIN_DOWN[type] && <div className="text-[13px] text-warn-text">{`${type} needs at least ${MIN_DOWN[type]}% down; using ${MIN_DOWN[type]}%.`}</div>}
          </Q>

          <Q n={3} title="Include a temporary buydown?" hint="A temporary buydown lowers the rate for the first years. The seller pays for it at closing.">
            <div className="flex flex-wrap gap-2">
              <Chip on={buydown === 0} onClick={() => setBuydown(0)}>
                No buydown
              </Chip>
              {([1, 2, 3] as const).map((k) => (
                <Chip key={k} on={buydown === k} onClick={() => setBuydown(k)}>
                  {buydownName(k).replace(" temporary buydown", "")}
                </Chip>
              ))}
              <Chip on={buydown === "payment"} onClick={() => setBuydown("payment")}>
                Hit a payment
              </Chip>
            </div>
            {buydown === "payment" && (
              <div className="field max-w-[260px]">
                <label htmlFor="oc-target">Year-1 principal &amp; interest</label>
                <input id="oc-target" className="input" inputMode="numeric" placeholder="$2,300" value={target ? `$${target}` : ""} onChange={(e) => setTarget(money(e.target.value))} />
              </div>
            )}
          </Q>

          <Q n={4} title="Include closing costs?" hint="Estimated from typical Indiana fees, title, prepaid interest, insurance, and tax escrow. Concessions can never pay the down payment.">
            <div className="flex flex-wrap gap-2">
              <Chip on={closing === "all"} onClick={() => setClosing("all")}>
                {r ? `All (~${usd(r.closingCosts)})` : "All"}
              </Chip>
              <Chip on={closing === "custom"} onClick={() => setClosing("custom")}>
                Some
              </Chip>
              <Chip on={closing === "none"} onClick={() => setClosing("none")}>
                None
              </Chip>
            </div>
            {closing === "custom" && (
              <div className="field max-w-[260px]">
                <label htmlFor="oc-cc">Amount toward closing costs</label>
                <input id="oc-cc" className="input" inputMode="numeric" placeholder="$5,000" value={custom ? `$${custom}` : ""} onChange={(e) => setCustom(money(e.target.value))} />
              </div>
            )}
          </Q>

        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="flex flex-col gap-4 rounded-[22px] border border-divider bg-bg p-5 shadow-sm">
            {!r ? (
              <div className="text-sm text-neutral-700">Enter a price to see the numbers.</div>
            ) : (
              <>
                <div>
                  <div className="text-[13px] font-semibold text-neutral-700">Total concession</div>
                  <div className="text-[44px] leading-none font-bold tracking-[-0.02em] text-accent">{usd(r.total)}</div>
                  <div className="mt-1 text-[13px] text-neutral-700">
                    {r.total > 0 ? "Buydown cost plus closing costs." : "No concession for what you picked."}
                  </div>
                </div>

                {r.over > 0 && (
                  <div className="rounded-[12px] p-3 text-[13px]" style={{ background: "var(--color-warn-bg)", border: "1px solid var(--color-warn-border)" }}>
                    <strong>Over the limit by {usd(r.over)}.</strong> {r.limitTxt}.
                  </div>
                )}
                {r.goalMissed && (
                  <div className="rounded-[12px] p-3 text-[13px]" style={{ background: "var(--color-warn-bg)", border: "1px solid var(--color-warn-border)" }}>
                    Even a 3-2-1 temporary buydown doesn&apos;t reach {`$${target}`} in year 1.
                  </div>
                )}

                <div className="border-t border-divider pt-3">
                  {r.k > 0 && <Row label={buydownName(r.k)} value={usd(r.buydownCost)} />}
                  {r.closingCredit > 0 && <Row label="Closing costs" value={usd(r.closingCredit)} />}
                  <Row label="Total concession" value={usd(r.total)} strong />
                  <Row label={`Program limit (${r.limitPct}%)`} value={usd(r.limit)} />
                  <Row label="Price minus concession" value={usd(r.price - r.total)} />
                </div>

                <div className="border-t border-divider pt-3">
                  <div className="mb-1 text-[13px] font-semibold">Buyer&apos;s payment (principal &amp; interest)</div>
                  {r.payments.byYear.map((v, i) => (
                    <Row key={i} label={`Year ${i + 1} at ${pct(r.rate - (r.k - i))}`} value={`${usd(v)}/mo`} />
                  ))}
                  <Row label={r.k ? `Year ${r.k + 1} on at ${pct(r.rate)}` : `Every month at ${pct(r.rate)}`} value={`${usd(r.payments.full)}/mo`} />
                  <Row label="Cash to close (down + closing − credit)" value={usd(r.cash.total)} />
                </div>


                <p className="m-0 text-[11px] leading-snug text-neutral-700">
                  {`Estimates using a ${pct(r.rate)} 30-year fixed ${rateNote} (${aprLabel(estimateApr(type, d, r.rate, r.price, tier))} APR; ${APR_ASSUMPTION.replace(/^APR is an estimate that assumes/, "assumes")}) Principal & interest only; taxes, insurance and mortgage insurance are extra. The rate is the same for every credit score. Closing costs are estimated from typical Indiana fees (no discount points), with property taxes at 1% of the price. Temporary buydowns require a signed contract, and the buyer qualifies at the full rate. Not a commitment to lend.`}
                </p>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

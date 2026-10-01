import { ArrowRight, Check, Lock, MessageCircle, TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { CLOSING_COST_PCT } from "@/content/program-rules";
import { saving, usd, type BuydownOption, type OptionState } from "@/lib/buydown";

interface StateStyle {
  bg: string;
  border: string;
  borderStyle: "solid" | "dashed";
  tagBg: string;
  tagFg: string;
  label: string;
  icon: ReactNode;
  dim: number;
  hi: string;
  note: string;
}

export const STATE_STYLE: Record<OptionState, StateStyle> = {
  unlocked: {
    bg: "var(--color-bg)",
    border: "var(--color-accent-300)",
    borderStyle: "solid",
    tagBg: "var(--color-accent)",
    tagFg: "#fff",
    label: "Unlocked",
    icon: <Check size={12} strokeWidth={2.5} />,
    dim: 1,
    hi: "var(--color-accent)",
    note: "var(--color-accent-700)",
  },
  locked: {
    bg: "transparent",
    border: "var(--color-neutral-400)",
    borderStyle: "dashed",
    tagBg: "var(--color-neutral-200)",
    tagFg: "var(--color-neutral-800)",
    label: "Locked",
    icon: <Lock size={12} />,
    dim: 0.45,
    hi: "var(--color-ink)",
    note: "var(--color-neutral-800)",
  },
  over: {
    bg: "var(--color-warn-bg)",
    border: "var(--color-warn-border)",
    borderStyle: "solid",
    tagBg: "var(--color-warn-tag)",
    tagFg: "var(--color-warn-text)",
    label: "Over limit",
    icon: <TriangleAlert size={12} />,
    dim: 0.55,
    hi: "var(--color-ink)",
    note: "var(--color-warn-text)",
  },
  ask: {
    bg: "var(--color-surface)",
    border: "var(--color-divider)",
    borderStyle: "solid",
    tagBg: "var(--color-neutral-200)",
    tagFg: "var(--color-neutral-800)",
    label: "Ask a lender",
    icon: <MessageCircle size={12} />,
    dim: 1,
    hi: "var(--color-ink)",
    note: "var(--color-neutral-800)",
  },
  avail: {
    bg: "var(--color-bg)",
    border: "var(--color-divider)",
    borderStyle: "solid",
    tagBg: "var(--color-neutral-200)",
    tagFg: "var(--color-neutral-800)",
    label: "Available",
    icon: null,
    dim: 1,
    hi: "var(--color-ink)",
    note: "var(--color-neutral-800)",
  },
};

export function StatePill({ state, style }: { state: OptionState; style?: CSSProperties }) {
  const st = STATE_STYLE[state];
  return (
    <span className="tag flex-none font-semibold" style={{ background: st.tagBg, color: st.tagFg, ...style }}>
      {st.icon}
      {st.label}
    </span>
  );
}

/** One option in "What $X can do". Savings bars are scaled to the largest saving on the page. */
export function OptionCard({
  o,
  base,
  maxSave,
  askHref,
}: {
  o: BuydownOption;
  base: number;
  maxSave: number;
  /** Where "Ask a lender" options send the buyer. */
  askHref: string;
}) {
  const st = STATE_STYLE[o.state];
  if (o.state === "ask")
    return (
      <div className="flex flex-col gap-2.5 rounded-[20px] p-4" style={{ background: st.bg, border: `1.5px solid ${st.border}` }}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[17px] leading-[1.2] font-bold">{o.name}</div>
            <div className="text-xs text-neutral-700">{o.sub}</div>
          </div>
          <StatePill state={o.state} />
        </div>
        <p className="m-0 flex-1 text-[13px] text-neutral-800">
          The seller&apos;s money can also pay for discount points, which lower your rate for as long as you keep the loan.
          Unlike a temporary buydown, you&apos;d qualify at the lower rate. {o.note}
        </p>
        <Link href={askHref} className="btn btn-secondary btn-flush px-4">
          Ask a lender about points
          <ArrowRight size={16} className="ml-auto" />
        </Link>
      </div>
    );
  return (
    <div
      className="lift lift-sm flex flex-col gap-2.5 rounded-[20px] p-4"
      style={{ background: st.bg, border: `1.5px ${st.borderStyle} ${st.border}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[17px] leading-[1.2] font-bold">{o.name}</div>
          <div className="text-xs text-neutral-700">{o.sub}</div>
        </div>
        <StatePill state={o.state} />
      </div>
      {o.priceCut && (
        <div className="flex flex-col gap-1 rounded-[14px] bg-surface p-3 text-[13px]">
          <div className="flex items-baseline justify-between gap-2">
            <span>New home price</span>
            <span className="text-[17px] font-bold tracking-[-0.02em]">{usd(o.priceCut.newPrice)}</span>
          </div>
          <div className="flex justify-between gap-2 text-xs text-neutral-700">
            <span>
              Was <span className="line-through">{usd(o.priceCut.oldPrice)}</span>
            </span>
            <span>New loan {usd(o.priceCut.newLoan)}</span>
          </div>
        </div>
      )}
      <div className="flex flex-col" style={{ opacity: st.dim }}>
        {o.rows.length > 0 && (
          <div className="text-[11px] font-semibold text-neutral-700">Monthly payment (principal &amp; interest)</div>
        )}
        {o.rows.map((r) => {
          const sv = saving(base, r.v);
          const color = r.hi && o.state === "unlocked" ? st.hi : "var(--color-ink)";
          const bar =
            o.state === "unlocked"
              ? "var(--color-accent)"
              : o.state === "avail"
                ? "var(--color-ink)"
                : "var(--color-neutral-500)";
          return (
            <div key={r.label} className="flex flex-col gap-1 border-b border-divider py-[7px]">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px]">{r.label}</span>
                <span className="text-[22px] font-bold tracking-[-0.03em]" style={{ color }}>
                  {usd(r.v)}
                  <span className="text-[13px] font-semibold tracking-normal">/mo</span>
                </span>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_68px] items-center gap-2">
                <span className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
                  <span
                    className="block h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(.2,.8,.2,1)]"
                    style={{ width: sv > 0.5 ? Math.max(3, (sv / maxSave) * 100) + "%" : "0%", background: bar }}
                  />
                </span>
                <span className="text-right text-[11px] font-semibold whitespace-nowrap">{sv > 0.5 ? "−" + usd(sv) + "/mo" : "—"}</span>
              </div>
            </div>
          );
        })}
        {o.key === "cc" && o.cash && (
          // Closing cost credit: show what the buyer brings to closing, not a monthly payment.
          <div className="flex flex-col">
            {[
              ["Down payment", usd(o.cash.down), "Seller credit can't pay this"],
              ["Closing costs (est.)", usd(o.cash.closing), `${CLOSING_COST_PCT}% of the loan, incl. estimated taxes & insurance`],
              ["Seller credit", o.cash.credit > 0.5 ? "−" + usd(o.cash.credit) : "$0", "Toward closing costs only"],
            ].map(([label, v, hint]) => (
              <div key={label} className="flex items-baseline justify-between gap-2 border-b border-divider py-[7px]">
                <span className="flex flex-col">
                  <span className="text-[13px]">{label}</span>
                  <span className="text-[11px] text-neutral-700">{hint}</span>
                </span>
                <span className="text-[17px] font-bold tracking-[-0.02em]">{v}</span>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-2 py-[7px]">
              <span className="flex flex-col">
                <span className="text-[13px] font-semibold">Cash to close (est.)</span>
                <span className="text-[11px] text-neutral-700">Estimate; see disclosures</span>
              </span>
              <span className="text-[22px] font-bold tracking-[-0.03em]" style={{ color: o.state === "unlocked" ? st.hi : undefined }}>
                {usd(o.cash.total)}
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 text-xs text-neutral-800">
        <div className="flex justify-between gap-2">
          <span>Cost to seller</span>
          <span className="font-semibold">{o.costLabel}</span>
        </div>
        {o.key !== "cc" && (
          <div className="flex justify-between gap-2">
            <span>Cash to close (est.)</span>
            <span className="font-semibold">{o.cash ? usd(o.cash.total) : "—"}</span>
          </div>
        )}
      </div>
      <div className="flex items-start gap-1.5 text-[13px] font-semibold" style={{ color: st.note }}>
        {o.state === "over" && <TriangleAlert size={15} className="mt-0.5 flex-none" />}
        <span>{o.note}</span>
      </div>
    </div>
  );
}

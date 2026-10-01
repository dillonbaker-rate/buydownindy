"use client";

export const PRICE_MAX = 2_000_000;
const STEP = 25_000;

const short = (n: number) =>
  n >= 1e6 ? "$" + (n / 1e6).toFixed(n % 1e6 ? 2 : 0).replace(/0$/, "") + "M" : "$" + Math.round(n / 1000) + "k";

const digits = (v: string) => {
  const d = v.replace(/[^0-9]/g, "");
  return d ? Math.min(+d, PRICE_MAX) : 0;
};

/**
 * Price range: min/max currency inputs synced with a dual-thumb slider ($0–$2M, $25k steps).
 * 0 means "no min" / "no max". Max at $2M also means no max.
 */
export function PriceRange({ min, max, onChange }: { min: number; max: number; onChange: (min: number, max: number) => void }) {
  const mn = min || 0;
  const mx = max || PRICE_MAX;
  const label = !min && !max ? "Any price" : (min ? short(mn) : "$0") + " – " + (max ? short(mx) : "$2M+");
  return (
    <div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
        <input
          className="input"
          inputMode="numeric"
          aria-label="Minimum price"
          placeholder="No min"
          value={min ? "$" + min.toLocaleString("en-US") : ""}
          onChange={(e) => onChange(digits(e.target.value), max)}
        />
        <span className="text-xs text-neutral-600">to</span>
        <input
          className="input"
          inputMode="numeric"
          aria-label="Maximum price"
          placeholder="No max"
          value={max ? "$" + max.toLocaleString("en-US") : ""}
          onChange={(e) => {
            const v = digits(e.target.value);
            onChange(min, v >= PRICE_MAX ? 0 : v);
          }}
        />
      </div>
      <div className="relative mt-1.5 h-7">
        <div className="absolute inset-x-0 top-3 h-1 rounded-full bg-neutral-300" />
        <div
          className="absolute top-3 h-1 rounded-full bg-accent"
          style={{ left: (mn / PRICE_MAX) * 100 + "%", right: 100 - (mx / PRICE_MAX) * 100 + "%" }}
        />
        <input
          className="bd-dual"
          type="range"
          min={0}
          max={PRICE_MAX}
          step={STEP}
          value={mn}
          aria-label="Minimum price slider"
          onChange={(e) => onChange(Math.min(+e.target.value, mx - STEP), max)}
        />
        <input
          className="bd-dual"
          type="range"
          min={0}
          max={PRICE_MAX}
          step={STEP}
          value={mx}
          aria-label="Maximum price slider"
          onChange={(e) => {
            const v = Math.max(+e.target.value, mn + STEP);
            onChange(min, v >= PRICE_MAX ? 0 : v);
          }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-neutral-700">
        <span>$0</span>
        <span>{label}</span>
        <span>$2M+</span>
      </div>
    </div>
  );
}

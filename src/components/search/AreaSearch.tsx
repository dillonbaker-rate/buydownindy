"use client";
import { ArrowRight, Map as MapIcon, MapPin, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { areaParam, CITIES, POPULAR, suggestAreas, type Area } from "@/lib/areas";

/** Background photo in /public. Replace the file to change it. */
const SEARCH_BG = "/search-bg.jpg";

/** Full-screen landing search: city, county, or ZIP, then the map for that area. */
export function AreaSearch({ listingZips, count }: { listingZips: string[]; count: number }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  // Focus the box on desktop only; on phones it would pop the keyboard and scroll the page on load.
  useEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) inputRef.current?.focus();
  }, []);
  const sugg = useMemo(() => suggestAreas(q, listingZips), [q, listingZips]);

  const go = (a: Area) => router.push(`/homes?area=${encodeURIComponent(areaParam(a))}`);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const pick = sugg[active] ?? sugg[0];
    if (pick) go(pick);
    else if (q.trim()) setErr("Try a city, county, or 5-digit ZIP in the Indianapolis area.");
    else router.push("/homes");
  };

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col overflow-auto bg-accent-800 bg-cover bg-center"
      style={{
        // Photo with a blue wash so the white headline stays readable. Falls back to solid blue.
        backgroundImage: `linear-gradient(180deg, rgba(10,31,59,0.78) 0%, rgba(10,31,59,0.55) 50%, rgba(10,31,59,0.72) 100%), url(${SEARCH_BG})`,
      }}
    >
      <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col justify-center gap-6 px-4 py-10 lg:py-16">
        <div className="flex flex-col gap-3 text-center">
          <h1 className="text-[34px] leading-[1.05] tracking-[-0.03em] text-pretty text-white drop-shadow-sm lg:text-[52px]">
            Find homes where the seller pays toward your rate.
          </h1>
          <p className="m-0 text-base text-white/90 drop-shadow-sm lg:text-lg">
            Indy-area listings with seller concessions, and what that money does to your monthly payment.
          </p>
        </div>

        <form onSubmit={submit} role="search" className="relative">
          <label htmlFor="area-q" className="sr-only">
            City, county, or ZIP code
          </label>
          <div className="flex items-center gap-2 rounded-full border border-white/70 bg-bg p-1.5 pl-4 shadow-lg transition-shadow duration-200 focus-within:border-white focus-within:shadow-[0_0_0_4px_rgba(255,255,255,0.28),0_12px_32px_rgba(45,43,43,0.22)]">
            <Search size={22} className="flex-none text-neutral-600" aria-hidden />
            <input
              id="area-q"
              ref={inputRef}
              autoComplete="off"
              role="combobox"
              aria-expanded={sugg.length > 0}
              aria-controls={listId}
              aria-activedescendant={sugg.length ? `${listId}-${active}` : undefined}
              placeholder="City, county, or ZIP code"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
                setErr(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((i) => Math.min(i + 1, sugg.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((i) => Math.max(i - 1, 0));
                }
              }}
              className="no-focus-ring min-h-12 min-w-0 flex-1 appearance-none border-0 bg-transparent text-lg text-ink caret-accent placeholder:text-neutral-500"
            />
            <button className="btn btn-primary min-h-12 flex-none rounded-full px-5 text-[15px]">Search</button>
          </div>
          {sugg.length > 0 && (
            <ul
              id={listId}
              role="listbox"
              className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-[22px] bg-bg p-1.5 shadow-lg"
            >
              {sugg.map((a, i) => (
                <li key={areaParam(a)} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(a)}
                    className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-[14px] px-3 text-left text-[15px]"
                    style={{ background: i === active ? "var(--color-accent-100)" : undefined }}
                  >
                    <MapPin size={18} className="flex-none text-accent" aria-hidden />
                    <span className="flex-1 font-semibold">{a.label}</span>
                    <span className="text-xs text-neutral-700">
                      {a.kind === "city" ? `${a.county} County` : a.kind === "county" ? "Whole county" : "ZIP code area"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {err && <div className="mt-2 rounded-[12px] bg-bg/95 px-3 py-2 text-center text-sm text-warn-text">{err}</div>}
        </form>

        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-wrap justify-center gap-2">
            {POPULAR.map((name) => {
              const a = CITIES.find((c) => c.value === name)!;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => go(a)}
                  className="min-h-10 cursor-pointer rounded-full border border-white/60 bg-bg/90 px-4 text-sm font-semibold text-accent-800 shadow-sm hover:bg-bg"
                >
                  {name}
                </button>
              );
            })}
          </div>
          <Link href="/homes" className="btn btn-ghost text-[15px] !text-white hover:!bg-white/15">
            <MapIcon size={16} />
            {count === 1 ? "See the 1 home on the map" : count > 1 ? `Browse all ${count} homes on the map` : "Browse the map"}
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Animates a dollar figure from `from` (or its previous value) to `value` over `ms` with ease-out
 * cubic. Always lands on the final value: it jumps straight there when the tab is hidden, steps on
 * setTimeout rather than rAF (rAF pauses in background tabs), and a fallback timer forces the end.
 */
export function CountUp({ value, from, prefix = "", ms = 700 }: { value: number; from?: number; prefix?: string; ms?: number }) {
  const target = Math.round(value);
  const [v, setV] = useState(from != null ? Math.round(from) : target);
  const cur = useRef(v);
  cur.current = v;

  useEffect(() => {
    const start = cur.current;
    if (start === target) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      setV(target);
      return;
    }
    const t0 = Date.now();
    let tm: ReturnType<typeof setTimeout>;
    const step = () => {
      const k = Math.min(1, (Date.now() - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      setV(start + (target - start) * e);
      if (k < 1) tm = setTimeout(step, 16);
    };
    tm = setTimeout(step, 16);
    const done = setTimeout(() => {
      clearTimeout(tm);
      setV(target);
    }, ms + 80);
    return () => {
      clearTimeout(tm);
      clearTimeout(done);
    };
  }, [target, ms]);

  return <>{prefix + "$" + Math.round(v).toLocaleString("en-US")}</>;
}

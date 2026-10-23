"use client";
import { useEffect, useRef } from "react";

/**
 * Counts one calculator use per page view: the first time any input changes from its starting value.
 * `inputs` is the list of the calculator's input values.
 */
export function useTrackUse(name: "calc_payment" | "calc_buydown", inputs: unknown[]) {
  const first = useRef(JSON.stringify(inputs));
  const sent = useRef(false);
  const key = JSON.stringify(inputs);
  useEffect(() => {
    if (sent.current || key === first.current) return;
    sent.current = true;
    fetch("/api/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }), keepalive: true }).catch(() => {});
  }, [key, name]);
}

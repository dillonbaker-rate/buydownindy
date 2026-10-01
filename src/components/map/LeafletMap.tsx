"use client";
import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { MAP_OPTIONS, TILE_ATTRIBUTION, TILE_OPTIONS, TILE_URL } from "@/lib/map-config";

export interface Pin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  title: string;
}

export interface LeafletMapHandle {
  flyTo: (lat: number, lng: number, minZoom?: number) => void;
}

interface Props {
  pins: Pin[];
  selectedId?: string | null;
  center: [number, number];
  zoom: number;
  interactive?: boolean;
  zoomControl?: boolean;
  onPick?: (id: string) => void;
  onMapClick?: () => void;
  /** Changing this resets the view (layout switched between phone and desktop). */
  viewKey?: string;
  className?: string;
}

const pinHtml = (t: string, sel: boolean) =>
  `<div class="bd-pin${sel ? " is-sel" : ""}">${t.replace(/</g, "&lt;")}</div>`;

/** Thin imperative Leaflet wrapper: divIcon pins showing the concession, flyTo on select. */
export const LeafletMap = forwardRef<LeafletMapHandle, Props>(function LeafletMap(
  { pins, selectedId, center, zoom, interactive = true, zoomControl = true, onPick, onMapClick, viewKey, className },
  ref,
) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const layer = useRef<Leaflet.LayerGroup | null>(null);
  const zc = useRef<Leaflet.Control.Zoom | null>(null);
  const cbs = useRef({ onPick, onMapClick });
  cbs.current = { onPick, onMapClick };
  const initial = useRef({ center, zoom, interactive, zoomControl });

  useImperativeHandle(ref, () => ({
    flyTo: (lat, lng, minZoom = 11.5) => {
      const m = map.current;
      if (m) m.flyTo([lat, lng], Math.max(m.getZoom(), minZoom), { duration: 0.45, easeLinearity: 0.2 });
    },
  }));

  // Create once.
  useEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    import("leaflet").then((mod) => {
      if (cancelled || !el.current) return;
      const lf = (mod as unknown as { default?: typeof Leaflet }).default ?? (mod as typeof Leaflet);
      L.current = lf;
      const o = initial.current;
      const m = lf.map(el.current, {
        ...MAP_OPTIONS,
        zoomControl: false,
        scrollWheelZoom: o.interactive,
        dragging: true,
      });
      m.setView(o.center, o.zoom);
      lf.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, ...TILE_OPTIONS }).addTo(m);
      zc.current = lf.control.zoom({ position: "topright" });
      if (o.zoomControl) zc.current.addTo(m);
      m.on("click", () => cbs.current.onMapClick?.());
      layer.current = lf.layerGroup().addTo(m);
      map.current = m;
      ro = new ResizeObserver(() => m.invalidateSize());
      ro.observe(el.current);
      drawPins();
    });
    return () => {
      cancelled = true;
      ro?.disconnect();
      map.current?.remove();
      map.current = null;
    };
     
  }, []);

  const drawPins = () => {
    const lf = L.current;
    const lg = layer.current;
    if (!lf || !lg) return;
    lg.clearLayers();
    for (const p of pinsRef.current) {
      const sel = p.id === selRef.current;
      const mk = lf.marker([p.lat, p.lng], {
        icon: lf.divIcon({ className: "", iconSize: [0, 0], html: pinHtml(p.label, sel) }),
        zIndexOffset: sel ? 1000 : 0,
        title: p.title,
        keyboard: true,
      });
      mk.on("click", (e) => {
        lf.DomEvent.stopPropagation(e);
        cbs.current.onPick?.(p.id);
      });
      mk.addTo(lg);
    }
  };
  const pinsRef = useRef(pins);
  pinsRef.current = pins;
  const selRef = useRef(selectedId);
  selRef.current = selectedId;

  const pinKey = pins.map((p) => p.id + ":" + p.label + ":" + p.lat + "," + p.lng).join("|") + "#" + selectedId;
  useEffect(() => {
    drawPins();
     
  }, [pinKey]);

  // Reset view when layout changes or the caller moves the center (mini map).
  const centerKey = `${viewKey}|${center[0]},${center[1]},${zoom}`;
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    m.invalidateSize();
    if (interactive) m.setView(center, zoom);
    else m.flyTo(center, zoom, { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerKey]);

  useEffect(() => {
    const m = map.current;
    const c = zc.current;
    if (!m || !c) return;
    if (zoomControl) c.addTo(m);
    else c.remove();
  }, [zoomControl]);

  return <div ref={el} className={className} />;
});

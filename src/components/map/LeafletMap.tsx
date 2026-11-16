"use client";
import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { MAP_OPTIONS, TILE_ATTRIBUTION, TILE_OPTIONS, TILE_PLAIN, TILE_URL } from "@/lib/map-config";

export interface Pin {
  id: string;
  lat: number;
  lng: number;
  label: string;
  title: string;
  /** Hidden listing (only signed-in agents see it): drawn gray. */
  muted?: boolean;
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

const pinHtml = (t: string, sel: boolean, muted?: boolean) =>
  `<div class="bd-pin${sel ? " is-sel" : ""}${muted ? " is-hidden" : ""}">${t.replace(/</g, "&lt;")}</div>`;

const clusterHtml = (n: number, muted: boolean) => `<div class="bd-cluster${muted ? " is-hidden" : ""}">${n}</div>`;

/** Pins closer than this many screen pixels are drawn as one count bubble. */
const CLUSTER_PX = 56;

/** Group pins that would overlap at zoom `z` (by screen distance, chained). The selected pin always stands alone. */
function groupPins(m: Leaflet.Map, pins: Pin[], z: number, selectedId: string | null | undefined): Pin[][] {
  const pts = pins.map((p) => ({ p, pt: m.project([p.lat, p.lng], z) }));
  const used = new Array(pts.length).fill(false);
  const groups: Pin[][] = [];
  pts.forEach((a, i) => {
    if (a.p.id === selectedId) {
      used[i] = true;
      groups.push([a.p]);
    }
  });
  for (let i = 0; i < pts.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    // A pin joins the group if it's close to any pin already in it, so nothing is left overlapping a bubble.
    const members = [i];
    for (let k = 0; k < members.length; k++) {
      const a = pts[members[k]].pt;
      for (let j = 0; j < pts.length; j++) {
        if (used[j] || pts[j].p.id === selectedId) continue;
        if (a.distanceTo(pts[j].pt) < CLUSTER_PX) {
          used[j] = true;
          members.push(j);
        }
      }
    }
    groups.push(members.map((k) => pts[k].p));
  }
  return groups;
}

/** Thin imperative Leaflet wrapper: divIcon pins showing the concession (grouped when they overlap), flyTo on select. */
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
      if (!m) return;
      try {
        m.flyTo([lat, lng], Math.max(m.getZoom(), minZoom), { duration: 0.45, easeLinearity: 0.2 });
      } catch {
        m.setView([lat, lng], Math.max(m.getZoom(), minZoom), { animate: false });
      }
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
        // The mini map in the posting form just jumps to the pin: animations there were crash-prone.
        zoomAnimation: o.interactive,
        markerZoomAnimation: o.interactive,
        fadeAnimation: o.interactive,
      });
      m.setView(o.center, o.zoom);
      lf.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, ...TILE_OPTIONS }).addTo(m);
      zc.current = lf.control.zoom({ position: "topright" });
      if (o.zoomControl) zc.current.addTo(m);
      m.on("click", () => cbs.current.onMapClick?.());
      // Regroup pins for the new zoom (panning doesn't change which pins overlap).
      m.on("zoomend", () => drawPinsRef.current());
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
    const m = map.current;
    if (!lf || !lg || !m) return;
    lg.clearLayers();
    const z = m.getZoom();
    for (const g of groupPins(m, pinsRef.current, z, selRef.current)) {
      if (g.length === 1) {
        const p = g[0];
        const sel = p.id === selRef.current;
        const mk = lf.marker([p.lat, p.lng], {
          icon: lf.divIcon({ className: "", iconSize: [0, 0], html: pinHtml(p.label, sel, p.muted) }),
          zIndexOffset: sel ? 1000 : 0,
          title: p.title,
          keyboard: true,
        });
        mk.on("click", (e) => {
          lf.DomEvent.stopPropagation(e);
          cbs.current.onPick?.(p.id);
        });
        mk.addTo(lg);
        continue;
      }
      const lat = g.reduce((a, p) => a + p.lat, 0) / g.length;
      const lng = g.reduce((a, p) => a + p.lng, 0) / g.length;
      const mk = lf.marker([lat, lng], {
        icon: lf.divIcon({ className: "", iconSize: [0, 0], html: clusterHtml(g.length, g.every((p) => p.muted)) }),
        title: `${g.length} homes here. Zoom in to see them.`,
        keyboard: true,
      });
      mk.on("click", (e) => {
        lf.DomEvent.stopPropagation(e);
        const bounds = lf.latLngBounds(g.map((p) => [p.lat, p.lng] as [number, number]));
        // Already as close as the map goes (or the homes share a spot): open the first one instead of zooming.
        if (m.getZoom() >= MAP_OPTIONS.maxZoom - 0.5 || bounds.getNorthEast().equals(bounds.getSouthWest())) cbs.current.onPick?.(g[0].id);
        else m.flyToBounds(bounds, { padding: [70, 70], maxZoom: MAP_OPTIONS.maxZoom, duration: 0.45 });
      });
      mk.addTo(lg);
    }
  };
  const drawPinsRef = useRef(drawPins);
  drawPinsRef.current = drawPins;
  const pinsRef = useRef(pins);
  pinsRef.current = pins;
  const selRef = useRef(selectedId);
  selRef.current = selectedId;

  const pinKey = pins.map((p) => p.id + ":" + p.label + ":" + p.lat + "," + p.lng + (p.muted ? ":m" : "")).join("|") + "#" + selectedId;
  useEffect(() => {
    try {
      drawPins();
    } catch (e) {
      console.error("map pins", e);
    }
     
  }, [pinKey]);

  // Reset view when layout changes or the caller moves the center (mini map).
  const centerKey = `${viewKey}|${center[0]},${center[1]},${zoom}`;
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    try {
      m.invalidateSize();
      m.setView(center, zoom, { animate: false });
    } catch (e) {
      console.error("map setView", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerKey]);

  useEffect(() => {
    const m = map.current;
    const c = zc.current;
    if (!m || !c) return;
    if (zoomControl) c.addTo(m);
    else c.remove();
  }, [zoomControl]);

  return <div ref={el} className={`${className ?? ""}${TILE_PLAIN ? " bd-map-plain" : ""}`} />;
});

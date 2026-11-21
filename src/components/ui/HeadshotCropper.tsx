"use client";
import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";

const VIEW = 280; // crop window, px
const OUT = 600; // saved headshot, px square
const MAX_ZOOM = 5;

/** Drag and zoom a photo inside a circle, then save the square around it as a 600px JPEG. */
export function HeadshotCropper({ file, onCancel, onCrop }: { file: File; onCancel: () => void; onCrop: (blob: Blob) => void }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // image top-left inside the crop window
  const drag = useRef<{ id: number; x: number; y: number; px: number; py: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const i = new Image();
    i.onload = () => {
      setImg(i);
      const s = VIEW / Math.min(i.naturalWidth, i.naturalHeight);
      setZoom(1);
      // Start centered horizontally and near the top, where faces usually are.
      setPos({ x: (VIEW - i.naturalWidth * s) / 2, y: Math.max(VIEW - i.naturalHeight * s, -(i.naturalHeight * s - VIEW) * 0.2) });
    };
    i.onerror = () => setFailed(true);
    i.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onCancel]);

  const base = img ? VIEW / Math.min(img.naturalWidth, img.naturalHeight) : 1;
  const scale = base * zoom;
  const w = img ? img.naturalWidth * scale : VIEW;
  const h = img ? img.naturalHeight * scale : VIEW;
  const clamp = (p: { x: number; y: number }, ww = w, hh = h) => ({
    x: Math.min(0, Math.max(VIEW - ww, p.x)),
    y: Math.min(0, Math.max(VIEW - hh, p.y)),
  });

  const zoomTo = (z: number) => {
    if (!img) return;
    const nz = Math.min(MAX_ZOOM, Math.max(1, z));
    const r = nz / zoom;
    const c = VIEW / 2;
    // Keep the middle of the circle on the same spot of the photo.
    setPos((p) => clamp({ x: c - (c - p.x) * r, y: c - (c - p.y) * r }, img.naturalWidth * base * nz, img.naturalHeight * base * nz));
    setZoom(nz);
  };

  const save = () => {
    if (!img) return;
    const c = document.createElement("canvas");
    c.width = c.height = OUT;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, OUT, OUT);
    ctx.drawImage(img, -pos.x / scale, -pos.y / scale, VIEW / scale, VIEW / scale, 0, 0, OUT, OUT);
    c.toBlob((b) => b && onCrop(b), "image/jpeg", 0.88);
  };

  return (
    <div className="fixed inset-0 z-[4500] grid place-items-center bg-neutral-900/60 p-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Crop headshot"
        className="flex w-full max-w-[340px] flex-col items-center gap-4 rounded-[18px] bg-bg p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="self-start">
          <div className="text-base font-bold">Crop headshot</div>
          <div className="text-[13px] text-neutral-700">Drag to move. Zoom to fit the face in the circle.</div>
        </div>
        <div
          className="relative cursor-grab touch-none overflow-hidden rounded-[12px] bg-neutral-200 active:cursor-grabbing"
          style={{ width: VIEW, height: VIEW }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || d.id !== e.pointerId) return;
            setPos(clamp({ x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y }));
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onWheel={(e) => zoomTo(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08))}
        >
          {img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img.src} alt="" draggable={false} className="pointer-events-none absolute max-w-none select-none" style={{ left: pos.x, top: pos.y, width: w, height: h }} />
          )}
          {/* Dim everything outside the circle the flyers and profile show. */}
          <div className="pointer-events-none absolute inset-0 rounded-full" style={{ boxShadow: "0 0 0 999px rgba(16,24,40,0.55)" }} />
          <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/90" />
          {!img && <div className="absolute inset-0 grid place-items-center text-sm text-neutral-700">{failed ? "Couldn't open this photo." : "Loading…"}</div>}
        </div>
        <div className="flex w-full items-center gap-2">
          <button type="button" aria-label="Zoom out" className="btn btn-ghost min-h-9 px-2" onClick={() => zoomTo(zoom / 1.2)} disabled={!img || zoom <= 1}>
            <Minus size={16} />
          </button>
          <input
            type="range"
            aria-label="Zoom"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            disabled={!img}
            onChange={(e) => zoomTo(Number(e.target.value))}
            className="flex-1 accent-accent"
          />
          <button type="button" aria-label="Zoom in" className="btn btn-ghost min-h-9 px-2" onClick={() => zoomTo(zoom * 1.2)} disabled={!img || zoom >= MAX_ZOOM}>
            <Plus size={16} />
          </button>
        </div>
        <div className="flex w-full justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={!img}>
            Use photo
          </button>
        </div>
      </div>
    </div>
  );
}

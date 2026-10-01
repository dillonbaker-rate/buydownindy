"use client";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Camera, Plus, X } from "lucide-react";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/env";
import { MAX_PHOTOS } from "@/lib/types";

export interface FormPhoto {
  id: string;
  url: string;
  path?: string;
  /** Uploaded during this edit session (safe to delete from storage on remove). */
  fresh?: boolean;
}

/** Downscale to ≤ 1920px JPEG before upload. Falls back to the original file if the browser can't decode it. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, 1920 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * s);
    c.height = Math.round(bmp.height * s);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob((b) => res(b ?? file), "image/jpeg", 0.85));
  } catch {
    return file;
  }
}

function Tile({ p, cover, onRemove }: { p: FormPhoto; cover: boolean; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-label={cover ? "Cover photo. Drag to reorder." : "Photo. Drag to reorder."}
      className="relative aspect-[4/3] cursor-grab touch-none overflow-hidden rounded-[14px] bg-neutral-300"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
        outline: isDragging ? "2px solid var(--color-accent)" : "none",
        outlineOffset: -2,
        boxShadow: isDragging ? "var(--shadow-lg)" : undefined,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.url} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" draggable={false} />
      {cover && <span className="tag tag-ink absolute bottom-1.5 left-1.5 px-1.5 py-0.5 text-[10px]">Cover</span>}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label="Remove photo"
        className="absolute top-0.5 right-0.5 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-bg text-ink"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function PhotoGrid({
  photos,
  onChange,
  userId,
}: {
  photos: FormPhoto[];
  onChange: (p: FormPhoto[]) => void;
  userId: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const latest = useRef(photos);
  latest.current = photos;

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = photos.findIndex((p) => p.id === e.active.id);
    const to = photos.findIndex((p) => p.id === e.over!.id);
    onChange(arrayMove(photos, from, to));
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setErr(null);
    const room = MAX_PHOTOS - photos.length;
    const list = Array.from(files).slice(0, room);
    if (files.length > room) setErr(`Only ${MAX_PHOTOS} photos fit. Added the first ${room}.`);
    setUploading(list.length);
    for (const f of list) {
      const blob = await shrink(f);
      const ext = blob.type === "image/jpeg" ? "jpg" : (f.name.split(".").pop() ?? "jpg").toLowerCase();
      const res = supabaseConfigured ? await uploadSupabase(blob, f.type, ext) : await uploadDemo(blob, f.name);
      if ("error" in res) setErr(`Couldn't upload ${f.name}: ${res.error}`);
      else onChange([...latest.current, { id: res.path, url: res.url, path: res.path, fresh: true }]);
      setUploading((n) => n - 1);
    }
    if (input.current) input.current.value = "";
  };

  const uploadSupabase = async (blob: Blob, type: string, ext: string) => {
    const sb = createClient();
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from("listing-photos").upload(path, blob, { contentType: blob.type || type, cacheControl: "31536000" });
    if (error) return { error: error.message };
    return { path, url: sb.storage.from("listing-photos").getPublicUrl(path).data.publicUrl };
  };

  // Local demo mode: saved under .data/uploads by /api/demo/photos.
  const uploadDemo = async (blob: Blob, name: string) => {
    const fd = new FormData();
    fd.append("file", blob, name);
    const r = await fetch("/api/demo/photos", { method: "POST", body: fd });
    const j = await r.json().catch(() => ({}));
    return r.ok ? { path: j.path as string, url: j.url as string } : { error: (j.error as string) ?? "Upload failed" };
  };

  const remove = (p: FormPhoto) => {
    onChange(photos.filter((x) => x.id !== p.id));
    if (supabaseConfigured && p.fresh && p.path) createClient().storage.from("listing-photos").remove([p.path]);
  };

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">
            {photos.map((p, i) => (
              <Tile key={p.id} p={p} cover={i === 0} onRemove={() => remove(p)} />
            ))}
            {Array.from({ length: uploading }, (_, i) => (
              <div
                key={"up" + i}
                className="grid aspect-[4/3] animate-pulse place-items-center rounded-[14px] bg-neutral-300 text-neutral-600"
              >
                <Camera size={22} strokeWidth={1.5} />
              </div>
            ))}
            {photos.length + uploading < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => input.current?.click()}
                className="flex aspect-[4/3] cursor-pointer flex-col items-start justify-center gap-1 rounded-[14px] border-[1.5px] border-dashed border-neutral-500 p-2.5 text-xs font-semibold hover:bg-accent-100"
              >
                <Plus size={16} />
                Add photo
              </button>
            )}
          </div>
        </SortableContext>
      </DndContext>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        multiple
        hidden
        onChange={(e) => upload(e.target.files)}
      />
      {err && <div className="mt-2 text-xs text-warn-text">{err}</div>}
    </div>
  );
}

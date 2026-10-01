"use client";
import { useEffect, type ReactNode } from "react";

/** Centered dialog on desktop, bottom sheet on phones. Backdrop click and Escape close it. */
export function Modal({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-neutral-900/55 lg:items-center lg:p-6"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full w-full flex-col gap-3 overflow-auto rounded-t-[24px] bg-surface p-4 shadow-lg lg:w-[min(460px,100%)] lg:rounded-[24px]"
      >
        {children}
      </div>
    </div>
  );
}

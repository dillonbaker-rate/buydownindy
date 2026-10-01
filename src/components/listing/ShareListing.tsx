"use client";
import { Check, Copy, Mail, MessageSquare, Share2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** "Share this house": the phone's share sheet when available, otherwise copy / text / email / Facebook. */
export function ShareListing({ title, text }: { title: string; text: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const url = () => window.location.origin + window.location.pathname;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const share = async () => {
    // Phones and tablets: the native share sheet (Messages, AirDrop, WhatsApp…).
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (touch && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url: url() });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return; // they closed the sheet
      }
    }
    setOpen((o) => !o);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this link:", url());
    }
  };

  const message = () => `${text} ${url()}`;
  const item = "flex min-h-11 w-full cursor-pointer items-center gap-2.5 px-4 text-left text-sm text-ink no-underline hover:bg-accent-100 hover:text-ink";

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={share} aria-expanded={open} className="btn btn-secondary min-h-10 text-[13px]">
        <Share2 size={15} />
        Share this house
      </button>
      {open && (
        <div role="menu" className="absolute top-full left-0 z-[2500] mt-1.5 w-64 overflow-hidden rounded-[14px] border border-divider bg-bg py-1 shadow-lg">
          <div className="flex items-center justify-between border-b border-divider py-1.5 pr-1.5 pl-4">
            <span className="text-xs font-semibold text-neutral-700">Share with a buyer</span>
            <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="grid h-8 w-8 cursor-pointer place-items-center text-neutral-600">
              <X size={14} />
            </button>
          </div>
          <button type="button" role="menuitem" className={item} onClick={copy}>
            {copied ? <Check size={16} className="text-accent" /> : <Copy size={16} />}
            {copied ? "Link copied" : "Copy link"}
          </button>
          <a role="menuitem" className={item} href={`sms:?&body=${encodeURIComponent(message())}`}>
            <MessageSquare size={16} />
            Text message
          </a>
          <a role="menuitem" className={item} href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(message())}`}>
            <Mail size={16} />
            Email
          </a>
          <a
            role="menuitem"
            className={item}
            target="_blank"
            rel="noopener noreferrer"
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url())}`}
          >
            <span className="grid h-4 w-4 place-items-center rounded-[3px] bg-ink text-[10px] font-bold text-white">f</span>
            Facebook
          </a>
        </div>
      )}
    </div>
  );
}

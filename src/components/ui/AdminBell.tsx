"use client";
import { Bell, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { LICENSE_LOOKUP, useAgentStatus } from "@/components/agent/useAgentStatus";
import type { Agent } from "@/lib/types";

const POLL_MS = 60_000;

function ago(iso?: string) {
  if (!iso) return "";
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

/** Admin-only bell: new agents waiting for verification, with verify / can't-verify right in the menu. */
export function AdminBell({ initial }: { initial: Agent[] }) {
  const router = useRouter();
  const [agents, setAgents] = useState(initial);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/agents/pending", { cache: "no-store" });
      if (r.ok) setAgents((await r.json()).agents);
    } catch {}
  }, []);
  const { busy, setStatus, copyLicense } = useAgentStatus(() => {
    load();
    router.refresh();
  });

  // Check for new sign-ups every minute while the tab is visible, and right away when it comes back.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

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

  const n = agents.length;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) load();
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={n ? `${n} agent${n === 1 ? "" : "s"} waiting for verification` : "Notifications"}
        className="relative grid h-10 w-10 cursor-pointer place-items-center rounded-full border border-divider bg-bg text-ink hover:bg-surface"
      >
        <Bell size={18} />
        {n > 0 && (
          <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#d93025] px-1 text-[11px] font-bold text-white">
            {n > 9 ? "9+" : n}
          </span>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Agents waiting for verification"
          className="fixed inset-x-4 top-14 z-[3000] overflow-hidden rounded-[14px] border border-divider bg-bg shadow-lg sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-1.5 sm:w-[380px]"
        >
          <div className="border-b border-divider px-4 py-2.5">
            <div className="text-sm font-bold">Agents to verify</div>
            <div className="text-xs text-neutral-700">
              {n ? `${n} new sign-up${n === 1 ? "" : "s"} waiting` : "You're all caught up."}
            </div>
          </div>
          <div className="max-h-[60vh] overflow-auto">
            {agents.map((a) => (
              <div key={a.id} className="flex flex-col gap-2 border-b border-divider px-4 py-3 text-[13px]">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-bold">{a.name}</span>
                  <span className="flex-none text-xs text-neutral-700">{ago(a.createdAt)}</span>
                </div>
                <div className="-mt-1.5 truncate text-neutral-700">
                  {a.brokerage} · License <strong className="text-ink">{a.licenseNumber ?? "not entered"}</strong>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {a.licenseNumber && (
                    <a
                      href={LICENSE_LOOKUP}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => copyLicense(a.licenseNumber!)}
                      className="btn btn-secondary min-h-9 px-3 text-[12px]"
                    >
                      Look up
                      <ExternalLink size={12} />
                    </a>
                  )}
                  <button
                    className="btn btn-primary min-h-9 px-3 text-[12px]"
                    disabled={busy != null || !a.licenseNumber}
                    onClick={() => setStatus(a, "verified")}
                  >
                    Verify
                  </button>
                  <button className="btn btn-secondary min-h-9 px-3 text-[12px]" disabled={busy != null} onClick={() => setStatus(a, "rejected")}>
                    Can&apos;t verify
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Link href="/agent/admin" onClick={() => setOpen(false)} className="flex min-h-11 items-center justify-center text-sm font-semibold no-underline">
            Open the Agents page
          </Link>
        </div>
      )}
    </div>
  );
}

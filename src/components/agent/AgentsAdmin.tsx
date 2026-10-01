"use client";
/* eslint-disable @next/next/no-img-element */
import { Download, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import type { Agent } from "@/lib/types";
import { VerificationBadge } from "./AgentProfileForm";

const LOOKUP = "https://mylicense.in.gov/everification/";

/** Admin list of agents: verify licenses, export to CSV. */
export function AgentsAdmin({ agents }: { agents: Agent[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending">("pending");
  const shown = filter === "pending" ? agents.filter((a) => a.verificationStatus !== "verified") : agents;

  const setStatus = async (a: Agent, status: "verified" | "rejected" | "pending") => {
    setBusy(a.id + status);
    const r = await fetch(`/api/admin/agents/${a.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
    setBusy(null);
    if (!r.ok) return toast((await r.json().catch(() => ({}))).error ?? "Couldn't update.");
    toast(status === "verified" ? `${a.name} verified.` : status === "rejected" ? `${a.name} marked unverified.` : "Reset to pending.");
    router.refresh();
  };

  const copyLicense = async (n: string) => {
    try {
      await navigator.clipboard.writeText(n);
      toast(`Copied ${n}. Paste it into the state lookup.`);
    } catch {}
  };

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="mx-auto max-w-[1080px] p-4 lg:p-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[26px] lg:text-[32px]">Agents</h1>
            <div className="text-[13px] text-neutral-700">
              {agents.length} agent{agents.length === 1 ? "" : "s"} · {agents.filter((a) => a.verificationStatus === "verified").length} verified
            </div>
          </div>
          { }
          <a href="/api/admin/agents" download className="btn btn-secondary">
            <Download size={16} />
            Download CSV for CRM
          </a>
        </div>
        <div className="mb-3 flex gap-2">
          {(["pending", "all"] as const).map((k) => (
            <button key={k} className={`btn min-h-10 text-[13px] ${filter === k ? "btn-primary" : "btn-secondary"}`} onClick={() => setFilter(k)}>
              {k === "pending" ? "Needs review" : "All agents"}
            </button>
          ))}
        </div>
        {shown.length === 0 && <p className="text-sm text-neutral-700">No agents need review.</p>}
        {shown.map((a) => (
          <div key={a.id} className="grid grid-cols-[56px_minmax(0,1fr)] gap-x-4 gap-y-3 border-b border-divider py-4 lg:grid-cols-[56px_minmax(0,1fr)_auto]">
            <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-neutral-300 text-lg font-bold text-neutral-600">
              {a.photoUrl ? <img src={a.photoUrl} alt="" className="h-full w-full object-cover" /> : a.name.slice(0, 1)}
            </div>
            <div className="flex min-w-0 flex-col gap-0.5 text-[13px]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-bold">{a.name}</span>
                <VerificationBadge status={a.verificationStatus} />
              </div>
              <div>
                {a.brokerage}
                {a.teamName ? ` · ${a.teamName}` : ""}
              </div>
              <div className="text-neutral-700">
                {a.email} · {a.phone}
                {a.officePhone ? ` · office ${a.officePhone}` : ""}
              </div>
              <div className="text-neutral-700">
                License <strong className="text-ink">{a.licenseNumber ?? "not entered"}</strong>
                {a.mlsId ? ` · MLS ${a.mlsId}` : ""}
                {a.licensedSince ? ` · since ${a.licensedSince}` : ""}
                {a.counties?.length ? ` · ${a.counties.join(", ")}` : ""}
              </div>
            </div>
            <div className="col-span-full flex flex-wrap items-start gap-1.5 lg:col-span-1">
              {a.licenseNumber && (
                <a
                  href={LOOKUP}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => copyLicense(a.licenseNumber!)}
                  className="btn btn-secondary min-h-10 text-[13px]"
                >
                  Look up license
                  <ExternalLink size={13} />
                </a>
              )}
              {a.verificationStatus !== "verified" && (
                <button className="btn btn-primary min-h-10 text-[13px]" disabled={busy != null || !a.licenseNumber} onClick={() => setStatus(a, "verified")}>
                  Mark verified
                </button>
              )}
              {a.verificationStatus !== "rejected" && (
                <button className="btn btn-secondary min-h-10 text-[13px]" disabled={busy != null} onClick={() => setStatus(a, "rejected")}>
                  Can&apos;t verify
                </button>
              )}
              {a.verificationStatus !== "pending" && (
                <button className="btn btn-ghost min-h-10 text-[13px]" disabled={busy != null} onClick={() => setStatus(a, "pending")}>
                  Reset
                </button>
              )}
            </div>
          </div>
        ))}
        <p className="mt-4 text-xs text-neutral-700">
          &quot;Look up license&quot; copies the license number and opens the Indiana PLA lookup. Choose Real Estate Commission, paste the
          number, and check the name and status match before marking verified.
        </p>
      </div>
    </div>
  );
}

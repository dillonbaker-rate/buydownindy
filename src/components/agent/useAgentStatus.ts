"use client";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import type { Agent } from "@/lib/types";

export const LICENSE_LOOKUP = "https://mylicense.in.gov/everification/";
export type AgentStatus = "verified" | "rejected" | "pending";

/** Admin actions on an agent: set verification status and copy a license number for the state lookup. */
export function useAgentStatus(onDone: () => void) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const setStatus = async (a: Pick<Agent, "id" | "name">, status: AgentStatus) => {
    setBusy(a.id + status);
    const r = await fetch(`/api/admin/agents/${a.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
    setBusy(null);
    if (!r.ok) return toast((await r.json().catch(() => ({}))).error ?? "Couldn't update.");
    toast(status === "verified" ? `${a.name} verified.` : status === "rejected" ? `${a.name} marked unverified.` : "Reset to pending.");
    onDone();
  };

  const copyLicense = async (n: string) => {
    try {
      await navigator.clipboard.writeText(n);
      toast(`Copied ${n}. Paste it into the state lookup.`);
    } catch {}
  };

  return { busy, setStatus, copyLicense };
}

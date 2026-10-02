"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AGENT_TERMS, AGENT_TERMS_DRAFT, AGENT_TERMS_SUMMARY, AGENT_TERMS_TITLE, AGENT_TERMS_VERSION } from "@/content/agent-terms";

export function AgentTermsText() {
  return (
    <div className="flex flex-col gap-3 text-sm leading-relaxed">
      <p className="m-0 rounded-[12px] bg-accent-100 p-3 font-semibold">{AGENT_TERMS_SUMMARY}</p>
      {AGENT_TERMS.map((t) => (
        <section key={t.heading}>
          <h3 className="text-[15px]">{t.heading}</h3>
          <p className="m-0 mt-0.5 text-neutral-800">{t.body}</p>
        </section>
      ))}
      <p className="m-0 text-xs text-neutral-700">
        Version {AGENT_TERMS_VERSION}
        {AGENT_TERMS_DRAFT ? " · Draft pending legal review" : ""}
      </p>
    </div>
  );
}

/** Required checkbox used at sign-up and profile setup. */
export function AgreeToTerms({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-[18px] w-[18px] flex-none accent-accent" />
      <span>
        I agree to the{" "}
        <Link href="/agent-terms" target="_blank" className="font-semibold">
          Agent Terms
        </Link>
        . {AGENT_TERMS_SUMMARY}
      </span>
    </label>
  );
}

/** Shown to signed-in agents who haven't accepted the current terms (existing accounts, or after a change). */
export function AcceptAgentTerms() {
  const router = useRouter();
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const accept = async () => {
    setBusy(true);
    setErr(null);
    const r = await fetch("/api/agent/terms", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ version: AGENT_TERMS_VERSION }) });
    setBusy(false);
    if (!r.ok) return setErr((await r.json().catch(() => ({}))).error ?? "Couldn't save. Try again.");
    router.refresh();
  };
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="mx-auto flex max-w-[680px] flex-col gap-4 p-4 lg:p-8">
        <div>
          <h1 className="text-[26px] lg:text-[32px]">{AGENT_TERMS_TITLE}</h1>
          <p className="m-0 mt-1 text-sm text-neutral-700">Please read and accept these before you keep using BuyDown Indy.</p>
        </div>
        <div className="rounded-[18px] border border-divider p-4">
          <AgentTermsText />
        </div>
        <label className="flex cursor-pointer items-start gap-2.5 text-sm">
          <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-0.5 h-[18px] w-[18px] flex-none accent-accent" />
          <span>I&apos;ve read and agree to the Agent Terms.</span>
        </label>
        {err && <div className="text-sm text-warn-text">{err}</div>}
        <button className="btn btn-primary self-start" disabled={!ok || busy} onClick={accept}>
          {busy ? "Saving…" : "Accept and continue"}
        </button>
      </div>
    </div>
  );
}

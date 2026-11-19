"use client";
import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { COUNTIES } from "@/lib/types";
import { type PrefillFormValues } from "./prefill-values";
import { LICENSE_LOOKUP } from "./useAgentStatus";

/** Admin: fill in an agent's profile ahead of time. They see it pre-filled when they sign up with this email. */
export function PrefillForm({ initial, editing }: { initial: PrefillFormValues; editing: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof PrefillFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/admin/prefills", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...f, licensedSince: f.licensedSince ? Number(f.licensedSince) : null }),
    });
    setBusy(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return setErr(j.error ?? "Couldn't save.");
    toast(`Profile ready for ${f.name || f.email}. It fills in when they sign up with ${f.email}.`);
    router.push("/agent/prefill");
    router.refresh();
  };

  const input = (k: keyof PrefillFormValues, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="field">
      <label htmlFor={`pf-${k}`}>{label}</label>
      <input id={`pf-${k}`} className="input" value={f[k] as string} onChange={set(k)} {...props} />
    </div>
  );

  return (
    <form onSubmit={save} className="flex flex-col gap-5" noValidate>
      <section className="grid gap-3 sm:grid-cols-2">
        {input("email", "Agent's email (what they'll sign up with)", { type: "email", required: true, readOnly: editing, placeholder: "jane@realty.com" })}
        {input("name", "Full name", { placeholder: "Jane Smith" })}
        {input("brokerage", "Brokerage", { placeholder: "Example Realty" })}
        {input("teamName", "Team (optional)")}
        {input("phone", "Mobile phone", { inputMode: "tel" })}
        {input("officePhone", "Office phone (optional)", { inputMode: "tel" })}
        <div className="sm:col-span-2">{input("officeAddress", "Office address (optional)")}</div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[17px]">License</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {input("licenseNumber", "Indiana license #", { placeholder: "RB14012345" })}
          {input("mlsId", "MLS ID (optional)")}
          {input("licensedSince", "Licensed since (year)", { inputMode: "numeric", placeholder: "2018" })}
        </div>
        <label className="flex cursor-pointer items-start gap-2.5 rounded-[14px] bg-surface p-3.5 text-sm">
          <input
            type="checkbox"
            checked={f.licenseVerified}
            onChange={() => setF((s) => ({ ...s, licenseVerified: !s.licenseVerified }))}
            className="mt-0.5 h-[18px] w-[18px] flex-none accent-accent"
          />
          <span>
            <strong>I checked this license</strong> on the{" "}
            <a href={LICENSE_LOOKUP} target="_blank" rel="noopener noreferrer">
              Indiana lookup <ExternalLink size={12} className="inline" />
            </a>{" "}
            and the name and status match. They&apos;re verified as soon as they save with this license number.
          </span>
        </label>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[17px]">Counties they work</h2>
        <div className="flex flex-wrap gap-2">
          {COUNTIES.map((c) => {
            const on = f.counties.includes(c);
            return (
              <button
                type="button"
                key={c}
                aria-pressed={on}
                onClick={() => setF((s) => ({ ...s, counties: on ? s.counties.filter((x) => x !== c) : [...s.counties, c] }))}
                className={`btn min-h-10 text-[13px] ${on ? "btn-primary" : "btn-secondary"}`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {input("website", "Website", { placeholder: "https://" })}
        {input("instagram", "Instagram", { placeholder: "@handle" })}
        {input("facebook", "Facebook")}
        {input("linkedin", "LinkedIn")}
        <div className="field sm:col-span-2">
          <label htmlFor="pf-bio">Short bio (optional)</label>
          <textarea id="pf-bio" className="input min-h-24" maxLength={600} value={f.bio} onChange={set("bio")} />
        </div>
        <div className="field sm:col-span-2">
          <label htmlFor="pf-notes">Notes for you (where the info came from; the agent never sees this)</label>
          <textarea id="pf-notes" className="input min-h-16" maxLength={2000} value={f.notes} onChange={set("notes")} />
        </div>
      </section>

      {err && <div className="text-sm text-warn-text">{err}</div>}
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" disabled={busy || !f.email}>
          {busy ? "Saving…" : editing ? "Save changes" : "Save profile"}
        </button>
      </div>
    </form>
  );
}

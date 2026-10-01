"use client";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProfileForm({ email }: { email: string }) {
  const router = useRouter();
  const [f, setF] = useState({ name: "", brokerage: "", phone: "" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim() || !f.brokerage.trim() || f.phone.replace(/\D/g, "").length < 10) {
      setErr("Enter your name, brokerage and a 10-digit phone number.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/agent", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(f) });
    setBusy(false);
    if (!res.ok) setErr((await res.json().catch(() => ({}))).error ?? "Couldn't save. Try again.");
    else router.refresh();
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <div>
        <h1 className="text-[26px] lg:text-[32px]">Set up your agent profile</h1>
        <p className="mt-1 mb-0 text-sm text-neutral-700">
          Buyers see this on your listings when they tap &ldquo;Contact listing agent.&rdquo; Signed in as {email}.
        </p>
      </div>
      <div className="field">
        <label htmlFor="p-name">Your name</label>
        <input id="p-name" className="input" autoComplete="name" value={f.name} onChange={set("name")} />
      </div>
      <div className="field">
        <label htmlFor="p-brok">Brokerage</label>
        <input id="p-brok" className="input" autoComplete="organization" value={f.brokerage} onChange={set("brokerage")} />
      </div>
      <div className="field">
        <label htmlFor="p-phone">Phone</label>
        <input id="p-phone" className="input" type="tel" autoComplete="tel" value={f.phone} onChange={set("phone")} />
      </div>
      {err && <div className="-mt-2 text-xs text-warn-text">{err}</div>}
      <button className="btn btn-primary btn-flush min-h-12 px-4 text-[15px]" disabled={busy}>
        {busy ? "Saving…" : "Continue to my listings"}
        <ArrowRight size={16} className="ml-auto" />
      </button>
    </form>
  );
}

"use client";
import { ArrowRight, Check } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ next, linkError }: { next?: string; linkError?: boolean }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(linkError ? "That sign-in link didn't work. It may have expired, or it was opened in a different browser than the one you requested it from. Send a new one and open it on this device." : null);
  const [busy, setBusy] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setErr("Enter a valid email.");
      return;
    }
    setBusy(true);
    setErr(null);
    const redirect = `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`;
    const { error } = await createClient().auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } });
    setBusy(false);
    if (error) setErr(error.message);
    else setSent(true);
  };

  if (sent)
    return (
      <div className="flex flex-col items-start gap-2.5">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-accent text-white">
          <Check size={16} strokeWidth={2.5} />
        </span>
        <h1 className="text-[26px]">Check your email</h1>
        <p className="m-0 text-sm">
          We sent a sign-in link to <strong>{email}</strong>. Open it on this device to get to your listings.
        </p>
        <button className="btn btn-ghost" onClick={() => setSent(false)}>
          Use a different email
        </button>
      </div>
    );

  return (
    <form onSubmit={send} className="flex flex-col gap-4">
      <div>
        <h1 className="text-[26px] lg:text-[32px]">Agent sign in</h1>
        <p className="mt-1 mb-0 text-sm text-neutral-700">Post a listing with a seller concession and manage it from your dashboard. No password needed.</p>
      </div>
      <div className="field">
        <label htmlFor="email">Work email</label>
        <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {err && <div className="mt-1 text-xs text-warn-text">{err}</div>}
      </div>
      <button className="btn btn-primary btn-flush min-h-12 px-4 text-[15px]" disabled={busy}>
        {busy ? "Sending…" : "Email me a sign-in link"}
        <ArrowRight size={16} className="ml-auto" />
      </button>
    </form>
  );
}

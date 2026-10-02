"use client";
import { ArrowRight, Check, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Segmented } from "@/components/ui/Segmented";
import { createClient } from "@/lib/supabase/client";
import { AGENT_SIGNUP_OPEN, AGENT_TERMS_VERSION } from "@/content/agent-terms";
import { AgreeToTerms } from "./AgentTerms";

type Mode = "signin" | "signup" | "forgot";

const friendly = (msg: string) =>
  /invalid login credentials/i.test(msg)
    ? "Email or password is incorrect."
    : /already registered|already been registered/i.test(msg)
      ? "There's already an account with this email. Sign in instead."
      : /email not confirmed/i.test(msg)
        ? "Confirm your email first, then sign in."
        : msg;

export function LoginForm({ next, linkError }: { next?: string; linkError?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(
    linkError ? "That link didn't work. It may have expired or been opened in a different browser." : null,
  );
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const dest = next?.startsWith("/agent") ? next : "/agent";

  const go = () => {
    router.push(dest);
    router.refresh();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("Enter a valid email.");
    if (mode !== "forgot" && password.length < 8) return setErr("Passwords are at least 8 characters.");
    if (mode === "signup" && !agreed) return setErr("Please agree to the Agent Terms.");
    setBusy(true);
    const sb = createClient();
    const origin = window.location.origin;
    try {
      if (mode === "signin") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) return setErr(friendly(error.message));
        go();
      } else if (mode === "signup") {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${origin}/auth/callback`,
            // Copied onto the agent profile when it's created (api/agent).
            data: { agent_terms_version: AGENT_TERMS_VERSION, agent_terms_accepted_at: new Date().toISOString() },
          },
        });
        if (error) return setErr(friendly(error.message));
        // Supabase returns a session right away when "Confirm email" is off.
        if (data.session) go();
        else setNotice(`Check ${email} for a link to confirm your account, then sign in.`);
      } else {
        const { error } = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: `${origin}/auth/callback?next=/agent/reset-password`,
        });
        if (error) return setErr(friendly(error.message));
        setNotice(`If ${email} has an account, we sent a link to set a new password. Open it in this browser.`);
      }
    } finally {
      setBusy(false);
    }
  };

  if (notice)
    return (
      <div className="flex flex-col items-start gap-2.5">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-accent text-white">
          <Check size={16} strokeWidth={2.5} />
        </span>
        <h1 className="text-[26px]">Check your email</h1>
        <p className="m-0 text-sm">{notice}</p>
        <button
          className="btn btn-ghost"
          onClick={() => {
            setNotice(null);
            setMode("signin");
          }}
        >
          Back to sign in
        </button>
      </div>
    );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div>
        <h1 className="text-[26px] lg:text-[32px]">
          {mode === "signup" ? "Create your agent account" : mode === "forgot" ? "Reset your password" : "Agent sign in"}
        </h1>
        <p className="mt-1 mb-0 text-sm text-neutral-700">
          {mode === "forgot"
            ? "Enter your email and we'll send a link to set a new password."
            : "Post a listing with a seller concession and manage it from your dashboard."}
        </p>
      </div>

      {mode !== "forgot" && !AGENT_SIGNUP_OPEN && (
        <p className="m-0 rounded-[12px] bg-surface p-3 text-[13px]">New agent accounts aren&apos;t open yet. Existing accounts can sign in below.</p>
      )}
      {mode !== "forgot" && AGENT_SIGNUP_OPEN && (
        <Segmented
          label="Sign in or create account"
          value={mode}
          onChange={(m) => {
            setMode(m);
            setErr(null);
          }}
          options={[
            { value: "signin", label: "Sign in" },
            { value: "signup", label: "Create account" },
          ]}
        />
      )}

      <div className="field">
        <label htmlFor="email">Work email</label>
        <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      {mode !== "forgot" && (
        <div className="field">
          <label htmlFor="password">{mode === "signup" ? "Create a password (8+ characters)" : "Password"}</label>
          <div className="relative">
            <input
              id="password"
              className="input pr-12"
              type={show ? "text" : "password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute top-1/2 right-1 grid h-10 w-10 -translate-y-1/2 cursor-pointer place-items-center text-neutral-600"
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
      )}

      {mode === "signup" && <AgreeToTerms checked={agreed} onChange={setAgreed} />}

      {err && <div className="-mt-2 text-xs text-warn-text">{err}</div>}

      <button className="btn btn-primary btn-flush min-h-12 px-4 text-[15px]" disabled={busy}>
        {busy ? "One moment…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Email me a reset link" : "Sign in"}
        <ArrowRight size={16} className="ml-auto" />
      </button>

      {mode === "signin" && (
        <button type="button" className="btn btn-ghost self-start text-[13px]" onClick={() => setMode("forgot")}>
          Forgot password?
        </button>
      )}
      {mode === "forgot" && (
        <button type="button" className="btn btn-ghost self-start text-[13px]" onClick={() => setMode("signin")}>
          Back to sign in
        </button>
      )}
    </form>
  );
}

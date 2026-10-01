"use client";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";

export function NewPasswordForm({ email }: { email: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setErr("Passwords are at least 8 characters.");
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(error.message);
    toast("Password updated.");
    router.push("/agent");
    router.refresh();
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-4" noValidate>
      <div>
        <h1 className="text-[26px] lg:text-[32px]">Set a new password</h1>
        <p className="mt-1 mb-0 text-sm text-neutral-700">For {email}.</p>
      </div>
      <div className="field">
        <label htmlFor="new-pw">New password (8+ characters)</label>
        <div className="relative">
          <input id="new-pw" className="input pr-12" type={show ? "text" : "password"} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
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
      {err && <div className="-mt-2 text-xs text-warn-text">{err}</div>}
      <button className="btn btn-primary btn-flush min-h-12 px-4 text-[15px]" disabled={busy}>
        {busy ? "Saving…" : "Save password"}
        <ArrowRight size={16} className="ml-auto" />
      </button>
    </form>
  );
}

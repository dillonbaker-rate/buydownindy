"use client";
import { Send } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

/** Admin: send a [Test] copy of a hidden listing's email to any address, without changing the listing. */
export function SendTestEmail({ listingId, defaultTo }: { listingId: string; defaultTo: string }) {
  const toast = useToast();
  const [to, setTo] = useState(defaultTo);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    const r = await fetch("/api/admin/emails/test-handoff", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ listingId, to }),
    });
    setBusy(false);
    const j = await r.json().catch(() => ({}));
    toast(r.ok ? `Test sent to ${j.to}. Check the inbox (and spam).` : (j.error ?? "Couldn't send the test."));
  };

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <label htmlFor="test-to" className="text-[13px] font-semibold">
        Send me a test
      </label>
      <input id="test-to" className="input min-h-10 w-[260px] max-w-full" type="email" value={to} onChange={(e) => setTo(e.target.value)} required />
      <button className="btn btn-secondary min-h-10 text-[13px]" disabled={busy || !to}>
        <Send size={14} />
        {busy ? "Sending…" : "Send test"}
      </button>
    </form>
  );
}

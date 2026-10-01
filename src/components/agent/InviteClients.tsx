"use client";
import { Check, Copy, Mail, MessageSquare, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Invite } from "@/lib/invites";

const BLANK = { clientName: "", clientEmail: "", clientPhone: "" };

const message = (first: string, url: string, agent: string) =>
  `Hi ${first}! Here are Indy-area homes where the seller will pay concessions. Tap any home to see what that money does to your monthly payment: ${url} - ${agent}`;

function ShareButtons({ invite, agentName }: { invite: Pick<Invite, "code" | "clientName" | "clientEmail" | "clientPhone">; agentName: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? `/i/${invite.code}` : `${window.location.origin}/i/${invite.code}`;
  const msg = message(invite.clientName.split(" ")[0], url, agentName);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this link:", url);
    }
  };
  const phone = (invite.clientPhone ?? "").replace(/[^0-9+]/g, "");
  return (
    <div className="flex flex-wrap gap-1.5">
      <button type="button" className="btn btn-secondary min-h-10 text-[13px]" onClick={copy}>
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? "Copied" : "Copy link"}
      </button>
      <a className="btn btn-secondary min-h-10 text-[13px]" href={`sms:${phone}?&body=${encodeURIComponent(msg)}`}>
        <MessageSquare size={14} />
        Text
      </a>
      <a
        className="btn btn-secondary min-h-10 text-[13px]"
        href={`mailto:${invite.clientEmail ?? ""}?subject=${encodeURIComponent("Homes where the seller pays concessions")}&body=${encodeURIComponent(msg)}`}
      >
        <Mail size={14} />
        Email
      </a>
    </div>
  );
}

const opened = (i: Invite) =>
  i.openCount
    ? `Opened ${i.openCount} time${i.openCount === 1 ? "" : "s"} · last ${new Date(i.lastOpenedAt!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : "Not opened yet";

/** "Your clients" on My listings: invite buyers to the search with a personal link. */
export function InviteClients({ invites, agentName }: { invites: Invite[]; agentName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(BLANK);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ code: string } & typeof BLANK | null>(null);
  const set = (k: keyof typeof BLANK) => (e: React.ChangeEvent<HTMLInputElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.clientName.trim()) return setErr("Enter your client's name.");
    if (f.clientEmail && !/^\S+@\S+\.\S+$/.test(f.clientEmail)) return setErr("That email doesn't look right.");
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/invites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(f) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j.error ?? "Couldn't create the invite. Try again.");
    setCreated({ code: j.code, ...f });
    setF(BLANK);
    router.refresh();
  };

  return (
    <section className="mb-4 rounded-[18px] border border-divider p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[17px]">Your clients</h2>
          <p className="m-0 text-[13px] text-neutral-700">
            Send buyers a personal link to the search. They&apos;ll see your name, and you can tell when they open it.
          </p>
        </div>
        {!open && (
          <button
            className="btn btn-primary"
            onClick={() => {
              setOpen(true);
              setCreated(null);
            }}
          >
            <Plus size={16} />
            Invite a client
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 rounded-[14px] bg-surface p-3.5">
          {created ? (
            <div className="flex flex-col gap-2.5">
              <div className="text-sm font-semibold">
                Invite ready for {created.clientName}. Send it from your phone or email:
              </div>
              <ShareButtons
                invite={{ code: created.code, clientName: created.clientName, clientEmail: created.clientEmail || null, clientPhone: created.clientPhone || null }}
                agentName={agentName}
              />
              <div className="flex gap-2">
                <button className="btn btn-ghost text-[13px]" onClick={() => setCreated(null)}>
                  Invite another client
                </button>
                <button className="btn btn-ghost text-[13px]" onClick={() => setOpen(false)}>
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Invite a client</span>
                <button type="button" className="btn h-9 min-h-9 w-9 p-0" aria-label="Close" onClick={() => setOpen(false)}>
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="field">
                  <label htmlFor="ic-name">Client name</label>
                  <input id="ic-name" className="input" autoComplete="off" value={f.clientName} onChange={set("clientName")} />
                </div>
                <div className="field">
                  <label htmlFor="ic-email">Email (optional)</label>
                  <input id="ic-email" className="input" type="email" autoComplete="off" value={f.clientEmail} onChange={set("clientEmail")} />
                </div>
                <div className="field">
                  <label htmlFor="ic-phone">Mobile (optional)</label>
                  <input id="ic-phone" className="input" type="tel" autoComplete="off" value={f.clientPhone} onChange={set("clientPhone")} />
                </div>
              </div>
              {err && <div className="-mt-1 text-xs text-warn-text">{err}</div>}
              <button className="btn btn-primary self-start" disabled={busy}>
                {busy ? "Creating…" : "Create invite link"}
              </button>
            </form>
          )}
        </div>
      )}

      {invites.length > 0 && (
        <div className="mt-3 flex flex-col">
          {invites.map((i) => (
            <div key={i.code} className="flex flex-wrap items-center justify-between gap-2 border-t border-divider py-3">
              <div className="min-w-0">
                <div className="text-sm font-bold">{i.clientName}</div>
                <div className="text-xs text-neutral-700">
                  {[i.clientEmail, i.clientPhone].filter(Boolean).join(" · ") || "No contact saved"} ·{" "}
                  <span style={{ color: i.openCount ? "var(--color-accent-700)" : undefined }}>{opened(i)}</span>
                </div>
              </div>
              <ShareButtons invite={i} agentName={agentName} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

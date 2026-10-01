"use client";
import { ChevronDown, Download, Mail, MessageCircle, Phone, UserCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { LEAD_STATUSES, type Lead, type LeadStatus } from "@/lib/leads-shared";

const STATUS_STYLE: Record<LeadStatus, { bg: string; fg: string }> = {
  new: { bg: "var(--color-accent)", fg: "#fff" },
  contacted: { bg: "var(--color-accent-100)", fg: "var(--color-accent-800)" },
  qualified: { bg: "var(--color-accent-200)", fg: "var(--color-accent-800)" },
  closed: { bg: "var(--color-ink)", fg: "#fff" },
  not_a_fit: { bg: "var(--color-neutral-200)", fg: "var(--color-neutral-800)" },
};

const when = (iso: string) => {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)} min ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} hr ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

function LeadCard({ lead }: { lead: Lead }) {
  const router = useRouter();
  const toast = useToast();
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [open, setOpen] = useState(lead.status === "new");
  const [busy, setBusy] = useState(false);

  const save = async (patch: { status?: LeadStatus; notes?: string | null }) => {
    setBusy(true);
    const r = await fetch(`/api/admin/leads/${lead.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
    setBusy(false);
    if (!r.ok) return toast((await r.json().catch(() => ({}))).error ?? "Couldn't save.");
    if (patch.notes !== undefined) toast("Notes saved.");
    router.refresh();
  };

  const st = STATUS_STYLE[lead.status];
  const tel = lead.phone.replace(/[^0-9+]/g, "");
  return (
    <div className="rounded-[18px] border border-divider bg-bg">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-start gap-3 p-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-bold">{lead.name}</span>
            <span className="tag font-semibold" style={{ background: st.bg, color: st.fg }}>
              {LEAD_STATUSES.find((s) => s.value === lead.status)?.label}
            </span>
            {lead.topic === "points" && <span className="tag tag-accent font-semibold">Asked about points</span>}
          </div>
          <div className="mt-0.5 text-[13px] text-neutral-700">
            {lead.listingLabel ?? "General inquiry"} · {when(lead.createdAt)}
          </div>
        </div>
        <ChevronDown size={18} className="mt-1 flex-none text-neutral-600 transition-transform" style={{ transform: open ? "rotate(180deg)" : "none" }} />
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-divider p-4">
          <div className="flex flex-wrap gap-2">
            <a href={`tel:${tel}`} className="btn btn-primary min-h-10 text-[13px]">
              <Phone size={14} />
              {lead.phone}
            </a>
            <a href={`sms:${tel}`} className="btn btn-secondary min-h-10 text-[13px]">
              <MessageCircle size={14} />
              Text
            </a>
            <a href={`mailto:${lead.email}`} className="btn btn-secondary min-h-10 text-[13px]">
              <Mail size={14} />
              {lead.email}
            </a>
            {lead.listingId && (
              <Link href={`/listing/${lead.listingId}`} className="btn btn-ghost min-h-10 text-[13px]">
                View listing
              </Link>
            )}
          </div>

          {lead.invitedBy && (
            <div className="flex items-center gap-1.5 text-[13px]">
              <UserCheck size={15} className="text-accent" />
              Invited by agent <strong>{lead.invitedBy}</strong>
            </div>
          )}
          {lead.message && (
            <div className="rounded-[14px] bg-surface p-3 text-sm">
              <div className="mb-0.5 text-[11px] font-semibold text-neutral-700">Message</div>
              {lead.message}
            </div>
          )}

          {lead.answers.length > 0 && (
            <div className="overflow-hidden rounded-[14px] border border-divider">
              {lead.answers.map((a) => (
                <div key={a.question} className="grid grid-cols-1 gap-0.5 border-b border-divider px-3 py-2 text-[13px] last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-3">
                  <span className="text-neutral-700">{a.question}</span>
                  <span className="font-semibold">{a.answer}</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-[200px_minmax(0,1fr)]">
            <div className="field">
              <label htmlFor={`st-${lead.id}`}>Status</label>
              <select id={`st-${lead.id}`} className="input" value={lead.status} disabled={busy} onChange={(e) => save({ status: e.target.value as LeadStatus })}>
                {LEAD_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor={`nt-${lead.id}`}>Notes</label>
              <textarea id={`nt-${lead.id}`} className="input !min-h-[44px]" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Called, left voicemail…" />
              {notes !== (lead.notes ?? "") && (
                <button className="btn btn-secondary mt-1.5 min-h-9 text-[13px]" disabled={busy} onClick={() => save({ notes: notes.trim() || null })}>
                  Save notes
                </button>
              )}
            </div>
          </div>
          <div className="text-[11px] text-neutral-700">
            Consent given {new Date(lead.consentAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}: &ldquo;{lead.consentText}&rdquo;
          </div>
        </div>
      )}
    </div>
  );
}

/** Super admin's leads inbox: every "Talk to a lender" request. */
export function LeadsInbox({ leads }: { leads: Lead[] }) {
  const [filter, setFilter] = useState<"open" | "all">("open");
  const open = leads.filter((l) => l.status === "new" || l.status === "contacted" || l.status === "qualified");
  const shown = filter === "open" ? open : leads;
  const newCount = leads.filter((l) => l.status === "new").length;
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="mx-auto max-w-[900px] p-4 lg:p-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[26px] lg:text-[32px]">Leads</h1>
            <div className="text-[13px] text-neutral-700">
              {leads.length} total · {newCount} new · from &ldquo;Talk to a lender&rdquo;
            </div>
          </div>
          {leads.length > 0 && (
             
            <a href="/api/admin/leads" download className="btn btn-secondary">
              <Download size={16} />
              Download CSV
            </a>
          )}
        </div>
        <div className="mb-3 rounded-[14px] bg-surface p-3 text-xs text-neutral-700">
          Email alerts for new leads are off for now. New requests appear here as soon as a buyer sends one.
        </div>
        <div className="mb-3 flex gap-2">
          <button className={`btn min-h-10 text-[13px] ${filter === "open" ? "btn-primary" : "btn-secondary"}`} onClick={() => setFilter("open")}>
            Open ({open.length})
          </button>
          <button className={`btn min-h-10 text-[13px] ${filter === "all" ? "btn-primary" : "btn-secondary"}`} onClick={() => setFilter("all")}>
            All ({leads.length})
          </button>
        </div>
        {shown.length === 0 ? (
          <div className="py-8 text-sm text-neutral-700">
            {leads.length === 0 ? "No leads yet. They'll show up here when buyers use Talk to a lender." : "No open leads."}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {shown.map((l) => (
              <LeadCard key={l.id} lead={l} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

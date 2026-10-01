"use client";
import { ArrowRight, Check, X } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { FREE_TO_CHOOSE, LENDER_CONSENT } from "@/content/disclosures";
import { usd } from "@/lib/buydown";
import type { Listing } from "@/lib/types";

const BLANK = { name: "", email: "", phone: "", message: "", consent: false };
type Errors = Partial<Record<"name" | "email" | "phone" | "consent" | "form", string>>;

export function validateLead(f: typeof BLANK): Errors {
  const e: Errors = {};
  if (!f.name.trim()) e.name = "Enter your name.";
  if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = "Enter a valid email.";
  if (f.phone.replace(/\D/g, "").length < 10) e.phone = "Enter a 10-digit phone number.";
  if (!f.consent) e.consent = "Check the box so a loan officer can contact you.";
  return e;
}

export function LenderModal({ open, onClose, listing }: { open: boolean; onClose: () => void; listing: Listing }) {
  const [f, setF] = useState(BLANK);
  const [err, setErr] = useState<Errors>({});
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof BLANK) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  const close = () => {
    onClose();
    if (sent) {
      setSent(false);
      setF(BLANK);
    }
    setErr({});
  };

  const submit = async () => {
    const e = validateLead(f);
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          listingLabel: `${listing.address}, ${listing.city}`,
          name: f.name,
          email: f.email,
          phone: f.phone,
          message: f.message || undefined,
          consent: true,
          consentText: LENDER_CONSENT,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr({ form: j.error ?? "Something went wrong. Please try again." });
        return;
      }
      setSent(true);
    } catch {
      setErr({ form: "Couldn't send. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  };

  const Err = ({ k }: { k: keyof Errors }) =>
    err[k] ? <div className="mt-1 text-xs text-warn-text">{err[k]}</div> : null;

  return (
    <Modal open={open} onClose={close} label="Talk to a lender">
      {!sent ? (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 leading-[1.4]">
              <div className="mb-0.5 text-xl font-bold">Talk to a lender</div>
              <div className="text-[13px] text-neutral-700">
                About {listing.address} · {usd(listing.concession)} concession
              </div>
            </div>
            <button className="btn h-11 w-11 p-0" onClick={close} aria-label="Close">
              <X size={16} />
            </button>
          </div>
          <div className="grid gap-2.5">
            <div className="field">
              <label htmlFor="ld-name">Name</label>
              <input id="ld-name" className="input" autoComplete="name" value={f.name} onChange={set("name")} />
              <Err k="name" />
            </div>
            <div className="field">
              <label htmlFor="ld-email">Email</label>
              <input id="ld-email" className="input" type="email" autoComplete="email" value={f.email} onChange={set("email")} />
              <Err k="email" />
            </div>
            <div className="field">
              <label htmlFor="ld-phone">Phone</label>
              <input id="ld-phone" className="input" type="tel" autoComplete="tel" value={f.phone} onChange={set("phone")} />
              <Err k="phone" />
            </div>
            <div className="field">
              <label htmlFor="ld-msg">Message (optional)</label>
              <textarea
                id="ld-msg"
                className="input"
                value={f.message}
                onChange={set("message")}
                placeholder="Questions about the 2-1 buydown, timing, etc."
              />
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-[1.45]">
              <input
                type="checkbox"
                checked={f.consent}
                onChange={() => setF((s) => ({ ...s, consent: !s.consent }))}
                className="mt-px h-[18px] w-[18px] flex-none accent-accent"
              />
              {/* COMPLIANCE: TCPA consent wording — confirm with compliance. */}
              <span>{LENDER_CONSENT}</span>
            </label>
            <Err k="consent" />
            <div className="text-[13px] font-semibold">{FREE_TO_CHOOSE}</div>
            <Err k="form" />
          </div>
          <div className="mt-2 flex gap-2">
            <button className="btn btn-primary btn-flush min-h-12 flex-1 px-4" onClick={submit} disabled={busy}>
              {busy ? "Sending…" : "Send request"}
              <ArrowRight size={16} className="ml-auto" />
            </button>
            <button className="btn btn-secondary min-h-12" onClick={close}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-start gap-2.5">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-accent text-white">
            <Check size={16} strokeWidth={2.5} />
          </span>
          <div className="text-xl font-bold">Request sent</div>
          <p className="m-0 text-sm">
            Thanks, {f.name}. A loan officer will reach out within one business day. {FREE_TO_CHOOSE}
          </p>
          <button className="btn btn-primary" onClick={close}>
            Done
          </button>
        </div>
      )}
    </Modal>
  );
}

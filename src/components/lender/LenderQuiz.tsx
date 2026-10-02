"use client";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FREE_TO_CHOOSE, LENDER_CONSENT } from "@/content/disclosures";
import { priceRangeFor, QUIZ, type QuizAnswer, type QuizQuestion } from "@/content/lender-quiz";
import { kUsd, usd } from "@/lib/buydown";
import { LenderStrip } from "./LenderCard";
import { commas, digitsOnly } from "@/lib/format";

export interface QuizListing {
  id: string;
  address: string;
  city: string;
  price: number;
  concession: number;
}

type Value = string | string[] | Record<string, string>;
type Topic = "points" | "general";

const CONTACT_BLANK = { name: "", email: "", phone: "", message: "", consent: false };
type Errors = Partial<Record<"name" | "email" | "phone" | "consent" | "form", string>>;

function validate(f: typeof CONTACT_BLANK): Errors {
  const e: Errors = {};
  if (!f.name.trim()) e.name = "Enter your name.";
  if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = "Enter a valid email.";
  if (f.phone.replace(/\D/g, "").length < 10) e.phone = "Enter a 10-digit phone number.";
  if (!f.consent) e.consent = "Check the box so a loan officer can contact you.";
  return e;
}

/** Questions in order, with each follow-up resolved from its main answer (null = not known yet). */
function sequence(answers: Record<string, Value>): (QuizQuestion | null)[] {
  const out: (QuizQuestion | null)[] = [];
  for (const m of QUIZ) {
    out.push(m.q);
    if (!m.followUp) continue;
    const a = answers[m.q.id];
    if (typeof a === "string") {
      const fu = m.followUp(a);
      if (fu) out.push(fu);
    } else out.push(null); // placeholder so progress stays steady
  }
  return out;
}

function answerText(q: QuizQuestion, v: Value): string {
  if (q.kind === "multi") return (v as string[]).join(", ") || "None selected";
  if (q.kind === "debts") {
    const d = v as Record<string, string>;
    const total = q.fields.reduce((s, f) => s + (Number(d[f.value]) || 0), 0);
    if (!total) return "No monthly debts";
    return q.fields.map((f) => `${f.label} ${usd(Number(d[f.value]) || 0)}`).join(" · ") + ` (total ${usd(total)}/mo)`;
  }
  return v as string;
}

export function LenderQuiz({ listing, topic }: { listing: QuizListing | null; topic: Topic }) {
  const [answers, setAnswers] = useState<Record<string, Value>>(() => (listing ? { price: priceRangeFor(listing.price) } : ({} as Record<string, Value>)));
  const [i, setI] = useState(0);
  const [contact, setContact] = useState(CONTACT_BLANK);
  const [err, setErr] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const seq = useMemo(() => sequence(answers), [answers]);
  const total = seq.length + 1; // + contact step
  // Number by main question so the count never changes; a follow-up keeps its main question's number.
  const mainIds = useMemo(() => new Set(QUIZ.map((m) => m.q.id)), []);
  const mainNum = seq.slice(0, i + 1).filter((x) => x && mainIds.has(x.id)).length;
  const onContact = i >= seq.length;
  const q = onContact ? null : seq[i];
  const backHref = listing ? `/listing/${listing.id}` : "/homes";

  const set = (id: string, v: Value) => setAnswers((s) => ({ ...s, [id]: v }));
  const next = () => setI((n) => Math.min(n + 1, seq.length));
  const pick = (id: string, v: string) => {
    set(id, v);
    setTimeout(() => setI((n) => n + 1), 160);
  };

  const submit = async () => {
    const e = validate(contact);
    setErr(e);
    if (Object.keys(e).length) return;
    const qa: QuizAnswer[] = seq
      .filter((x): x is QuizQuestion => !!x && answers[x.id] !== undefined)
      .map((x) => ({ id: x.id, question: x.prompt, answer: answerText(x, answers[x.id]) }));
    setBusy(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          listingId: listing?.id,
          listingLabel: listing ? `${listing.address}, ${listing.city}` : undefined,
          topic,
          answers: qa,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          message: contact.message || undefined,
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

  if (sent)
    return (
      <div className="flex flex-col items-start gap-2.5">
        <div className="mb-2 w-full">
          <LenderStrip />
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-full bg-accent text-white">
          <Check size={16} strokeWidth={2.5} />
        </span>
        <h1 className="text-[26px]">Request sent</h1>
        <p className="m-0 text-sm">
          Thanks, {contact.name.split(" ")[0]}. Dillon Baker will get back to you by phone, text, or email
          {topic === "points" ? " with today's options for buying down your rate" : ""}. {FREE_TO_CHOOSE}
        </p>
        <Link href={backHref} className="btn btn-primary">
          {listing ? "Back to the listing" : "Back to the map"}
        </Link>
      </div>
    );

  const Err = ({ k }: { k: keyof Errors }) => (err[k] ? <div className="mt-1 text-xs text-warn-text">{err[k]}</div> : null);
  const optBtn = (on: boolean) =>
    `btn btn-flush min-h-[52px] w-full px-4 text-[15px] font-semibold ${on ? "!bg-accent !text-white" : "border-divider bg-bg hover:!bg-accent-100"}`;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <LenderStrip />
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-xs text-neutral-700">
          {topic === "points" ? "Permanent buydowns (points)" : "Talk to a lender"}
          {listing && (
            <>
              {" · "}
              {listing.address} · {kUsd(listing.concession)} seller concession
            </>
          )}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-neutral-300" aria-hidden>
          <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${((i + 1) / total) * 100}%` }} />
        </div>
        <div className="text-[11px] text-neutral-700">
          {onContact ? "Last step" : `Question ${mainNum} of ${QUIZ.length}`} · About 2 minutes · Nothing here checks your credit
        </div>
      </div>

      {q && (
        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0" key={q.id}>
          <legend className="mb-1 p-0">
            <h1 className="text-[22px] leading-tight lg:text-[26px]">{q.prompt}</h1>
            {q.help && <p className="mt-1 mb-0 text-sm text-neutral-700">{q.help}</p>}
            {q.id === "price" && listing && <p className="mt-1 mb-0 text-sm text-neutral-700">Preselected from this home&apos;s price.</p>}
          </legend>

          {q.kind === "single" &&
            q.options.map((o) => (
              <button
                key={o.value}
                type="button"
                aria-pressed={answers[q.id] === o.value}
                className={optBtn(answers[q.id] === o.value)}
                style={{ border: "1px solid var(--color-divider)" }}
                onClick={() => pick(q.id, o.value)}
              >
                {o.label}
                {answers[q.id] === o.value && <Check size={16} className="ml-auto" />}
              </button>
            ))}

          {q.kind === "multi" && (
            <>
              {q.options.map((o) => {
                const cur = (answers[q.id] as string[] | undefined) ?? [];
                const on = cur.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={on}
                    className={optBtn(on)}
                    style={{ border: "1px solid var(--color-divider)" }}
                    onClick={() => set(q.id, on ? cur.filter((x) => x !== o.value) : [...cur, o.value])}
                  >
                    {o.label}
                    {on && <Check size={16} className="ml-auto" />}
                  </button>
                );
              })}
              <button
                type="button"
                className="btn btn-primary btn-flush min-h-12 px-4 text-[15px]"
                disabled={!((answers[q.id] as string[] | undefined) ?? []).length}
                onClick={next}
              >
                Continue
                <ArrowRight size={16} className="ml-auto" />
              </button>
            </>
          )}

          {q.kind === "debts" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {q.fields.map((f) => {
                  const d = (answers[q.id] as Record<string, string> | undefined) ?? {};
                  return (
                    <div className="field" key={f.value}>
                      <label htmlFor={`d-${f.value}`}>{f.label}</label>
                      <input
                        id={`d-${f.value}`}
                        className="input"
                        inputMode="numeric"
                        placeholder="$0"
                        value={commas(d[f.value] ?? "")}
                        onChange={(e) => set(q.id, { ...d, [f.value]: digitsOnly(e.target.value) })}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" className="btn btn-primary btn-flush min-h-12 flex-1 px-4 text-[15px]" onClick={next}>
                  Continue
                  <ArrowRight size={16} className="ml-auto" />
                </button>
                <button
                  type="button"
                  className="btn btn-secondary min-h-12"
                  onClick={() => {
                    set(q.id, {});
                    next();
                  }}
                >
                  I don&apos;t have monthly debts
                </button>
              </div>
            </>
          )}
        </fieldset>
      )}

      {onContact && (
        <div className="flex flex-col gap-3">
          <div>
            <h1 className="text-[22px] leading-tight lg:text-[26px]">Where should a loan officer reach you?</h1>
            <p className="mt-1 mb-0 text-sm text-neutral-700">They&apos;ll review your answers before they call, so you won&apos;t have to repeat yourself.</p>
          </div>
          <div className="field">
            <label htmlFor="c-name">Name</label>
            <input id="c-name" className="input" autoComplete="name" value={contact.name} onChange={(e) => setContact((s) => ({ ...s, name: e.target.value }))} />
            <Err k="name" />
          </div>
          <div className="field">
            <label htmlFor="c-email">Email</label>
            <input id="c-email" className="input" type="email" autoComplete="email" value={contact.email} onChange={(e) => setContact((s) => ({ ...s, email: e.target.value }))} />
            <Err k="email" />
          </div>
          <div className="field">
            <label htmlFor="c-phone">Phone</label>
            <input id="c-phone" className="input" type="tel" autoComplete="tel" value={contact.phone} onChange={(e) => setContact((s) => ({ ...s, phone: e.target.value }))} />
            <Err k="phone" />
          </div>
          <div className="field">
            <label htmlFor="c-msg">Anything else? (optional)</label>
            <textarea
              id="c-msg"
              className="input"
              value={contact.message}
              onChange={(e) => setContact((s) => ({ ...s, message: e.target.value }))}
              placeholder={topic === "points" ? "e.g. How many points would it take to get my rate down?" : "Questions about the 2-1 buydown, timing, etc."}
            />
          </div>
          <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-[1.45]">
            <input
              type="checkbox"
              checked={contact.consent}
              onChange={() => setContact((s) => ({ ...s, consent: !s.consent }))}
              className="mt-px h-[18px] w-[18px] flex-none accent-accent"
            />
            {/* COMPLIANCE: TCPA consent wording — confirm with compliance. */}
            <span>{LENDER_CONSENT}</span>
          </label>
          <div className="-mt-2 pl-[28px] text-xs">
            <Link href="/privacy" target="_blank" className="font-semibold">
              Privacy policy
            </Link>
            {" · "}
            <Link href="/terms" target="_blank" className="font-semibold">
              Terms of use
            </Link>
          </div>
          <Err k="consent" />
          <div className="text-[13px] font-semibold">{FREE_TO_CHOOSE}</div>
          <Err k="form" />
          <button className="btn btn-primary btn-flush min-h-12 px-4 text-[15px]" onClick={submit} disabled={busy}>
            {busy ? "Sending…" : "Send to a loan officer"}
            <ArrowRight size={16} className="ml-auto" />
          </button>
        </div>
      )}

      <div className="flex border-t border-divider pt-4">
        {i > 0 ? (
          <button type="button" className="btn btn-secondary" onClick={() => setI((n) => n - 1)}>
            <ArrowLeft size={16} />
            Back
          </button>
        ) : (
          <Link href={backHref} className="btn btn-secondary">
            <ArrowLeft size={16} />
            {listing ? "Back to the listing" : "Back to the map"}
          </Link>
        )}
        {q && q.kind === "single" && answers[q.id] !== undefined && (
          <button type="button" className="btn btn-ghost ml-auto" onClick={next}>
            Next
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

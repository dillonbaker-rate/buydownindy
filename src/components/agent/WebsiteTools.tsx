"use client";
import { Check, Copy, KeyRound, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

export interface ToolListing {
  id: string;
  label: string;
  newsletterHtml: string;
}
export interface ToolKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

function CopyBox({ text, label, rows = 4 }: { text: string; label: string; rows?: number }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <textarea readOnly rows={rows} value={text} aria-label={label} className="input font-mono !text-xs" onFocus={(e) => e.currentTarget.select()} />
      <button
        type="button"
        className="btn btn-secondary min-h-10 self-start text-[13px]"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          } catch {}
        }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? "Copied" : `Copy ${label}`}
      </button>
    </div>
  );
}

const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "never");

export function WebsiteTools({
  allowed,
  reason,
  admin,
  enabled,
  listings,
  keys,
  origin,
  asOf,
}: {
  allowed: boolean;
  reason?: string;
  admin: boolean;
  enabled: boolean;
  listings: ToolListing[];
  keys: ToolKey[];
  origin: string;
  asOf: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pick, setPick] = useState(listings[0]?.id ?? "");
  const [keyName, setKeyName] = useState("My website");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cur = listings.find((l) => l.id === pick);
  const embed = cur
    ? `<iframe src="${origin}/embed/listing/${cur.id}" title="${cur.label.replace(/"/g, "")} — buydown vs. price cut" width="100%" height="360" loading="lazy" style="border:0;max-width:480px"></iframe>`
    : "";

  const toggle = async () => {
    setBusy(true);
    const r = await fetch("/api/admin/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ marketingEnabled: !enabled }) });
    setBusy(false);
    if (!r.ok) return toast((await r.json().catch(() => ({}))).error ?? "Couldn't change the setting.");
    toast(!enabled ? "Website tools are on for verified agents." : "Website tools are off for agents.");
    router.refresh();
  };
  const createKey = async () => {
    setBusy(true);
    const r = await fetch("/api/agent/api-keys", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: keyName }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return toast(j.error ?? "Couldn't create a key.");
    setNewKey(j.key);
    router.refresh();
  };
  const revoke = async (id: string) => {
    if (!confirm("Revoke this key? Anything using it stops working.")) return;
    const r = await fetch(`/api/agent/api-keys/${id}`, { method: "DELETE" });
    if (!r.ok) return toast("Couldn't revoke the key.");
    toast("Key revoked.");
    router.refresh();
  };

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="mx-auto flex max-w-[860px] flex-col gap-6 p-4 lg:p-8">
        <div>
          <h1 className="text-[26px] lg:text-[32px]">Website &amp; newsletter tools</h1>
          <p className="m-0 mt-1 text-sm text-neutral-700">
            Show a listing&apos;s live buydown numbers on your website or in your newsletter. Disclosures are built in and always included.
          </p>
        </div>

        {admin && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] p-4" style={{ background: enabled ? "var(--color-accent-100)" : "var(--color-warn-bg)" }}>
            <div className="text-sm">
              <strong>Agent access: {enabled ? "On" : "Off"}.</strong>{" "}
              {enabled ? "License-verified agents can use these tools." : "Only admins can use these tools until compliance signs off."}
            </div>
            <button className="btn btn-secondary min-h-10 text-[13px]" disabled={busy} onClick={toggle}>
              {enabled ? "Turn off for agents" : "Turn on for verified agents"}
            </button>
          </div>
        )}

        {!allowed ? (
          <div className="flex items-start gap-3 rounded-[18px] bg-surface p-5 text-sm">
            <Lock size={18} className="mt-0.5 flex-none text-neutral-600" />
            <span>{reason}</span>
          </div>
        ) : listings.length === 0 ? (
          <div className="rounded-[18px] bg-surface p-5 text-sm">Post a live listing first. Its widget and newsletter block will show up here.</div>
        ) : (
          <>
            <section className="flex flex-col gap-3">
              <div className="field">
                <label htmlFor="wt-listing">Listing</label>
                <select id="wt-listing" className="input" value={pick} onChange={(e) => setPick(e.target.value)}>
                  {listings.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-[19px]">1. Website widget</h2>
              <p className="m-0 text-sm text-neutral-700">
                Paste this into your website (most site builders call it an &ldquo;embed&rdquo; or &ldquo;HTML&rdquo; block). It updates itself with
                today&apos;s rate and disappears if the listing goes off the market.
              </p>
              <CopyBox text={embed} label="widget code" rows={3} />
              <div className="text-xs font-semibold text-neutral-700">Preview</div>
              {cur && (
                <iframe key={cur.id} src={`/embed/listing/${cur.id}`} title="Widget preview" className="h-[360px] w-full max-w-[480px] rounded-[14px] border border-divider" />
              )}
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-[19px]">2. Newsletter block</h2>
              <p className="m-0 text-sm text-neutral-700">
                Email can&apos;t show live widgets, so this is a snapshot of today&apos;s numbers (as of {asOf}). Copy a fresh one for each newsletter.
                Paste it as HTML in Mailchimp, Constant Contact, Flodesk, etc.
              </p>
              {cur && (
                <>
                  <div className="overflow-hidden rounded-[14px] border border-divider bg-white p-3" dangerouslySetInnerHTML={{ __html: cur.newsletterHtml }} />
                  <CopyBox text={cur.newsletterHtml} label="newsletter HTML" rows={4} />
                </>
              )}
            </section>
          </>
        )}

        {allowed && (
          <section className="flex flex-col gap-3">
            <h2 className="text-[19px]">3. Data API (for developers)</h2>
            <p className="m-0 text-sm text-neutral-700">
              For your web developer or tools like Zapier: read-only listing data with payments and disclosures. Keep keys private. If a key leaks,
              revoke it.
            </p>
            {newKey && (
              <div className="rounded-[14px] border border-accent-300 bg-accent-100 p-3">
                <div className="mb-1.5 text-sm font-semibold">Your new key. Copy it now; it won&apos;t be shown again.</div>
                <CopyBox text={newKey} label="API key" rows={1} />
              </div>
            )}
            <div className="flex flex-wrap items-end gap-2">
              <div className="field min-w-[200px] flex-1">
                <label htmlFor="wt-keyname">Key name</label>
                <input id="wt-keyname" className="input" value={keyName} onChange={(e) => setKeyName(e.target.value)} />
              </div>
              <button className="btn btn-primary" disabled={busy || !keyName.trim()} onClick={createKey}>
                <KeyRound size={15} />
                Create key
              </button>
            </div>
            {keys.length > 0 && (
              <div className="overflow-hidden rounded-[14px] border border-divider text-[13px]">
                {keys.map((k) => (
                  <div key={k.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-divider px-3 py-2 last:border-b-0">
                    <span>
                      <strong>{k.name}</strong> <span className="font-mono text-neutral-700">{k.prefix}…</span>
                      <span className="text-neutral-700"> · created {date(k.createdAt)} · last used {date(k.lastUsedAt)}</span>
                    </span>
                    {k.revokedAt ? (
                      <span className="tag tag-neutral">Revoked</span>
                    ) : (
                      <button className="btn btn-ghost min-h-9 text-[13px]" onClick={() => revoke(k.id)}>
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <details className="rounded-[14px] bg-surface p-3 text-[13px]">
              <summary className="cursor-pointer font-semibold">How to use the API</summary>
              <div className="mt-2 flex flex-col gap-2">
                <div>Send your key in the Authorization header. Two read-only endpoints:</div>
                <code className="block rounded bg-bg p-2 font-mono text-xs whitespace-pre-wrap">
                  {`GET ${origin}/api/v1/listings            (optional ?city=Fishers&county=Hamilton)\nGET ${origin}/api/v1/listings/{id}`}
                </code>
                <code className="block rounded bg-bg p-2 font-mono text-xs whitespace-pre-wrap">
                  {`curl -H "Authorization: Bearer bdi_your_key" ${origin}/api/v1/listings`}
                </code>
                <div>
                  Each listing includes price, concession, the loan type and down payment used, the rate and its source and date, payments (no
                  concession, price cut, best buydown), a ready-made headline, the required disclaimer, lender contact, and links to the listing and
                  widget. Wherever you show the numbers, show the disclaimer with them.
                </div>
              </div>
            </details>
          </section>
        )}
      </div>
    </div>
  );
}

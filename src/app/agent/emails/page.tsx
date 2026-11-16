import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AgentHeader } from "@/components/agent/AgentHeader";
import { EmailFrame } from "@/components/agent/EmailFrame";
import { AppShell } from "@/components/ui/Header";
import { getCurrentAgent } from "@/lib/data";
import { EMAIL_KINDS, getEmail, listEmails, type EmailSummary } from "@/lib/email-log";
import { isSuperAdmin } from "@/lib/leads";
import { agentsEnabled } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "Emails · BuyDown Indy" };

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { timeZone: "America/Indiana/Indianapolis", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const STATUS = {
  sent: { label: "Sent", bg: "var(--color-accent-100)", fg: "var(--color-accent-800)" },
  failed: { label: "Failed", bg: "var(--color-warn-tag)", fg: "var(--color-warn-text)" },
  skipped: { label: "Not sent", bg: "var(--color-neutral-200)", fg: "var(--color-neutral-800)" },
} as const;

function StatusTag({ s }: { s: EmailSummary["status"] }) {
  const st = STATUS[s];
  return (
    <span className="tag flex-none font-semibold" style={{ background: st.bg, color: st.fg }}>
      {st.label}
    </span>
  );
}

// Super admin: every email the site has sent (new leads, agent sign-ups, verifications, listings sent to agents).
export default async function EmailsPage({ searchParams }: { searchParams: Promise<{ id?: string; kind?: string }> }) {
  if (!agentsEnabled) redirect("/agent");
  const me = await getCurrentAgent();
  if (!me) redirect("/agent/login?next=/agent/emails");
  if (!isSuperAdmin(me.email)) notFound();
  const { id, kind } = await searchParams;
  const [all, open] = await Promise.all([listEmails(), id ? getEmail(id) : Promise.resolve(null)]);
  const list = all?.filter((e) => !kind || e.kind === kind) ?? null;
  const href = (p: { id?: string; kind?: string }) => {
    const q = new URLSearchParams();
    if (p.kind) q.set("kind", p.kind);
    if (p.id) q.set("id", p.id);
    return `/agent/emails${q.size ? `?${q}` : ""}`;
  };

  return (
    <AppShell header={<AgentHeader admin />}>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-[1280px] p-4 lg:p-8">
          <div className="mb-4">
            <h1 className="text-[26px] lg:text-[32px]">Emails</h1>
            <div className="text-[13px] text-neutral-700">Every email BuyDown Indy sends, newest first. Delivery details are also in Resend → Logs.</div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {[["", "All"], ...Object.entries(EMAIL_KINDS)].map(([k, label]) => (
              <Link key={k} href={href({ kind: k || undefined })} className={`btn min-h-10 text-[13px] ${(kind ?? "") === k ? "btn-primary" : "btn-secondary"}`}>
                {label}
              </Link>
            ))}
          </div>

          {list === null ? (
            <p className="text-sm text-neutral-700">
              Not saving emails yet. Run <code>supabase/migrations/0013_email_log.sql</code> in the Supabase SQL editor; emails sent after that show up here.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
              <div className="flex flex-col">
                {list.length === 0 && <p className="text-sm text-neutral-700">No emails yet.</p>}
                {list.map((e) => (
                  <Link
                    key={e.id}
                    href={href({ kind, id: e.id })}
                    className={`flex flex-col gap-0.5 border-b border-divider px-3 py-3 text-ink no-underline hover:bg-surface ${open?.id === e.id ? "bg-accent-100" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-neutral-700">
                      <span>
                        {EMAIL_KINDS[e.kind] ?? e.kind} · {when(e.createdAt)}
                      </span>
                      <StatusTag s={e.status} />
                    </div>
                    <div className="truncate text-sm font-semibold">{e.subject}</div>
                    <div className="truncate text-xs text-neutral-700">To {e.to.join(", ")}</div>
                  </Link>
                ))}
              </div>

              <div className="min-w-0">
                {open ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1 text-[13px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold">{open.subject}</span>
                        <StatusTag s={open.status} />
                      </div>
                      <div className="text-neutral-700">
                        To {open.to.join(", ")}
                        {open.replyTo ? ` · replies go to ${open.replyTo}` : ""} · {when(open.createdAt)}
                      </div>
                      {open.error && <div className="text-warn-text">{open.error}</div>}
                    </div>
                    <EmailFrame html={open.html} title={open.subject} />
                  </div>
                ) : (
                  list.length > 0 && <p className="text-sm text-neutral-700">Pick an email to see it the way the recipient did.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

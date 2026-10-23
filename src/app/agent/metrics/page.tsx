import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AgentHeader } from "@/components/agent/AgentHeader";
import { AppShell } from "@/components/ui/Header";
import { getCurrentAgent } from "@/lib/data";
import { isSuperAdmin } from "@/lib/leads";
import { LEAD_STATUSES } from "@/lib/leads-shared";
import { loadMetrics } from "@/lib/metrics";
import type { Windowed } from "@/lib/metrics-shared";
import { isAdmin } from "@/lib/rates";
import { agentsEnabled } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "Metrics · BuyDown Indy" };

/** Visitor traffic lives in Vercel Web Analytics (team Dillon-Rate, project buydownindy). */
const VERCEL_ANALYTICS = "https://vercel.com/dillon-rate/buydownindy/analytics";

const n = (v: number) => v.toLocaleString("en-US");

function Tile({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[14px] border border-divider bg-bg p-4">
      <div className="text-[13px] text-neutral-700">{label}</div>
      <div className="text-[28px] leading-none font-bold tracking-[-0.02em] tabular-nums">{n(value)}</div>
      {sub && <div className="text-xs text-neutral-700">{sub}</div>}
    </div>
  );
}

function Section({ title, link, children }: { title: string; link?: { href: string; label: string }; children: ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-lg">{title}</h2>
        {link && (
          <Link href={link.href} className="text-[13px] font-semibold">
            {link.label}
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{children}</div>
    </section>
  );
}

const recent = (w: Windowed) => `${n(w.last7)} in the last 7 days · ${n(w.last30)} in 30`;

export default async function MetricsPage() {
  if (!agentsEnabled) redirect("/agent");
  const me = await getCurrentAgent();
  if (!me) redirect("/agent/login?next=/agent/metrics");
  const superAdmin = isSuperAdmin(me.email);
  if (!isAdmin(me.email) && !superAdmin) notFound();
  const m = await loadMetrics(superAdmin);
  const calcTotal = m.calculator ? m.calculator.payment.total + m.calculator.buydown.total : 0;

  return (
    <AppShell header={<AgentHeader admin />}>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-[1080px] p-4 lg:p-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-[26px] lg:text-[32px]">Metrics</h1>
              <div className="text-[13px] text-neutral-700">Agents, listings, leads and calculator use on BuyDown Indy.</div>
            </div>
            <a href={VERCEL_ANALYTICS} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              Visitor traffic in Vercel
              <ExternalLink size={14} />
            </a>
          </div>

          <Section title="Agents" link={{ href: "/agent/admin", label: "Agents page" }}>
            <Tile label="Agent accounts" value={m.agents.total} sub={recent(m.agents)} />
            <Tile label="Verified" value={m.agents.verified} />
            <Tile label="Waiting for verification" value={m.agents.pending} />
            <Tile label="Couldn't verify" value={m.agents.rejected} />
          </Section>

          <Section title="Listings" link={{ href: "/homes", label: "See the map" }}>
            <Tile label="Live now" value={m.listings.live} />
            <Tile label="Listings posted" value={m.listings.total} sub={recent(m.listings)} />
            <Tile label="Pending" value={m.listings.pending} />
            <Tile label="Sold" value={m.listings.sold} sub={`${n(m.listings.expired)} expired without renewing`} />
          </Section>

          {m.leads && (
            <Section title="Leads" link={{ href: "/agent/leads", label: "Leads inbox" }}>
              <Tile label="Talk-to-a-lender requests" value={m.leads.total} sub={recent(m.leads)} />
              <Tile label="Asked about points" value={m.leads.points} />
              {LEAD_STATUSES.map((s) => (
                <Tile key={s.value} label={s.label} value={m.leads!.byStatus[s.value] ?? 0} />
              ))}
            </Section>
          )}

          {m.calculator ? (
            <Section title="Calculator use" link={{ href: "/calculator", label: "Open the calculators" }}>
              <Tile label="Total uses" value={calcTotal} />
              <Tile label="Payment calculator" value={m.calculator.payment.total} sub={recent(m.calculator.payment)} />
              <Tile label="Buydown calculator" value={m.calculator.buydown.total} sub={recent(m.calculator.buydown)} />
            </Section>
          ) : (
            <section className="mb-8">
              <h2 className="mb-2 text-lg">Calculator use</h2>
              <p className="m-0 text-sm text-neutral-700">
                Not counting yet. Run <code>supabase/migrations/0010_site_events.sql</code> in the Supabase SQL editor to start.
              </p>
            </section>
          )}

          <p className="text-xs text-neutral-700">
            A calculator use is one visit where someone changed at least one number. Visits, page views, top pages and where visitors come
            from are in Vercel Web Analytics.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

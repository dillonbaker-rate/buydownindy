import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AgentHeader } from "@/components/agent/AgentHeader";
import { PrefillForm } from "@/components/agent/PrefillForm";
import { EMPTY_PREFILL, type PrefillFormValues } from "@/components/agent/prefill-values";
import { AppShell } from "@/components/ui/Header";
import { getCurrentAgent } from "@/lib/data";
import { getPrefill, listPrefills, type Prefill } from "@/lib/prefill";
import { isAdmin } from "@/lib/rates";
import { agentsEnabled } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pre-filled profiles · BuyDown Indy" };

const toForm = (p: Prefill): PrefillFormValues => ({
  email: p.email,
  name: p.name ?? "",
  brokerage: p.brokerage ?? "",
  phone: p.phone ?? "",
  teamName: p.teamName ?? "",
  officePhone: p.officePhone ?? "",
  officeAddress: p.officeAddress ?? "",
  licenseNumber: p.licenseNumber ?? "",
  mlsId: p.mlsId ?? "",
  licensedSince: p.licensedSince ? String(p.licensedSince) : "",
  counties: p.counties ?? [],
  website: p.website ?? "",
  instagram: p.instagram ?? "",
  facebook: p.facebook ?? "",
  linkedin: p.linkedin ?? "",
  bio: p.bio ?? "",
  licenseVerified: p.licenseVerified,
  notes: p.notes ?? "",
});

// Admin: agent profiles prepared ahead of time. When that agent signs up with the same email, their profile form is
// already filled in; they check it, add a headshot and save (verified right away if the license was checked here).
export default async function PrefillPage({ searchParams }: { searchParams: Promise<{ email?: string; new?: string }> }) {
  if (!agentsEnabled) redirect("/agent");
  const me = await getCurrentAgent();
  if (!me) redirect("/agent/login?next=/agent/prefill");
  if (!isAdmin(me.email)) notFound();
  const { email, new: isNew } = await searchParams;
  const [list, current] = await Promise.all([listPrefills(), email ? getPrefill(email) : Promise.resolve(null)]);
  const formOpen = !!email || isNew === "1";
  const initial = current ? toForm(current) : { ...EMPTY_PREFILL, email: email?.toLowerCase() ?? "" };

  return (
    <AppShell header={<AgentHeader admin />}>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-[1080px] p-4 lg:p-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-[26px] lg:text-[32px]">Pre-filled profiles</h1>
              <div className="max-w-[640px] text-[13px] text-neutral-700">
                Fill in an agent&apos;s profile before they sign up. When they create an account with that email, everything is
                already there: they check it, add a headshot, and save. Grok can fill these in too (prefill_agent_profile).
              </div>
            </div>
            {!formOpen && (
              <Link href="/agent/prefill?new=1" className="btn btn-primary">
                Pre-fill an agent
              </Link>
            )}
          </div>

          {list === null ? (
            <p className="text-sm text-neutral-700">
              Not set up yet. Run <code>supabase/migrations/0016_agent_prefills.sql</code> in the Supabase SQL editor.
            </p>
          ) : formOpen ? (
            <div className="max-w-[760px]">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg">{current ? `Edit ${current.name || current.email}` : "New pre-filled profile"}</h2>
                <Link href="/agent/prefill" className="text-[13px] font-semibold">
                  Back to the list
                </Link>
              </div>
              {current?.usedAt && (
                <p className="mb-3 text-sm text-neutral-700">This agent already signed up, so changes here won&apos;t reach their profile.</p>
              )}
              <PrefillForm initial={initial} editing={!!current} />
            </div>
          ) : list.length === 0 ? (
            <p className="text-sm text-neutral-700">None yet.</p>
          ) : (
            <div className="flex flex-col">
              {list.map((p) => (
                <Link
                  key={p.email}
                  href={`/agent/prefill?email=${encodeURIComponent(p.email)}`}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-divider py-3 text-ink no-underline hover:bg-surface"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{p.name || p.email}</span>
                      {p.licenseVerified && (
                        <span className="tag tag-accent font-semibold">
                          <BadgeCheck size={12} />
                          License checked
                        </span>
                      )}
                      {p.usedAt && <span className="tag tag-neutral">Signed up</span>}
                    </div>
                    <div className="text-[13px] text-neutral-700">
                      {p.email}
                      {p.brokerage ? ` · ${p.brokerage}` : ""}
                      {p.licenseNumber ? ` · ${p.licenseNumber}` : ""}
                    </div>
                  </div>
                  <span className="text-[13px] font-semibold text-accent">Edit</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

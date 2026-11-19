import { ExternalLink } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { AgentHeader } from "@/components/agent/AgentHeader";
import { StateLicenseImport } from "@/components/agent/StateLicenseImport";
import { AppShell } from "@/components/ui/Header";
import { getCurrentAgent } from "@/lib/data";
import { isAdmin } from "@/lib/rates";
import { lastImport } from "@/lib/state-licenses";
import { agentsEnabled } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "State license list · BuyDown Indy" };

/** Indiana PLA bulk licensee download (paid per 1,000 records). */
const PLA_BULK = "https://secure.in.gov/apps/pla/license/bulk/";
const DAY = 86_400_000;

// Admin: the monthly import of Indiana's real estate licensee list, used to verify agents automatically.
export default async function StateLicensesPage() {
  if (!agentsEnabled) redirect("/agent");
  const me = await getCurrentAgent();
  if (!me) redirect("/agent/login?next=/agent/licenses");
  if (!isAdmin(me.email)) notFound();
  const last = await lastImport();
  const age = last && last !== "not-set-up" && last.finishedAt ? Math.floor((Date.now() - new Date(last.finishedAt).getTime()) / DAY) : null;

  return (
    <AppShell header={<AgentHeader admin />}>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex max-w-[760px] flex-col gap-5 p-4 lg:p-8">
          <div>
            <h1 className="text-[26px] lg:text-[32px]">State license list</h1>
            <p className="m-0 text-sm text-neutral-700">
              New agents are verified the moment they sign up when their license number, name, active status and expiration match
              this list. Anything less clear goes to your bell for a manual check. Refresh it monthly.
            </p>
          </div>

          <div className="rounded-[14px] border border-divider p-4 text-sm">
            {last === "not-set-up" ? (
              <>Not set up yet. Run <code>supabase/migrations/0017_state_licenses.sql</code> in the Supabase SQL editor.</>
            ) : last ? (
              <>
                <strong>Last import:</strong> {new Date(last.finishedAt!).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} ·{" "}
                {last.rows.toLocaleString("en-US")} licenses{last.fileName ? ` · ${last.fileName}` : ""}
                {age !== null && age > 35 && <div className="mt-1 font-semibold text-warn-text">It&apos;s been {age} days. Time for this month&apos;s list.</div>}
              </>
            ) : (
              <>No list imported yet, so every new agent goes to your bell.</>
            )}
          </div>

          <section className="flex flex-col gap-2 text-sm">
            <h2 className="text-lg">Each month</h2>
            <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-5">
              <li>
                Download Indiana&apos;s licensee list from the{" "}
                <a href={PLA_BULK} target="_blank" rel="noopener noreferrer">
                  Professional Licensing Agency <ExternalLink size={12} className="inline" />
                </a>
                : Real Estate Commission, brokers, all statuses. It comes as an Excel file.
              </li>
              <li>Open it in Excel and choose File → Save As → CSV.</li>
              <li>Upload the CSV below. The new list replaces the old one.</li>
            </ol>
          </section>

          {last !== "not-set-up" && <StateLicenseImport />}
        </div>
      </div>
    </AppShell>
  );
}

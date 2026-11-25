import { NextResponse } from "next/server";
import { LENDER } from "@/content/lender";
import { esc, notifyTo, sendEmail, siteUrl } from "@/lib/email";
import { listEmails } from "@/lib/email-log";
import { parsePmms } from "@/lib/pmms";
import { isRateStale, longDate, rateAgeDays, STALE_RATE_DAYS } from "@/lib/rate-info";
import { getRateInfo } from "@/lib/rates";
import { createAdminClient } from "@/lib/supabase/server";

// Daily (vercel.json): pull Freddie Mac's latest PMMS 30-year average, save it as a RateSnapshot, then check the
// rate the site actually shows. If it's more than STALE_RATE_DAYS old, email Dillon (once a day at most).
// Vercel sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set; without it, only Vercel's cron runner.
const PMMS_CSV = "https://www.freddiemac.com/pmms/docs/PMMS_history.csv";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) return req.headers.get("authorization") === `Bearer ${secret}`;
  return (req.headers.get("user-agent") ?? "").startsWith("vercel-cron/");
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const problems: string[] = [];
  let latest: { weekOf: string; rate: number } | null = null;
  try {
    const r = await fetch(PMMS_CSV, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!r.ok) problems.push(`Freddie Mac's rate file returned ${r.status}.`);
    else latest = parsePmms(await r.text());
    if (r.ok && !latest) problems.push("Freddie Mac's rate file couldn't be read (its format may have changed).");
  } catch (e) {
    problems.push(`Couldn't reach Freddie Mac's rate file: ${e instanceof Error ? e.message : String(e)}`);
  }

  const admin = createAdminClient();
  if (latest && admin) {
    const { error } = await admin
      .from("rate_snapshots")
      .upsert({ week_of: latest.weekOf, rate_30yr: latest.rate, source: "Freddie Mac PMMS" });
    if (error) problems.push(`Saving the rate failed: ${error.message}`);
  }

  // What the site shows right now (a daily rate you entered, the saved snapshot, or the live file).
  const info = await getRateInfo();
  const stale = isRateStale(info);
  if (stale) await alert(info.rates.Conventional, info.date, problems);
  return NextResponse.json({ ok: !stale, latest, shown: { date: info.date, rate: info.rates.Conventional, source: info.source }, stale, problems });
}

async function alert(rate: number, date: string, problems: string[]) {
  // One alert a day is enough.
  const recent = (await listEmails(50).catch(() => null)) ?? [];
  if (recent.some((e) => e.kind === "rate-stale" && Date.now() - new Date(e.createdAt).getTime() < 20 * 3_600_000)) return;
  const to = notifyTo().length ? notifyTo() : [LENDER.email];
  const days = rateAgeDays({ source: "pmms", date, rates: { Conventional: rate, FHA: rate, VA: rate } });
  const rates = `${siteUrl()}/agent/rates`;
  const why = problems.length ? problems : ["Freddie Mac's file was read, but its newest rate is old."];
  await sendEmail("rate-stale", {
    to,
    subject: `BuyDown Indy's rate is ${days} days old`,
    text: [
      `Every listing, flyer and email on BuyDown Indy is using ${rate}% from ${longDate(date)}, ${days} days old (the limit is ${STALE_RATE_DAYS}).`,
      "",
      ...why,
      "",
      `Enter today's rate to fix it right away: ${rates}`,
      "Then ask Claude to fix the Freddie Mac feed.",
    ].join("\n"),
    html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#1c2530">
<p><strong>Every listing, flyer and email on BuyDown Indy is using ${rate}% from ${esc(longDate(date))}</strong>, ${days} days old (the limit is ${STALE_RATE_DAYS}).</p>
<ul>${why.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
<p><a href="${rates}">Enter today's rate</a> to fix it right away, then ask Claude to fix the Freddie Mac feed.</p></div>`,
  });
}

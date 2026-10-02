import { NextResponse } from "next/server";
import { getCurrentAgent } from "@/lib/data";
import { isSuperAdmin, LEAD_STATUSES, listLeads } from "@/lib/leads";

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Super admin: all leads as CSV, one column per quiz question.
export async function GET() {
  const me = await getCurrentAgent();
  if (!me || !isSuperAdmin(me.email)) return NextResponse.json({ error: "Super admin only." }, { status: 403 });
  const leads = await listLeads();
  const questions = [...new Set(leads.flatMap((l) => l.answers.map((a) => a.question)))];
  const label = (s: string) => LEAD_STATUSES.find((x) => x.value === s)?.label ?? s;
  const head = ["Received", "Name", "Email", "Phone", "Status", "Listing", "Topic", "Message", "Notes", ...questions, "Consent at"];
  const rows = leads.map((l) => [
    l.createdAt,
    l.name,
    l.email,
    l.phone,
    label(l.status),
    l.listingLabel,
    l.topic === "points" ? "Permanent buydown (points)" : "General",
    l.message,
    l.notes,
    ...questions.map((q) => l.answers.find((a) => a.question === q)?.answer ?? ""),
    l.consentAt,
  ]);
  const csv = [head, ...rows].map((r) => r.map(cell).join(",")).join("\n");
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="buydown-indy-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

import { NextResponse } from "next/server";
import { getAllAgents, getCurrentAgent } from "@/lib/data";
import { isAdmin } from "@/lib/rates";

const cell = (v: unknown) => {
  const s = v == null ? "" : Array.isArray(v) ? v.join("; ") : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Admin: every agent profile as a CSV (for your CRM).
export async function GET() {
  const me = await getCurrentAgent();
  if (!me || !isAdmin(me.email)) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const agents = await getAllAgents();
  const cols: [string, (a: (typeof agents)[number]) => unknown][] = [
    ["Name", (a) => a.name],
    ["Email", (a) => a.email],
    ["Mobile", (a) => a.phone],
    ["Office phone", (a) => a.officePhone],
    ["Brokerage", (a) => a.brokerage],
    ["Team", (a) => a.teamName],
    ["Office address", (a) => a.officeAddress],
    ["License #", (a) => a.licenseNumber],
    ["MLS ID", (a) => a.mlsId],
    ["Licensed since", (a) => a.licensedSince],
    ["Counties", (a) => a.counties],
    ["Website", (a) => a.website],
    ["Instagram", (a) => a.instagram],
    ["Facebook", (a) => a.facebook],
    ["LinkedIn", (a) => a.linkedin],
    ["Verification", (a) => a.verificationStatus],
    ["Verified at", (a) => a.verifiedAt],
    ["Joined", (a) => a.createdAt],
    ["Photo", (a) => a.photoUrl],
    ["Bio", (a) => a.bio],
  ];
  const csv = [cols.map(([h]) => h).join(","), ...agents.map((a) => cols.map(([, f]) => cell(f(a))).join(","))].join("\n");
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="buydown-indy-agents-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAgent } from "@/lib/data";
import { isAdmin } from "@/lib/rates";
import { addRows, finishImport, startImport } from "@/lib/state-licenses";

export const maxDuration = 60;

const Row = z.object({
  license_number: z.string().min(1).max(40),
  first_name: z.string().max(120).nullable(),
  last_name: z.string().max(120).nullable(),
  full_name: z.string().max(240).nullable(),
  license_type: z.string().max(120).nullable(),
  status: z.string().max(80).nullable(),
  expires_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  city: z.string().max(120).nullable(),
});

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), fileName: z.string().max(200) }),
  z.object({ action: z.literal("rows"), batch: z.string().max(80), rows: z.array(Row).max(2000) }),
  z.object({ action: z.literal("finish"), batch: z.string().max(80) }),
]);

// Admin: import the state's licensee list in chunks (the browser reads the CSV and sends ~1,000 rows at a time).
// start → rows (repeated) → finish. Finish removes licenses the new file no longer has and verifies pending agents.
export async function POST(req: Request) {
  const me = await getCurrentAgent();
  if (!me || !isAdmin(me.email)) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Bad request." }, { status: 400 });
  const b = parsed.data;
  if (b.action === "start") {
    const r = await startImport(b.fileName);
    return "error" in r ? NextResponse.json({ error: r.error }, { status: 400 }) : NextResponse.json(r);
  }
  if (b.action === "rows") {
    const err = await addRows(b.batch, b.rows);
    return err ? NextResponse.json({ error: err }, { status: 400 }) : NextResponse.json({ ok: true });
  }
  const r = await finishImport(b.batch);
  return "error" in r ? NextResponse.json({ error: r.error }, { status: 400 }) : NextResponse.json(r);
}

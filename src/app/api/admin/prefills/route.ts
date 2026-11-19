import { NextResponse } from "next/server";
import { getCurrentAgent } from "@/lib/data";
import { deletePrefill, PrefillInput, savePrefill } from "@/lib/prefill";
import { isAdmin } from "@/lib/rates";

async function admin() {
  const me = await getCurrentAgent();
  return me && isAdmin(me.email) ? me : null;
}

// Admin: create or update an agent profile prepared ahead of time (keyed by the agent's email).
export async function POST(req: Request) {
  if (!(await admin())) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const parsed = PrefillInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the details." }, { status: 400 });
  const err = await savePrefill(parsed.data);
  return err ? NextResponse.json({ error: err }, { status: 400 }) : NextResponse.json({ ok: true });
}

// Admin: remove a prepared profile. DELETE /api/admin/prefills?email=...
export async function DELETE(req: Request) {
  if (!(await admin())) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const email = new URL(req.url).searchParams.get("email");
  if (!email) return NextResponse.json({ error: "Missing email." }, { status: 400 });
  const err = await deletePrefill(email);
  return err ? NextResponse.json({ error: err }, { status: 400 }) : NextResponse.json({ ok: true });
}

import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { DEMO_AGENT } from "./demo-store";
import { demoMode } from "./supabase/env";
import { createClient } from "./supabase/server";

// Agent → client invites. Supabase table `client_invites` (migration 0002); .data/invites.json in local demo mode.

export const INVITE_COOKIE = "bd_invite";

export interface Invite {
  code: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  openCount: number;
  lastOpenedAt: string | null;
  createdAt: string;
}

/** What a client sees: their first name and their agent. */
export interface InviteGreeting {
  clientFirst: string;
  agentName: string;
  brokerage: string;
  agentPhone: string | null;
  agentEmail: string | null;
}

const FILE = path.join(process.cwd(), ".data", "invites.json");
type DemoInvite = Invite & { agentId: string };
const readDemo = async (): Promise<DemoInvite[]> => {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return [];
  }
};
const writeDemo = async (all: DemoInvite[]) => {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(all, null, 2));
};

// 10 chars from an unambiguous alphabet: hard to guess, easy to read aloud.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export const newCode = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
};
export const isCode = (c: string) => /^[a-z0-9]{10}$/.test(c);

export async function createInvite(
  agentId: string,
  d: { clientName: string; clientEmail?: string | null; clientPhone?: string | null },
): Promise<{ code: string } | { error: string }> {
  const code = newCode();
  if (demoMode) {
    const all = await readDemo();
    all.unshift({
      code,
      agentId,
      clientName: d.clientName,
      clientEmail: d.clientEmail ?? null,
      clientPhone: d.clientPhone ?? null,
      openCount: 0,
      lastOpenedAt: null,
      createdAt: new Date().toISOString(),
    });
    await writeDemo(all);
    return { code };
  }
  const sb = await createClient();
  const { error } = await sb.from("client_invites").insert({
    code,
    agent_id: agentId,
    client_name: d.clientName,
    client_email: d.clientEmail || null,
    client_phone: d.clientPhone || null,
  });
  return error ? { error: error.message } : { code };
}

export async function listInvites(agentId: string): Promise<Invite[]> {
  if (demoMode) return (await readDemo()).filter((i) => i.agentId === agentId);
  const sb = await createClient();
  const { data, error } = await sb
    .from("client_invites")
    .select("code, client_name, client_email, client_phone, open_count, last_opened_at, created_at")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("listInvites", error.message);
    return [];
  }
  return data.map((r) => ({
    code: r.code,
    clientName: r.client_name,
    clientEmail: r.client_email,
    clientPhone: r.client_phone,
    openCount: r.open_count,
    lastOpenedAt: r.last_opened_at,
    createdAt: r.created_at,
  }));
}

/** Look up an invite for its greeting. `record` counts it as an open (only on the /i/<code> link). */
export async function openInvite(code: string, record: boolean): Promise<InviteGreeting | null> {
  if (!isCode(code)) return null;
  if (demoMode) {
    const all = await readDemo();
    const inv = all.find((i) => i.code === code);
    if (!inv) return null;
    if (record) {
      inv.openCount += 1;
      inv.lastOpenedAt = new Date().toISOString();
      await writeDemo(all);
    }
    return {
      clientFirst: inv.clientName.split(" ")[0],
      agentName: DEMO_AGENT.name,
      brokerage: DEMO_AGENT.brokerage,
      agentPhone: DEMO_AGENT.phone,
      agentEmail: DEMO_AGENT.email,
    };
  }
  const sb = await createClient();
  const { data, error } = await sb.rpc("open_invite", { p_code: code, p_record: record });
  if (error || !data?.length) {
    if (error) console.error("open_invite", error.message);
    return null;
  }
  const r = data[0] as { client_first: string; agent_name: string; brokerage: string; agent_phone: string; agent_email: string };
  return { clientFirst: r.client_first, agentName: r.agent_name, brokerage: r.brokerage, agentPhone: r.agent_phone, agentEmail: r.agent_email };
}

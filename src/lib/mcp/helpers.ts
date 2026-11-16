import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { LISTING_DAYS } from "@/lib/types";
import { ToolError, type Tool } from "./protocol";

// Shared helpers for the MCP connector's tools.

export function db() {
  const sb = createAdminClient();
  if (!sb) throw new ToolError("The connector needs SUPABASE_SERVICE_ROLE_KEY set in Vercel.");
  return sb;
}

export const DAY = 86_400_000;
export const expiry = () => new Date(Date.now() + LISTING_DAYS * DAY).toISOString();

export function tool<S extends z.ZodObject>(
  name: string,
  description: string,
  schema: S,
  annotations: Tool["annotations"],
  run: (args: z.infer<S>) => Promise<unknown>,
): Tool {
  const inputSchema = z.toJSONSchema(schema, { io: "input" }) as Record<string, unknown>;
  delete inputSchema.$schema;
  return {
    name,
    description,
    inputSchema,
    annotations,
    run: async (raw) => {
      const parsed = schema.safeParse(raw);
      if (!parsed.success) throw new ToolError(`Invalid arguments: ${parsed.error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ")}`);
      return run(parsed.data);
    },
  };
}

export const READ = { readOnlyHint: true };
export const WRITE = { readOnlyHint: false, destructiveHint: false };
export const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true };

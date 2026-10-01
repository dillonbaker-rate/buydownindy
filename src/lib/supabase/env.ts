export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** False in local demo mode: the app then serves the sample listings and agent screens explain setup. */
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Local demo mode: no Supabase and not a production build. Agent screens then work against a demo
 * agent with listings and photos saved under .data/ (see src/lib/demo-store.ts). Never on the live site.
 */
export const demoMode =
  !supabaseConfigured && (process.env.NODE_ENV !== "production" || process.env.LOCAL_PROD_DEMO === "1");

/** Agent features (sign-in, posting, dashboard) are available. */
export const agentsEnabled = supabaseConfigured || demoMode;

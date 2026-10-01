export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** False in local demo mode: the app then serves the sample listings and agent screens explain setup. */
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

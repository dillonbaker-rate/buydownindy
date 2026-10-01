"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Some Supabase sign-in links return the session (or an error) after "#" in the URL, which the server
 * never sees. Pick it up, finish signing in, and send the agent to My listings.
 */
export function AuthHashHandler() {
  useEffect(() => {
    const h = new URLSearchParams(window.location.hash.slice(1));
    if (h.get("error_code") || h.get("error")) {
      window.location.replace("/agent/login?error=link");
      return;
    }
    const access_token = h.get("access_token");
    const refresh_token = h.get("refresh_token");
    if (!access_token || !refresh_token) return;
    createClient()
      .auth.setSession({ access_token, refresh_token })
      .then(({ error }) => window.location.replace(error ? "/agent/login?error=link" : "/agent"));
  }, []);
  return null;
}

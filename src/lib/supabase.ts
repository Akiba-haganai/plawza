import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
const supabaseUrl: string | undefined = metaEnv?.VITE_SUPABASE_URL;
const supabaseAnonKey: string | undefined = metaEnv?.VITE_SUPABASE_ANON_KEY;

/** Canonical production web URL on Cloudflare Workers */
export const PRODUCTION_SITE_URL = "https://plawza.akiba-hara.workers.dev";

/**
 * Builds an absolute redirect URL for Supabase Auth callbacks (Email confirmation,
 * Password reset, and Google OAuth). Uses VITE_SITE_URL if explicitly set, or the
 * current browser origin (e.g. https://plawza.akiba-hara.workers.dev in production,
 * http://localhost:5173 in local dev).
 */
export function getAuthRedirectUrl(path = "/dashboard"): string {
  const cleanPath = path && path.startsWith("/") ? path : "/dashboard";
  if (typeof window === "undefined") {
    return `${PRODUCTION_SITE_URL}${cleanPath}`;
  }
  const configuredSiteUrl = metaEnv?.VITE_SITE_URL;
  const origin =
    configuredSiteUrl && /^https?:\/\//.test(configuredSiteUrl)
      ? configuredSiteUrl.replace(/\/+$/, "")
      : window.location.origin;
  return `${origin}${cleanPath}`;
}

/** True only when a real URL and key were provided at build/dev-server start. */
export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    /^https?:\/\//.test(supabaseUrl) &&
    !supabaseUrl.includes("your-project-ref") &&
    !supabaseAnonKey.startsWith("your-")
);

/**
 * Single Supabase client for the whole app.
 *
 * When the environment is not configured the app renders <ConfigMissing /> instead
 * of any page (see main.tsx), so this client is never used for network calls. The
 * inert fallback values only exist so importing this module cannot throw.
 */
export const supabase = createClient<Database>(
  isSupabaseConfigured && supabaseUrl ? supabaseUrl : "http://localhost.invalid",
  isSupabaseConfigured && supabaseAnonKey ? supabaseAnonKey : "unconfigured",
  {
    auth: {
      persistSession: isSupabaseConfigured,
      autoRefreshToken: isSupabaseConfigured,
      detectSessionInUrl: isSupabaseConfigured
    }
  }
);

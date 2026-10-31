import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl: string | undefined = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

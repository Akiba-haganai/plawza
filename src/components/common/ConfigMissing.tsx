import React from "react";
import { PlugZap } from "lucide-react";

/**
 * Shown instead of the app when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing.
 * Prevents the app from firing requests at a non-existent backend.
 */
export const ConfigMissing: React.FC = () => (
  <main className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
    <div className="max-w-lg w-full rounded-2xl border border-border bg-surface p-6 space-y-4">
      <div className="flex items-center gap-3">
        <PlugZap className="w-6 h-6 text-danger-600" aria-hidden="true" />
        <h1 className="text-lg font-black">Backend not configured</h1>
      </div>
      <p className="text-sm text-muted">
        This build has no Supabase connection details, so the app cannot load data or sign anyone in.
      </p>
      <ol className="list-decimal pl-5 space-y-1.5 text-sm">
        <li>
          Copy <code className="font-mono">.env.example</code> to <code className="font-mono">.env</code> in the
          project root.
        </li>
        <li>
          Set <code className="font-mono">VITE_SUPABASE_URL</code> and{" "}
          <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> (Project Settings, API).
        </li>
        <li>
          <strong>Restart</strong> the dev server (Vite reads <code className="font-mono">.env</code> only at start).
        </li>
      </ol>
      <p className="text-xs text-muted">
        On Cloudflare Pages, set the same two variables in the project environment variables and redeploy.
      </p>
    </div>
  </main>
);

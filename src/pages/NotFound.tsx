import React from "react";
import { Link } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 flex items-center justify-center font-black text-2xl mb-4 border border-brand-200 dark:border-brand-900">
        404
      </div>
      <h1 className="text-2xl font-black text-foreground mb-2">Page Not Found</h1>
      <p className="text-sm text-muted max-w-sm mb-6">
        The listing, shop, or page you were looking for doesn't exist or has been archived.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-border bg-surface hover:bg-slate-100 text-sm font-semibold transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-brand-700 hover:bg-brand-900 text-white text-sm font-semibold transition-colors min-h-[44px]"
        >
          <Home className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
};

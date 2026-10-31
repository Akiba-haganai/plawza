import React from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, X } from "lucide-react";

export const PwaReloadPrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        // Poll for SW updates every hour
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.warn("Service worker registration error:", error);
    }
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-50 max-w-sm bg-brand-950 text-white p-4 rounded-xl shadow-2xl border border-brand-700 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex-1">
        <h4 className="text-sm font-bold text-white">Update available</h4>
        <p className="text-xs text-slate-300">A new version of Plawza is ready.</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-xs min-h-[44px]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reload
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="p-3.5 text-slate-400 hover:text-white rounded-md"
          aria-label="Dismiss update notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

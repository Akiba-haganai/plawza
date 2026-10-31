import React from "react";
import { ShieldAlert } from "lucide-react";

interface SafetyNoticeProps {
  className?: string;
  compact?: boolean;
}

export const SafetyNotice: React.FC<SafetyNoticeProps> = ({ className = "", compact = false }) => {
  if (compact) {
    return (
      <div
        className={`flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 ${className}`}
        role="note"
      >
        <ShieldAlert className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
        <p>
          <strong className="font-semibold">Safety First:</strong> Never send deposit or rent via Mobile Money before physically inspecting the property and verifying the landlord or caretaker in person.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-amber-300 dark:border-amber-900/70 bg-amber-50/80 dark:bg-amber-950/30 p-4 text-amber-950 dark:text-amber-200 ${className}`}
      role="region"
      aria-label="Plawza Safety Notice"
    >
      <div className="flex items-center gap-2 mb-2 text-amber-800 dark:text-amber-400 font-bold text-sm">
        <ShieldAlert className="w-5 h-5 text-accent-700 dark:text-accent-500" />
        <span>Important Safety Advice for Renters</span>
      </div>
      <ul className="text-xs space-y-1.5 list-disc list-inside text-slate-700 dark:text-slate-300">
        <li>
          <strong>Inspect in Person:</strong> Always visit the boarding house or flat during daylight hours before committing.
        </li>
        <li>
          <strong>No Upfront Payments:</strong> Do not send booking fees or advance rent until an agreement is reached and identity is verified.
        </li>
        <li>
          <strong>No Guarantee:</strong> Plawza verifies listings where possible but does not guarantee tenancy legitimacy. Always take personal precautions.
        </li>
        <li>
          <strong>Report Suspicious Activity:</strong> If a contact asks for airtime or money before viewing, use the <em>Report</em> button immediately.
        </li>
      </ul>
    </div>
  );
};

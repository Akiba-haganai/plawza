import React from "react";
import { Inbox, type LucideIcon } from "lucide-react";

interface EmptyProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: LucideIcon;
  className?: string;
}

export const Empty: React.FC<EmptyProps> = ({
  title = "No listings found",
  description = "There are currently no items matching your criteria. Try adjusting your search filters or check back soon.",
  actionLabel,
  onAction,
  icon: Icon = Inbox,
  className = ""
}) => {
  return (
    <div
      className={`rounded-2xl border border-dashed border-border bg-surface p-8 text-center flex flex-col items-center justify-center my-6 ${className}`}
    >
      <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-muted mb-4">
        <Icon className="w-7 h-7 opacity-75" />
      </div>
      <h3 className="text-base font-bold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted max-w-sm mb-5">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-brand-700 hover:bg-brand-900 text-white rounded-lg text-sm font-semibold transition-colors min-h-[44px]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

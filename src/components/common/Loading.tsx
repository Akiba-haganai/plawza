import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingProps {
  message?: string;
  className?: string;
  fullScreen?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({
  message = "Loading...",
  className = "",
  fullScreen = false
}) => {
  const content = (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`} role="status">
      <Loader2 className="w-8 h-8 text-brand-700 animate-spin mb-3" />
      <p className="text-sm text-muted font-medium">{message}</p>
      <span className="sr-only">Loading content, please wait...</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};

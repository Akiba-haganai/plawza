import React, { useState } from "react";
import { Image as ImageIcon, Eye } from "lucide-react";
import { useDataModeStore } from "@/stores/dataMode";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  aspectRatio?: string; // e.g. "aspect-video", "aspect-square", "aspect-4/3"
  containerClassName?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  aspectRatio = "aspect-video",
  containerClassName = "",
  className = "",
  ...props
}) => {
  const isLowData = useDataModeStore((state) => state.isLowData);
  const [userRequested, setUserRequested] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // If low data is on and user has not explicitly clicked "Show photo", show data-saving placeholder
  if (isLowData && !userRequested) {
    return (
      <div
        className={`w-full ${aspectRatio} bg-slate-100 dark:bg-slate-800 border border-border flex flex-col items-center justify-center p-4 text-center select-none ${containerClassName}`}
      >
        <ImageIcon className="w-8 h-8 text-muted mb-2 opacity-60" />
        <p className="text-xs text-muted mb-3 font-medium">Low-data mode: Photo hidden</p>
        <button
          type="button"
          onClick={() => setUserRequested(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-700 hover:bg-brand-900 text-white rounded-md text-xs font-semibold shadow-xs min-h-[44px]"
          aria-label={`Load image for ${alt}`}
        >
          <Eye className="w-3.5 h-3.5" />
          Load photo
        </button>
      </div>
    );
  }

  if (error || !src) {
    return (
      <div
        className={`w-full ${aspectRatio} bg-slate-100 dark:bg-slate-800 border border-border flex flex-col items-center justify-center p-4 text-muted select-none ${containerClassName}`}
      >
        <ImageIcon className="w-8 h-8 opacity-40 mb-1" />
        <span className="text-xs text-muted">Image unavailable</span>
      </div>
    );
  }

  return (
    <div className={`relative w-full overflow-hidden bg-slate-100 dark:bg-slate-800 ${aspectRatio} ${containerClassName}`}>
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
          <ImageIcon className="w-6 h-6 text-muted opacity-30" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"} ${className}`}
        {...props}
      />
    </div>
  );
};

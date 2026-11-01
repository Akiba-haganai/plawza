import React from "react";

export interface BrandLogoProps {
  /** Display variant: complete logo, standalone symbol, or wordmark only */
  variant?: "full" | "symbol" | "wordmark";
  /** Layout direction when variant="full" */
  layout?: "horizontal" | "stacked";
  /** Color theme */
  theme?: "color" | "white" | "dark" | "mono";
  /** Preset size */
  size?: "sm" | "md" | "lg" | "xl";
  /** Optional tagline "Discover • Connect • Belong" */
  showTagline?: boolean;
  /** Custom CSS classes for container */
  className?: string;
  /** Accessible label */
  alt?: string;
}

const compoundCourtyardPath =
  "M 200 112 C 240 112 268 94 294 114 C 318 134 300 164 292 200 C 300 236 318 266 294 286 C 268 306 240 288 200 288 C 160 288 132 306 106 286 C 82 266 100 236 108 200 C 100 164 82 134 106 114 C 132 94 160 112 200 112 Z " +
  "M 200 156 C 216 156 236 142 246 156 C 256 170 244 186 244 200 C 244 214 256 230 246 244 C 236 258 216 244 200 244 C 184 244 164 258 154 244 C 144 230 156 214 156 200 C 156 186 144 170 154 156 C 164 142 184 156 200 156 Z";

export const BrandSymbol: React.FC<{
  sizePx?: number;
  theme?: "color" | "white" | "dark" | "mono";
  className?: string;
}> = ({ sizePx = 40, theme = "color", className = "" }) => {
  const isColor = theme === "color";
  const isWhite = theme === "white";
  const isDark = theme === "dark";

  const ribbonFill = isColor
    ? "url(#brandRibbonGrad)"
    : isWhite
      ? "#FFFFFF"
      : isDark
        ? "#0B2D6B"
        : "currentColor";

  const topNodeFill = isColor ? "#1D4ED8" : isWhite ? "#FFFFFF" : isDark ? "#0B2D6B" : "currentColor";
  const bottomNodeFill = isColor ? "#0B2D6B" : isWhite ? "#FFFFFF" : isDark ? "#0B2D6B" : "currentColor";
  const sideNodeFill = isColor ? "#1D4ED8" : isWhite ? "#FFFFFF" : isDark ? "#0B2D6B" : "currentColor";

  return (
    <svg
      viewBox="0 0 400 400"
      width={sizePx}
      height={sizePx}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform ${className}`}
      aria-hidden="true"
    >
      {isColor && (
        <defs>
          <linearGradient id="brandRibbonGrad" x1="80" y1="100" x2="320" y2="300" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1D4ED8" />
            <stop offset="50%" stopColor="#60B5FF" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id="brandRibbonFold" x1="120" y1="280" x2="300" y2="120" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0B2D6B" />
            <stop offset="50%" stopColor="#1D4ED8" />
            <stop offset="100%" stopColor="#60B5FF" />
          </linearGradient>
        </defs>
      )}

      {/* Plaza Courtyard Ribbon */}
      <path d={compoundCourtyardPath} fill={ribbonFill} fillRule="evenodd" />

      {/* Organic lower fold shadow in color mode */}
      {isColor && (
        <path
          d="M 106 286 C 132 306 160 288 200 288 C 240 288 268 306 294 286 C 318 266 300 236 292 200 C 274 216 246 226 200 226 C 154 226 126 216 108 200 C 100 236 82 266 106 286 Z"
          fill="url(#brandRibbonFold)"
          opacity="0.9"
        />
      )}

      {/* 4 Community Nodes */}
      <circle cx="200" cy="54" r="26" fill={topNodeFill} />
      <circle cx="200" cy="346" r="26" fill={bottomNodeFill} />
      <circle cx="54" cy="200" r="26" fill={sideNodeFill} />
      <circle cx="346" cy="200" r="26" fill={sideNodeFill} />
    </svg>
  );
};

export const BrandWordmark: React.FC<{
  heightPx?: number;
  theme?: "color" | "white" | "dark" | "mono";
  className?: string;
}> = ({ heightPx = 28, theme = "color", className = "" }) => {
  const isWhite = theme === "white";
  const isDark = theme === "dark";
  const primaryFill = isWhite ? "#FFFFFF" : isDark ? "#0B2D6B" : "currentColor";
  const accentFill = isWhite ? "#93C5FD" : "#60B5FF";

  // Aspect ratio is 540 x 100
  const widthPx = Math.round((heightPx * 540) / 100);

  return (
    <svg
      viewBox="0 0 540 100"
      width={widthPx}
      height={heightPx}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <g fill={primaryFill}>
        {/* P */}
        <path d="M 20 12 L 54 12 C 72 12 84 22 84 38 C 84 54 72 64 54 64 L 38 64 L 38 88 C 38 91 35 94 31 94 L 27 94 C 23 94 20 91 20 88 Z M 38 48 L 52 48 C 60 48 66 44 66 38 C 66 32 60 28 52 28 L 38 28 Z" />

        {/* L */}
        <path d="M 104 18 C 104 14 107 12 111 12 L 115 12 C 119 12 122 14 122 18 L 122 78 L 158 78 C 162 78 165 81 165 85 L 165 87 C 165 91 162 94 158 94 L 111 94 C 107 94 104 91 104 87 Z" />

        {/* A (First) */}
        <path d="M 197 14 C 201 8 209 8 213 14 L 244 86 C 246 90 243 94 238 94 L 230 94 C 226 94 223 91 221 87 L 214 70 L 196 70 L 189 87 C 187 91 184 94 180 94 L 172 94 C 167 94 164 90 166 86 Z M 199 35 L 197 54 L 213 54 Z" />

        {/* W */}
        <path d="M 252 18 C 252 14 255 12 259 12 L 265 12 C 269 12 272 14 274 18 L 288 68 L 303 20 C 304 16 307 13 311 13 L 313 13 C 317 13 320 16 321 20 L 336 68 L 350 18 C 352 14 355 12 359 12 L 365 12 C 369 12 372 14 372 18 L 354 86 C 353 90 349 94 345 94 L 339 94 C 335 94 331 91 330 87 L 312 34 L 294 87 C 293 91 289 94 285 94 L 279 94 C 275 94 271 90 270 86 Z" />

        {/* Z */}
        <path d="M 390 18 C 390 14 393 12 397 12 L 436 12 C 440 12 443 15 443 19 L 443 23 C 443 26 441 29 439 31 L 409 78 L 438 78 C 442 78 445 81 445 85 L 445 87 C 445 91 442 94 438 94 L 395 94 C 391 94 388 91 388 87 L 388 83 C 388 80 390 77 392 75 L 422 28 L 397 28 C 393 28 390 25 390 21 Z" />

        {/* A (Second) */}
        <path d="M 477 14 C 481 8 489 8 493 14 L 524 86 C 526 90 523 94 518 94 L 510 94 C 506 94 503 91 501 87 L 494 70 L 476 70 L 469 87 C 467 91 464 94 460 94 L 452 94 C 447 94 444 90 446 86 Z M 479 35 L 477 54 L 493 54 Z" />
      </g>

      {/* Signature triangular cutouts in counters of both 'A's */}
      <path d="M 205 39 L 198 52 L 212 52 Z" fill={accentFill} />
      <path d="M 485 39 L 478 52 L 492 52 Z" fill={accentFill} />
    </svg>
  );
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = "full",
  layout = "horizontal",
  theme = "color",
  size = "md",
  showTagline = false,
  className = "",
  alt = "PLAWZA - Discover • Connect • Belong"
}) => {
  // Size metrics
  const symbolSize =
    size === "sm" ? 32 : size === "md" ? 40 : size === "lg" ? 56 : 76;
  const wordmarkHeight =
    size === "sm" ? 20 : size === "md" ? 26 : size === "lg" ? 36 : 48;

  if (variant === "symbol") {
    return (
      <div className={`inline-flex items-center justify-center ${className}`} role="img" aria-label={alt}>
        <BrandSymbol sizePx={symbolSize} theme={theme} />
      </div>
    );
  }

  if (variant === "wordmark") {
    return (
      <div className={`inline-flex items-center ${className}`} role="img" aria-label={alt}>
        <BrandWordmark heightPx={wordmarkHeight} theme={theme} />
      </div>
    );
  }

  // Full Lockup: Horizontal
  if (layout === "horizontal") {
    return (
      <div
        className={`inline-flex items-center gap-2.5 sm:gap-3 group select-none ${className}`}
        role="img"
        aria-label={alt}
      >
        <BrandSymbol sizePx={symbolSize} theme={theme} />
        <div className="flex flex-col justify-center">
          <BrandWordmark heightPx={wordmarkHeight} theme={theme} />
          {showTagline && (
            <span
              className={`text-[9px] sm:text-[10px] font-bold tracking-[0.2em] uppercase mt-0.5 ${
                theme === "white"
                  ? "text-brand-200"
                  : theme === "dark"
                    ? "text-brand-900"
                    : "text-brand-700 dark:text-brand-300"
              }`}
            >
              Discover • Connect • Belong
            </span>
          )}
        </div>
      </div>
    );
  }

  // Full Lockup: Stacked
  return (
    <div
      className={`inline-flex flex-col items-center justify-center text-center gap-2 group select-none ${className}`}
      role="img"
      aria-label={alt}
    >
      <BrandSymbol sizePx={symbolSize * 1.3} theme={theme} />
      <BrandWordmark heightPx={wordmarkHeight * 1.15} theme={theme} />
      {showTagline && (
        <span
          className={`text-[10px] sm:text-xs font-bold tracking-[0.22em] uppercase mt-1 ${
            theme === "white"
              ? "text-brand-200"
              : theme === "dark"
                ? "text-brand-900"
                : "text-brand-700 dark:text-brand-300"
          }`}
        >
          Discover • Connect • Belong
        </span>
      )}
    </div>
  );
};

import React, { useState } from "react";
import { getPublicStorageUrl } from "@/lib/storage";

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  showBorder?: boolean;
}

const SIZE_CLASSES: Record<"xs" | "sm" | "md" | "lg" | "xl" | "2xl", string> = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs font-semibold",
  md: "w-10 h-10 text-sm font-bold",
  lg: "w-12 h-12 text-base font-bold",
  xl: "w-16 h-16 text-xl font-black",
  "2xl": "w-24 h-24 text-3xl font-black"
};

/** Deterministic gradient based on string characters */
function getInitialsColor(name: string): string {
  const palettes: string[] = [
    "from-brand-600 to-brand-800 text-white",
    "from-blue-600 to-indigo-700 text-white",
    "from-emerald-600 to-teal-800 text-white",
    "from-amber-600 to-orange-700 text-white",
    "from-purple-600 to-pink-700 text-white",
    "from-cyan-600 to-blue-700 text-white"
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % palettes.length;
  return palettes[index] ?? palettes[0] ?? "from-brand-600 to-brand-800 text-white";
}

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const firstPart = parts[0];
  if (parts.length === 1 && firstPart) {
    return firstPart.slice(0, 2).toUpperCase();
  }
  const first = parts[0]?.[0] || "";
  const last = parts[parts.length - 1]?.[0] || "";
  return (first + last).toUpperCase() || "?";
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = "md",
  className = "",
  showBorder = false
}) => {
  const [imageError, setImageError] = useState(false);

  // Compute image URL: if src starts with http/https, use directly; otherwise resolve via storage bucket
  const resolvedUrl = src
    ? src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")
      ? src
      : getPublicStorageUrl("avatars", src)
    : null;

  const sizeClass = SIZE_CLASSES[size];
  const borderClass = showBorder ? "ring-2 ring-surface shadow-xs" : "";
  const initials = getInitials(name);
  const colorClass = getInitialsColor(name || "User");

  if (resolvedUrl && !imageError) {
    return (
      <img
        src={resolvedUrl}
        alt={name ? `${name}'s avatar` : "User avatar"}
        onError={() => setImageError(true)}
        className={`rounded-full object-cover shrink-0 select-none ${sizeClass} ${borderClass} ${className}`}
        loading="lazy"
      />
    );
  }

  return (
    <div
      aria-label={name || "User avatar"}
      className={`rounded-full bg-gradient-to-br flex items-center justify-center shrink-0 select-none tracking-tight ${colorClass} ${sizeClass} ${borderClass} ${className}`}
    >
      <span>{initials}</span>
    </div>
  );
};

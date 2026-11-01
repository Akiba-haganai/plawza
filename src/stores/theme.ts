import { create } from "zustand";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeState {
  theme: ThemeMode;
  isDark: boolean;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = "plawza_theme_mode";

function getSystemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return getSystemPrefersDark();
}

function applyThemeClass(isDark: boolean) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  // Update mobile browser address bar theme color
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute("content", isDark ? "#07111F" : "#0B2D6B");
  }
}

function getInitialMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (saved && ["light", "dark", "system"].includes(saved)) {
      return saved;
    }
  } catch {
    // localStorage unavailable
  }
  return "system";
}

const initialMode = getInitialMode();
const initialIsDark = resolveIsDark(initialMode);
applyThemeClass(initialIsDark);

export const useThemeStore = create<ThemeState>((set, get) => {
  // Listen to system changes when in system mode
  if (typeof window !== "undefined" && window.matchMedia) {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const currentMode = get().theme;
      if (currentMode === "system") {
        const nextIsDark = getSystemPrefersDark();
        applyThemeClass(nextIsDark);
        set({ isDark: nextIsDark });
      }
    };
    if (media.addEventListener) {
      media.addEventListener("change", handler);
    } else if ("addListener" in media) {
      // Older browsers
      (media as { addListener: (cb: () => void) => void }).addListener(handler);
    }
  }

  return {
    theme: initialMode,
    isDark: initialIsDark,

    setTheme: (mode: ThemeMode) => {
      const isDark = resolveIsDark(mode);
      applyThemeClass(isDark);
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        // storage disabled or quota exceeded
      }
      set({ theme: mode, isDark });
    },

    toggleTheme: () => {
      const current = get().isDark;
      const nextMode: ThemeMode = current ? "light" : "dark";
      const isDark = nextMode === "dark";
      applyThemeClass(isDark);
      try {
        localStorage.setItem(STORAGE_KEY, nextMode);
      } catch {
        // storage disabled
      }
      set({ theme: nextMode, isDark });
    }
  };
});

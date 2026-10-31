import { create } from "zustand";

interface NetworkInformation extends EventTarget {
  readonly saveData?: boolean;
}

interface DataModeState {
  isLowData: boolean;
  toggleLowData: () => void;
  setLowData: (value: boolean) => void;
}

const STORAGE_KEY = "plawza_low_data_mode";

function getInitialState(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      return saved === "true";
    }
    // Check hardware/browser save-data flag if available on mobile
    if (typeof navigator !== "undefined") {
      const conn = (navigator as unknown as { connection?: NetworkInformation }).connection;
      if (conn?.saveData) {
        return true;
      }
    }
  } catch {
    // LocalStorage or navigator not accessible
  }
  return false;
}

export const useDataModeStore = create<DataModeState>((set) => ({
  isLowData: getInitialState(),
  toggleLowData: () =>
    set((state) => {
      const next = !state.isLowData;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // storage quota exceeded or disabled
      }
      return { isLowData: next };
    }),
  setLowData: (value: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // storage quota exceeded or disabled
    }
    set({ isLowData: value });
  }
}));

export interface DayHours {
  open: string;  // e.g. "08:00"
  close: string; // e.g. "18:00"
  closed?: boolean;
}

export type WeeklyHours = Record<string, DayHours>;

const DAYS_MAP: Record<number, string> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday"
};

/**
 * Checks whether a business is currently open based on jsonb opening_hours.
 * Format expected:
 * {
 *   "monday": { "open": "08:00", "close": "18:00", "closed": false },
 *   ...
 * }
 */
export function isBusinessOpenNow(openingHours: unknown): { isOpen: boolean; label: string } | null {
  if (!openingHours || typeof openingHours !== "object") return null;

  try {
    const hours = openingHours as WeeklyHours;
    const now = new Date();
    // Central Africa Time (CAT) is UTC+2, standard in Zambia.
    // Use local client time
    const dayName = DAYS_MAP[now.getDay()];
    if (!dayName) return null;

    const todayHours = hours[dayName];
    if (!todayHours || todayHours.closed) {
      return { isOpen: false, label: "Closed today" };
    }

    if (!todayHours.open || !todayHours.close) {
      return null;
    }

    const [openH, openM] = todayHours.open.split(":").map(Number);
    const [closeH, closeM] = todayHours.close.split(":").map(Number);

    if (openH === undefined || openM === undefined || closeH === undefined || closeM === undefined) {
      return null;
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
      return { isOpen: true, label: `Open now (until ${todayHours.close})` };
    } else if (currentMinutes < openMinutes) {
      return { isOpen: false, label: `Opens today at ${todayHours.open}` };
    } else {
      return { isOpen: false, label: "Closed for today" };
    }
  } catch {
    return null;
  }
}

/**
 * Format relative stock days ago.
 */
export function formatStockUpdated(dateStr: string): string {
  try {
    const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "stock updated today";
    if (diffDays === 1) return "stock updated yesterday";
    return `stock updated ${diffDays}d ago`;
  } catch {
    return "stock recently updated";
  }
}

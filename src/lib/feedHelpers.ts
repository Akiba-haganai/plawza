export type FeedCategory = "all" | "stays" | "roommates" | "shops";

export interface FeedItem {
  id: string;
  type: "stay" | "roommate" | "shop";
  title: string;
  subtitle: string;
  campusId?: string | null;
  campusName?: string | null;
  area: string;
  createdAt: string;
  linkTo: string;
  badgeText: string;
  highlight: string;
  chips: string[];
}

/**
 * Friendly relative time formatter (e.g. "Just now", "25m ago", "3h ago", "Yesterday", "4d ago").
 */
export function formatTimeAgo(dateStr: string | null | undefined, nowMs: number = Date.now()): string {
  if (!dateStr) return "recently";
  const past = new Date(dateStr).getTime();
  if (isNaN(past)) return "recently";
  const diffSec = Math.max(0, Math.floor((nowMs - past) / 1000));
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

/**
 * Pure filter function for the Plaza Live Noticeboard stream.
 */
export function filterFeedItems(
  items: FeedItem[],
  campusId: string | "all",
  category: FeedCategory
): FeedItem[] {
  return items.filter((item) => {
    // 1. Category match
    if (category === "stays" && item.type !== "stay") return false;
    if (category === "roommates" && item.type !== "roommate") return false;
    if (category === "shops" && item.type !== "shop") return false;

    // 2. Campus match
    if (campusId !== "all") {
      // If item has a campusId specified, it must match
      if (item.campusId && item.campusId !== campusId) {
        return false;
      }
    }

    return true;
  });
}

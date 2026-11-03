import { describe, it, expect } from "vitest";
import { formatTimeAgo, filterFeedItems, FeedItem } from "./feedHelpers";

describe("formatTimeAgo", () => {
  const now = new Date("2026-11-03T12:00:00Z").getTime();

  it("handles null or invalid dates", () => {
    expect(formatTimeAgo(null, now)).toBe("recently");
    expect(formatTimeAgo(undefined, now)).toBe("recently");
    expect(formatTimeAgo("invalid-date", now)).toBe("recently");
  });

  it("formats seconds ago as Just now", () => {
    const date = new Date(now - 30 * 1000).toISOString();
    expect(formatTimeAgo(date, now)).toBe("Just now");
  });

  it("formats minutes ago", () => {
    const date = new Date(now - 15 * 60 * 1000).toISOString();
    expect(formatTimeAgo(date, now)).toBe("15m ago");
  });

  it("formats hours ago", () => {
    const date = new Date(now - 4 * 60 * 60 * 1000).toISOString();
    expect(formatTimeAgo(date, now)).toBe("4h ago");
  });

  it("formats yesterday", () => {
    const date = new Date(now - 28 * 60 * 60 * 1000).toISOString();
    expect(formatTimeAgo(date, now)).toBe("Yesterday");
  });

  it("formats days ago", () => {
    const date = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatTimeAgo(date, now)).toBe("3d ago");
  });
});

describe("filterFeedItems", () => {
  const items: FeedItem[] = [
    {
      id: "1",
      type: "stay",
      title: "Room 1",
      subtitle: "Sub 1",
      campusId: "campus-unza",
      area: "Marshlands",
      createdAt: "2026-11-03T10:00:00Z",
      linkTo: "/accommodation/1",
      badgeText: "Stay Alert",
      highlight: "K1,500/mo",
      chips: ["⚡ Solar"]
    },
    {
      id: "2",
      type: "roommate",
      title: "Chipo",
      subtitle: "Sub 2",
      campusId: "campus-cbu",
      area: "Riverside",
      createdAt: "2026-11-03T09:00:00Z",
      linkTo: "/roommates",
      badgeText: "Roommate Match",
      highlight: "Max K1,200",
      chips: ["Own room"]
    },
    {
      id: "3",
      type: "shop",
      title: "Campus Books",
      subtitle: "Sub 3",
      campusId: null,
      area: "Great East Rd",
      createdAt: "2026-11-03T08:00:00Z",
      linkTo: "/shops/campus-books",
      badgeText: "Campus Drop",
      highlight: "Stationery",
      chips: ["WhatsApp"]
    }
  ];

  it("returns all items when campus is all and category is all", () => {
    const result = filterFeedItems(items, "all", "all");
    expect(result.length).toBe(3);
  });

  it("filters by category", () => {
    const stays = filterFeedItems(items, "all", "stays");
    expect(stays.length).toBe(1);
    expect(stays[0]?.id).toBe("1");

    const roommates = filterFeedItems(items, "all", "roommates");
    expect(roommates.length).toBe(1);
    expect(roommates[0]?.id).toBe("2");

    const shops = filterFeedItems(items, "all", "shops");
    expect(shops.length).toBe(1);
    expect(shops[0]?.id).toBe("3");
  });

  it("filters by campus", () => {
    const unzaItems = filterFeedItems(items, "campus-unza", "all");
    expect(unzaItems.some((i) => i.id === "1")).toBe(true);
    expect(unzaItems.some((i) => i.id === "2")).toBe(false);
  });
});

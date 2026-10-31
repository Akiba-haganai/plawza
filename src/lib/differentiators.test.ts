import { describe, it, expect } from "vitest";
import {
  calculateDaysSince,
  isConfirmationOverdue,
  isStaleConfirmation,
  calculateRentSplit,
  buildWhatsAppShareUrl,
  calculateMedianResponseHours,
  formatResponseTime
} from "./differentiators";

describe("Differentiator calculations", () => {
  describe("calculateDaysSince", () => {
    it("returns 0 for null or future dates", () => {
      const now = new Date("2026-10-30T12:00:00Z").getTime();
      expect(calculateDaysSince(null, now)).toBe(0);
      expect(calculateDaysSince("2026-10-31T12:00:00Z", now)).toBe(0);
    });

    it("calculates elapsed days correctly", () => {
      const now = new Date("2026-10-30T12:00:00Z").getTime();
      expect(calculateDaysSince("2026-10-29T12:00:00Z", now)).toBe(1);
      expect(calculateDaysSince("2026-10-16T12:00:00Z", now)).toBe(14);
      expect(calculateDaysSince("2026-09-30T12:00:00Z", now)).toBe(30);
    });
  });

  describe("isConfirmationOverdue (14 days nudge)", () => {
    const now = new Date("2026-10-30T12:00:00Z").getTime();

    it("triggers when last_confirmed_at is >= 14 days ago", () => {
      expect(
        isConfirmationOverdue("2026-10-15T12:00:00Z", "2026-10-01T12:00:00Z", 14, now)
      ).toBe(true);
    });

    it("does not trigger when confirmed recently (< 14 days)", () => {
      expect(
        isConfirmationOverdue("2026-10-20T12:00:00Z", "2026-10-01T12:00:00Z", 14, now)
      ).toBe(false);
    });

    it("falls back to created_at when last_confirmed_at is null", () => {
      expect(
        isConfirmationOverdue(null, "2026-10-10T12:00:00Z", 14, now)
      ).toBe(true);
      expect(
        isConfirmationOverdue(null, "2026-10-25T12:00:00Z", 14, now)
      ).toBe(false);
    });
  });

  describe("isStaleConfirmation (30 days badge)", () => {
    const now = new Date("2026-10-30T12:00:00Z").getTime();

    it("flags as stale after 30 days", () => {
      expect(
        isStaleConfirmation("2026-09-25T12:00:00Z", "2026-09-01T12:00:00Z", 30, now)
      ).toBe(true);
    });

    it("does not flag if confirmed within 30 days", () => {
      expect(
        isStaleConfirmation("2026-10-10T12:00:00Z", "2026-09-01T12:00:00Z", 30, now)
      ).toBe(false);
    });
  });

  describe("calculateRentSplit", () => {
    it("splits rent evenly between roommates", () => {
      expect(calculateRentSplit(3000, 0, 2)).toBe(1500);
      expect(calculateRentSplit(3000, 0, 3)).toBe(1000);
    });

    it("includes optional utilities in calculation", () => {
      // 3000 rent + 600 utilities = 3600 / 3 = 1200
      expect(calculateRentSplit(3000, 600, 3)).toBe(1200);
    });

    it("handles 1 person (default/min)", () => {
      expect(calculateRentSplit(2500, 200, 1)).toBe(2700);
      expect(calculateRentSplit(2500, 200, 0)).toBe(2700);
    });

    it("rounds cleanly to nearest whole Kwacha", () => {
      // 1000 / 3 = 333.333 -> 333
      expect(calculateRentSplit(1000, 0, 3)).toBe(333);
      // 1000 / 6 = 166.666 -> 167
      expect(calculateRentSplit(1000, 0, 6)).toBe(167);
    });
  });

  describe("buildWhatsAppShareUrl", () => {
    it("generates a valid wa.me share link with encoded text", () => {
      const url = buildWhatsAppShareUrl(
        "Self-contained Room near campus",
        "ZMW 1,800/mo • Solar Backup • 5 mins from campus",
        "https://plawza.com/accommodation/123"
      );

      expect(url).toContain("https://wa.me/?text=");
      expect(url).toContain(encodeURIComponent("*Self-contained Room near campus*"));
      expect(url).toContain(encodeURIComponent("https://plawza.com/accommodation/123"));
    });

    it("handles minimal parameters without crashing", () => {
      const url = buildWhatsAppShareUrl("Shop Name", "", "https://plawza.com/shops/campus-tech");
      expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    });
  });

  describe("calculateMedianResponseHours & formatResponseTime", () => {
    it("returns null if enquiries list is empty or only new", () => {
      expect(calculateMedianResponseHours([])).toBeNull();
      expect(
        calculateMedianResponseHours([
          { created_at: "2026-10-30T10:00:00Z", status: "new" }
        ])
      ).toBeNull();
    });

    it("computes median for an odd number of responded enquiries", () => {
      const enquiries = [
        // 1 hour
        { created_at: "2026-10-30T10:00:00Z", updated_at: "2026-10-30T11:00:00Z", status: "contacted" },
        // 4 hours
        { created_at: "2026-10-30T10:00:00Z", updated_at: "2026-10-30T14:00:00Z", status: "closed" },
        // 2 hours
        { created_at: "2026-10-30T10:00:00Z", updated_at: "2026-10-30T12:00:00Z", status: "contacted" }
      ];

      // Sorted: [1, 2, 4] -> median is 2
      expect(calculateMedianResponseHours(enquiries)).toBe(2);
    });

    it("computes median for an even number of responded enquiries", () => {
      const enquiries = [
        // 2 hours
        { created_at: "2026-10-30T10:00:00Z", updated_at: "2026-10-30T12:00:00Z", status: "contacted" },
        // 4 hours
        { created_at: "2026-10-30T10:00:00Z", updated_at: "2026-10-30T14:00:00Z", status: "closed" }
      ];

      // Sorted: [2, 4] -> median is 3
      expect(calculateMedianResponseHours(enquiries)).toBe(3);
    });

    it("formats response times clearly", () => {
      expect(formatResponseTime(null)).toBe("No enquiries answered yet");
      expect(formatResponseTime(0.5)).toBe("Within 1 hour");
      expect(formatResponseTime(2.4)).toBe("2.4 hours");
      expect(formatResponseTime(24)).toBe("1 day");
      expect(formatResponseTime(36)).toBe("1.5 days");
    });
  });
});

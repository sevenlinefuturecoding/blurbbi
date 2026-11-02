import { describe, it, expect } from "vitest";
import {
  parseDateOnly,
  getDaysDifference,
  calculateActiveStreak,
  hasPostedToday,
  getNextStreak,
  formatStreakBadge,
  getStreakCelebration,
} from "@/lib/streaks";

describe("Daily Drop Streaks Logic", () => {
  const TODAY = new Date("2026-11-02T12:00:00Z");

  describe("parseDateOnly & getDaysDifference", () => {
    it("handles plain date strings YYYY-MM-DD", () => {
      expect(parseDateOnly("2026-11-02")).toBe("2026-11-02");
    });

    it("handles ISO strings", () => {
      expect(parseDateOnly("2026-11-02T15:30:00Z")).toBe("2026-11-02");
    });

    it("handles Date instances", () => {
      expect(parseDateOnly(new Date("2026-11-01T04:00:00Z"))).toBe("2026-11-01");
    });

    it("returns null on null or invalid inputs", () => {
      expect(parseDateOnly(null)).toBeNull();
      expect(parseDateOnly(undefined)).toBeNull();
      expect(parseDateOnly("invalid-date")).toBeNull();
    });

    it("computes difference in calendar days", () => {
      expect(getDaysDifference("2026-11-01", "2026-11-02")).toBe(1);
      expect(getDaysDifference("2026-11-02", "2026-11-02")).toBe(0);
      expect(getDaysDifference("2026-10-31", "2026-11-02")).toBe(2);
      expect(getDaysDifference("2026-10-01", "2026-11-01")).toBe(31);
    });
  });

  describe("calculateActiveStreak", () => {
    it("returns 0 if user has no streak or no last drop date", () => {
      expect(calculateActiveStreak(0, null, TODAY)).toBe(0);
      expect(calculateActiveStreak(5, null, TODAY)).toBe(0);
      expect(calculateActiveStreak(0, "2026-11-02", TODAY)).toBe(0);
    });

    it("returns streak if user posted today", () => {
      expect(calculateActiveStreak(3, "2026-11-02", TODAY)).toBe(3);
      expect(calculateActiveStreak(1, "2026-11-02T08:00:00Z", TODAY)).toBe(1);
    });

    it("returns streak if user posted yesterday (still active, today not yet finished)", () => {
      expect(calculateActiveStreak(7, "2026-11-01", TODAY)).toBe(7);
      expect(calculateActiveStreak(1, "2026-11-01T23:59:59Z", TODAY)).toBe(1);
    });

    it("returns 0 if user last posted 2 days ago (streak lapsed)", () => {
      expect(calculateActiveStreak(10, "2026-10-31", TODAY)).toBe(0);
    });

    it("returns 0 if user last posted a week ago", () => {
      expect(calculateActiveStreak(25, "2026-10-26", TODAY)).toBe(0);
    });
  });

  describe("hasPostedToday", () => {
    it("returns true only when date matches reference date", () => {
      expect(hasPostedToday("2026-11-02", TODAY)).toBe(true);
      expect(hasPostedToday("2026-11-02T10:00:00Z", TODAY)).toBe(true);
      expect(hasPostedToday("2026-11-01", TODAY)).toBe(false);
      expect(hasPostedToday(null, TODAY)).toBe(false);
    });
  });

  describe("getNextStreak", () => {
    it("returns 1 for first time dropper", () => {
      expect(getNextStreak(0, null, TODAY)).toBe(1);
      expect(getNextStreak(null, null, TODAY)).toBe(1);
    });

    it("maintains current streak if already posted today", () => {
      expect(getNextStreak(5, "2026-11-02", TODAY)).toBe(5);
    });

    it("increments streak by 1 if posted yesterday", () => {
      expect(getNextStreak(5, "2026-11-01", TODAY)).toBe(6);
    });

    it("resets to 1 if streak lapsed (last posted 2+ days ago)", () => {
      expect(getNextStreak(14, "2026-10-30", TODAY)).toBe(1);
    });
  });

  describe("formatStreakBadge & getStreakCelebration", () => {
    it("formats badges correctly", () => {
      expect(formatStreakBadge(5)).toBe("🔥 5d");
      expect(formatStreakBadge(5, true)).toBe("🔥 5-day streak");
      expect(formatStreakBadge(0)).toBe("");
    });

    it("produces correct celebration messages", () => {
      const day1 = getStreakCelebration(1, false);
      expect(day1.message).toContain("Day 1");

      const day5 = getStreakCelebration(5, false);
      expect(day5.message).toContain("5 consecutive days");

      const day7 = getStreakCelebration(7, false);
      expect(day7.message).toContain("Over a week");

      const day30 = getStreakCelebration(30, false);
      expect(day30.message).toContain("legendary Blurbbi creator");

      const maintained = getStreakCelebration(5, true);
      expect(maintained.message).toContain("Streak maintained");
    });
  });
});

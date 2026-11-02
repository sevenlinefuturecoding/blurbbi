/**
 * Blurbbi Daily Drop Streaks Utility
 *
 * Implements logic for calculating active posting streaks, determining
 * if a user has posted today, formatting streak badges, and generating
 * celebration messages.
 */

/**
 * Extracts a normalized YYYY-MM-DD string from a date string, Date object, or timestamp.
 */
export function parseDateOnly(val: string | Date | null | undefined): string | null {
  if (!val) return null;
  if (typeof val === "string") {
    // If format is already "YYYY-MM-DD"
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return val.toISOString().slice(0, 10);
  }
  return null;
}

/**
 * Calculates whole calendar days between two YYYY-MM-DD date strings (toDateStr - fromDateStr).
 */
export function getDaysDifference(fromDateStr: string, toDateStr: string): number {
  const [y1, m1, d1] = fromDateStr.split("-").map(Number);
  const [y2, m2, d2] = toDateStr.split("-").map(Number);
  const utc1 = Date.UTC(y1!, m1! - 1, d1!);
  const utc2 = Date.UTC(y2!, m2! - 1, d2!);
  return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

/**
 * Calculates the active streak for a user.
 * - If last post was today (diff = 0) or yesterday (diff = 1): streak is active!
 * - If last post was >= 2 days ago or never: streak has lapsed, returns 0.
 */
export function calculateActiveStreak(
  currentStreak: number | null | undefined,
  lastDropDate: string | Date | null | undefined,
  referenceDate: Date = new Date(),
): number {
  const streak = currentStreak ?? 0;
  if (streak <= 0 || !lastDropDate) return 0;

  const dropDateStr = parseDateOnly(lastDropDate);
  if (!dropDateStr) return 0;

  const refDateStr = parseDateOnly(referenceDate);
  if (!refDateStr) return 0;

  const diffDays = getDaysDifference(dropDateStr, refDateStr);

  // diffDays <= 0: posted today or timezone skew ahead
  // diffDays === 1: posted yesterday (user still has until end of today to keep streak going)
  if (diffDays <= 1) {
    return streak;
  }

  // 2 or more days have elapsed without posting; streak has lapsed
  return 0;
}

/**
 * Checks whether the user has already posted a drop today.
 */
export function hasPostedToday(
  lastDropDate: string | Date | null | undefined,
  referenceDate: Date = new Date(),
): boolean {
  if (!lastDropDate) return false;
  const dropDateStr = parseDateOnly(lastDropDate);
  const refDateStr = parseDateOnly(referenceDate);
  if (!dropDateStr || !refDateStr) return false;
  return dropDateStr === refDateStr;
}

/**
 * Calculates what the streak will be once the user drops today.
 */
export function getNextStreak(
  currentStreak: number | null | undefined,
  lastDropDate: string | Date | null | undefined,
  referenceDate: Date = new Date(),
): number {
  const active = calculateActiveStreak(currentStreak, lastDropDate, referenceDate);
  const postedToday = hasPostedToday(lastDropDate, referenceDate);

  if (postedToday) {
    return Math.max(active, 1);
  }
  if (active > 0) {
    return active + 1;
  }
  return 1;
}

/**
 * Returns formatted streak badge text, e.g. "🔥 5d" or "🔥 1-day streak".
 */
export function formatStreakBadge(streak: number, verbose = false): string {
  if (streak <= 0) return "";
  if (verbose) {
    return `🔥 ${streak}-day streak`;
  }
  return `🔥 ${streak}d`;
}

/**
 * Generates an encouraging celebration message after a drop is posted.
 */
export function getStreakCelebration(
  nextStreak: number,
  alreadyPostedToday: boolean,
): { title: string; message: string } {
  if (alreadyPostedToday) {
    return {
      title: "Drop released! 🌊",
      message: `Streak maintained! You're on a 🔥 ${nextStreak}-day streak.`,
    };
  }

  if (nextStreak === 1) {
    return {
      title: "Drop released! 🌊",
      message: "🔥 Day 1 of your streak! Drop again tomorrow to keep the flame alive.",
    };
  }

  if (nextStreak >= 30) {
    return {
      title: "Incredible Milestone! 🏆",
      message: `🔥 Unstoppable ${nextStreak}-day streak! You are a legendary Blurbbi creator!`,
    };
  }

  if (nextStreak >= 7) {
    return {
      title: "Streak Extended! 🚀",
      message: `🔥 ${nextStreak} days in a row! Over a week of daily drops!`,
    };
  }

  return {
    title: "Streak Extended! 🔥",
    message: `${nextStreak} consecutive days of dropping! Keep the momentum going!`,
  };
}


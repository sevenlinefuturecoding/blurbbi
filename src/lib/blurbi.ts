import type { Database } from "@/integrations/supabase/types";

/** Shape returned by the feed/ranking SQL functions. */
export type FeedDrop = {
  drop_id: string;
  content: string;
  author_id: string;
  username: string;
  display_name: string;
  avatar_emoji: string;
  avatar_color: string;
  spark_count: number;
  echo_count: number;
  relay_count: number;
  pass_count: number;
  created_at: string;
  score: number | string | null;
  author_streak?: number | null;
  author_last_drop_date?: string | null;
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"] & {
  website?: string | null;
  location?: string | null;
  pinned_drop_id?: string | null;
  is_verified?: boolean | null;
  is_admin?: boolean | null;
  is_suspended?: boolean | null;
  current_streak?: number | null;
  longest_streak?: number | null;
  last_drop_date?: string | null;
};

/** Per-viewer engagement state for a set of drops. */
export type EngagementState = {
  sparked: Set<string>;
  relayed: Set<string>;
  passed: Set<string>;
  orbited: Set<string>; // author ids the viewer orbits
};

export const MAX_DROP_LENGTH = 500;

/** Emoji-avatar background palette (used via inline style, not Tailwind classes). */
export const AVATAR_COLORS: Record<string, { light: string; dark: string }> = {
  coral: { light: "oklch(0.9 0.055 33)", dark: "oklch(0.34 0.075 33)" },
  amber: { light: "oklch(0.91 0.07 80)", dark: "oklch(0.35 0.08 80)" },
  lime: { light: "oklch(0.91 0.08 125)", dark: "oklch(0.33 0.07 125)" },
  teal: { light: "oklch(0.9 0.06 185)", dark: "oklch(0.32 0.06 185)" },
  sky: { light: "oklch(0.91 0.05 235)", dark: "oklch(0.33 0.06 235)" },
  indigo: { light: "oklch(0.9 0.055 280)", dark: "oklch(0.32 0.07 280)" },
  orchid: { light: "oklch(0.91 0.055 320)", dark: "oklch(0.33 0.07 320)" },
  rose: { light: "oklch(0.91 0.05 5)", dark: "oklch(0.33 0.07 5)" },
};

export const AVATAR_COLOR_KEYS = Object.keys(AVATAR_COLORS);

export function avatarStyle(colorKey: string): { backgroundColor: string } {
  const palette =
    AVATAR_COLORS[colorKey] ??
    ({ light: "oklch(0.91 0.05 235)", dark: "oklch(0.33 0.06 235)" } as const);
  const isDark =
    typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  return { backgroundColor: isDark ? palette.dark : palette.light };
}

/** Compact relative time, e.g. "3m", "2h", "5d". */
export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function compactCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, "")}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

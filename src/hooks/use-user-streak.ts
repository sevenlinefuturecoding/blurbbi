import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateActiveStreak, hasPostedToday, getNextStreak } from "@/lib/streaks";

export type UserStreakData = {
  current_streak: number;
  longest_streak: number;
  last_drop_date: string | null;
};

export function useUserStreak(
  userId?: string | undefined,
  initialStreak?:
    | {
        current_streak?: number | null | undefined;
        longest_streak?: number | null | undefined;
        last_drop_date?: string | null | undefined;
      }
    | undefined,
) {
  const hasInitial =
    initialStreak &&
    initialStreak.current_streak !== undefined &&
    initialStreak.last_drop_date !== undefined;

  const query = useQuery({
    queryKey: ["user-streak", userId],
    enabled: Boolean(userId),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    initialData: hasInitial
      ? {
          current_streak: initialStreak.current_streak ?? 0,
          longest_streak: initialStreak.longest_streak ?? initialStreak.current_streak ?? 0,
          last_drop_date: initialStreak.last_drop_date ?? null,
        }
      : undefined,
    queryFn: async (): Promise<UserStreakData> => {
      if (!userId) {
        return { current_streak: 0, longest_streak: 0, last_drop_date: null };
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("current_streak, longest_streak, last_drop_date")
          .eq("id", userId)
          .maybeSingle();

        if (error) {
          console.warn("fetchUserStreak error:", error.message);
          return { current_streak: 0, longest_streak: 0, last_drop_date: null };
        }

        return {
          current_streak: data?.current_streak ?? 0,
          longest_streak: data?.longest_streak ?? 0,
          last_drop_date: data?.last_drop_date ?? null,
        };
      } catch (err) {
        console.warn("fetchUserStreak exception:", err);
        return { current_streak: 0, longest_streak: 0, last_drop_date: null };
      }
    },
  });

  const streakData = query.data ?? {
    current_streak: initialStreak?.current_streak ?? 0,
    longest_streak: initialStreak?.longest_streak ?? 0,
    last_drop_date: initialStreak?.last_drop_date ?? null,
  };

  const activeStreak = calculateActiveStreak(streakData.current_streak, streakData.last_drop_date);
  const postedToday = hasPostedToday(streakData.last_drop_date);
  const nextStreak = getNextStreak(streakData.current_streak, streakData.last_drop_date);

  return {
    activeStreak,
    longestStreak: streakData.longest_streak,
    currentStreak: streakData.current_streak,
    lastDropDate: streakData.last_drop_date,
    hasPostedToday: postedToday,
    nextStreak,
    isLoading: query.isLoading && !hasInitial,
    refetch: query.refetch,
  };
}

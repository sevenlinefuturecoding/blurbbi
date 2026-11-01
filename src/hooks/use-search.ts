import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FeedDrop } from "@/lib/blurbi";

export type SearchBlurber = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_emoji: string;
  avatar_color: string;
  followers_count: number;
  following_count: number;
  is_verified?: boolean;
};

/**
 * Searches drops using Supabase full-text search RPC with fallback to table query.
 */
export async function searchDrops(query: string, limit = 40): Promise<FeedDrop[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const { data, error } = await supabase.rpc(
      "search_drops" as never,
      {
        p_query: trimmed,
        p_limit: limit,
      } as never,
    );
    if (!error && Array.isArray(data)) {
      return data as unknown as FeedDrop[];
    }
    if (error) {
      console.warn("search_drops RPC fallback:", error.message);
    }
  } catch (err) {
    console.warn("search_drops exception:", err);
  }

  // Graceful fallback if RPC is not yet created in Supabase
  try {
    const { data: drops, error: dropsError } = await supabase
      .from("drops")
      .select("id, content, user_id, spark_count, echo_count, relay_count, pass_count, created_at")
      .ilike("content", `%${trimmed}%`)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (dropsError || !drops || drops.length === 0) return [];

    const userIds = [...new Set(drops.map((d) => d.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_emoji, avatar_color")
      .in("id", userIds);

    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    return drops.map((d) => {
      const p = profileMap.get(d.user_id);
      return {
        drop_id: d.id,
        content: d.content,
        author_id: d.user_id,
        username: p?.username ?? "unknown",
        display_name: p?.display_name ?? p?.username ?? "Anonymous",
        avatar_emoji: p?.avatar_emoji ?? "✨",
        avatar_color: p?.avatar_color ?? "coral",
        spark_count: d.spark_count ?? 0,
        echo_count: d.echo_count ?? 0,
        relay_count: d.relay_count ?? 0,
        pass_count: d.pass_count ?? 0,
        created_at: d.created_at,
        score: null,
      };
    });
  } catch (e) {
    console.warn("Fallback drops search failed:", e);
    return [];
  }
}

/**
 * Searches user profiles by username, display name, or bio.
 */
export async function searchProfiles(query: string, limit = 25): Promise<SearchBlurber[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const { data, error } = await supabase.rpc(
      "search_profiles" as never,
      {
        p_query: trimmed,
        p_limit: limit,
      } as never,
    );
    if (!error && Array.isArray(data)) {
      return data as unknown as SearchBlurber[];
    }
    if (error) {
      console.warn("search_profiles RPC fallback:", error.message);
    }
  } catch (err) {
    console.warn("search_profiles exception:", err);
  }

  // Fallback direct table query
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, username, display_name, bio, avatar_emoji, avatar_color, followers_count, following_count, is_verified",
      )
      .or(`username.ilike.%${trimmed}%,display_name.ilike.%${trimmed}%,bio.ilike.%${trimmed}%`)
      .order("followers_count", { ascending: false })
      .limit(limit);

    if (error) return [];
    return (data ?? []) as SearchBlurber[];
  } catch {
    return [];
  }
}

/**
 * Fetches suggested blurbers to orbit (excludes current user and already orbited).
 */
export async function fetchSuggestedProfiles(
  viewerId?: string,
  limit = 12,
): Promise<SearchBlurber[]> {
  try {
    const { data, error } = await supabase.rpc(
      "suggested_profiles" as never,
      {
        p_viewer: viewerId || null,
        p_limit: limit,
      } as never,
    );
    if (!error && Array.isArray(data)) {
      return data as unknown as SearchBlurber[];
    }
    if (error) {
      console.warn("suggested_profiles RPC fallback:", error.message);
    }
  } catch (err) {
    console.warn("suggested_profiles exception:", err);
  }

  // Robust fallback excluding viewer and already orbited blurbers
  try {
    let query = supabase
      .from("profiles")
      .select(
        "id, username, display_name, bio, avatar_emoji, avatar_color, followers_count, following_count, is_verified",
      )
      .order("followers_count", { ascending: false })
      .limit(limit);

    if (viewerId) {
      query = query.neq("id", viewerId);
      const { data: followed } = await supabase
        .from("orbits")
        .select("followed_id")
        .eq("follower_id", viewerId);
      if (followed && followed.length > 0) {
        const followedIds = followed.map((f: { followed_id: string }) => f.followed_id);
        query = query.not("id", "in", `(${followedIds.join(",")})`);
      }
    }

    const { data } = await query;
    return (data ?? []) as SearchBlurber[];
  } catch {
    return [];
  }
}

export function useSearchDrops(query: string) {
  return useQuery({
    queryKey: ["search", "drops", query.trim()],
    queryFn: () => searchDrops(query),
    enabled: query.trim().length > 0,
    staleTime: 1000 * 30,
  });
}

export function useSearchProfiles(query: string) {
  return useQuery({
    queryKey: ["search", "profiles", query.trim()],
    queryFn: () => searchProfiles(query),
    enabled: query.trim().length > 0,
    staleTime: 1000 * 30,
  });
}

export function useSuggestedProfiles(viewerId?: string) {
  return useQuery({
    queryKey: ["suggested-profiles", viewerId],
    queryFn: () => fetchSuggestedProfiles(viewerId),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

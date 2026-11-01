import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EngagementState } from "@/lib/blurbi";

/** Per-viewer engagement state (sparked / relayed / passed / orbited) for a list of drops. */
export function useEngagement(
  dropIds: string[] | undefined,
  viewerId: string | undefined,
): EngagementState | undefined {
  const key = (dropIds ?? []).slice().sort().join(",");
  const query = useQuery({
    queryKey: ["engagement", viewerId ?? "anon", key],
    enabled: !!viewerId && (dropIds?.length ?? 0) > 0,
    staleTime: 10_000,
    queryFn: async () => {
      const [sparks, relays, passes, orbits] = await Promise.all([
        supabase.from("sparks").select("drop_id").eq("user_id", viewerId!).in("drop_id", dropIds!),
        supabase.from("relays").select("drop_id").eq("user_id", viewerId!).in("drop_id", dropIds!),
        supabase.from("passes").select("drop_id").eq("user_id", viewerId!).in("drop_id", dropIds!),
        supabase.from("orbits").select("followed_id").eq("follower_id", viewerId!),
      ]);
      return {
        sparked: new Set((sparks.data ?? []).map((r) => r.drop_id)),
        relayed: new Set((relays.data ?? []).map((r) => r.drop_id)),
        passed: new Set((passes.data ?? []).map((r) => r.drop_id)),
        orbited: new Set((orbits.data ?? []).map((r) => r.followed_id)),
      } satisfies EngagementState;
    },
  });
  return query.data;
}

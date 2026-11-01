import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * useRealtimeSync
 *
 * Sets up global Supabase Realtime WebSocket subscriptions across:
 * - `drops`: instant updates when new drops are published, edited, sparked, or deleted
 * - `echoes`: instant updates when replies/comments are posted
 * - `orbits`: instant updates when users follow or unfollow
 * - `profiles`: instant updates when bio, avatar, or counts change
 * - `sparks` & `relays`: instant updates to engagement badges
 *
 * Uses debouncing so bursts of activity (e.g. multiple likes in 1s) coalesce
 * into a single smooth background refetch without page reload or layout thrash.
 */
export function useRealtimeSync() {
  const qc = useQueryClient();
  const debounceTimerRef = useRef<{
    drops?: ReturnType<typeof setTimeout>;
    echoes?: ReturnType<typeof setTimeout>;
    orbits?: ReturnType<typeof setTimeout>;
    profiles?: ReturnType<typeof setTimeout>;
  }>({});

  useEffect(() => {
    if (typeof window === "undefined") return;

    const timerMap = debounceTimerRef.current;

    function debounceInvalidate(
      key: "drops" | "echoes" | "orbits" | "profiles",
      queryKeys: unknown[][],
      delayMs = 300,
    ) {
      if (timerMap[key]) {
        clearTimeout(timerMap[key]);
      }
      timerMap[key] = setTimeout(() => {
        for (const qk of queryKeys) {
          qc.invalidateQueries({ queryKey: qk });
        }
      }, delayMs);
    }

    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      channel = supabase
        .channel("blurbbi:realtime-global")
        // 1. Drops changes (new drops, spark count updates, delete)
        .on("postgres_changes", { event: "*", schema: "public", table: "drops" }, () => {
          debounceInvalidate("drops", [
            ["drops"],
            ["drop"],
            ["profile-drops"],
            ["profile-total-drops"],
            ["engagement"],
          ]);
        })
        // 2. Echoes changes (new thread replies)
        .on("postgres_changes", { event: "*", schema: "public", table: "echoes" }, () => {
          debounceInvalidate("echoes", [["echoes"], ["drop"], ["drops"], ["profile-echoes"]]);
        })
        // 3. Orbits changes (follow / unfollow)
        .on("postgres_changes", { event: "*", schema: "public", table: "orbits" }, () => {
          debounceInvalidate("orbits", [
            ["profile"],
            ["orbiters"],
            ["orbiting"],
            ["drops", "orbit"],
          ]);
        })
        // 4. Profiles changes (profile edits, stats update)
        .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
          debounceInvalidate("profiles", [["profile"], ["my-profile"], ["blurbers"]]);
        })
        // 5. Sparks changes (like reactions)
        .on("postgres_changes", { event: "*", schema: "public", table: "sparks" }, () => {
          debounceInvalidate("drops", [["drop"], ["drops"], ["engagement"]]);
        })
        // 6. Relays changes (reposts)
        .on("postgres_changes", { event: "*", schema: "public", table: "relays" }, () => {
          debounceInvalidate("drops", [
            ["drop"],
            ["drops"],
            ["user-relays"],
            ["profile-relays"],
            ["engagement"],
          ]);
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            // Connected to Supabase Realtime successfully
          } else if (status === "CHANNEL_ERROR") {
            console.warn(
              "[Realtime] Subscription encountered channel error, continuing with fallback.",
            );
          }
        });
    } catch (err) {
      console.warn("[Realtime] Failed to initialize realtime channel:", err);
    }

    return () => {
      if (timerMap.drops) clearTimeout(timerMap.drops);
      if (timerMap.echoes) clearTimeout(timerMap.echoes);
      if (timerMap.orbits) clearTimeout(timerMap.orbits);
      if (timerMap.profiles) clearTimeout(timerMap.profiles);

      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [qc]);
}

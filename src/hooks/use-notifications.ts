import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "./use-my-profile";

export type NotificationItem = {
  id: string;
  type: "spark" | "echo" | "relay" | "orbit" | "mention";
  read: boolean;
  created_at: string;
  drop_id: string | null;
  actor: {
    id: string;
    username: string;
    display_name: string;
    avatar_emoji: string;
    avatar_color: string;
  } | null;
  drop: {
    id: string;
    content: string;
  } | null;
};

/** Lightweight hook used by AppShell to show the unread badge */
export function useUnreadNotificationsCount(): number {
  const { data: me } = useMyProfile();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", "unread-count", me?.id],
    enabled: !!me?.id,
    queryFn: async (): Promise<number> => {
      try {
        const { count, error } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", me!.id)
          .eq("read", false);

        if (error) {
          console.warn("Notifications count query warning:", error.message);
          return 0;
        }
        return count ?? 0;
      } catch {
        return 0;
      }
    },
    staleTime: 1000 * 30, // 30s
  });

  // Realtime listener for instant badge updates
  useEffect(() => {
    if (!me?.id || typeof window === "undefined") return;

    let cleanup: (() => void) | undefined;
    try {
      const channel = supabase
        .channel(`realtime:notifications:${me.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${me.id}`,
          },
          () => {
            qc.invalidateQueries({ queryKey: ["notifications"] });
          },
        )
        .subscribe();

      cleanup = () => {
        supabase.removeChannel(channel);
      };
    } catch (e) {
      console.warn("Realtime subscription error:", e);
    }

    return () => {
      cleanup?.();
    };
  }, [me?.id, qc]);

  return query.data ?? 0;
}

/** Full notifications hook used only on the /notifications page */
export function useNotifications() {
  const { data: me } = useMyProfile();
  const qc = useQueryClient();
  const unreadCount = useUnreadNotificationsCount();

  const listQuery = useQuery({
    queryKey: ["notifications", "list", me?.id],
    enabled: !!me?.id,
    queryFn: async (): Promise<NotificationItem[]> => {
      try {
        const { data: rawNotifs, error } = await supabase
          .from("notifications")
          .select("id, type, read, created_at, drop_id, actor_id, user_id")
          .eq("user_id", me!.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error || !rawNotifs || rawNotifs.length === 0) {
          if (error) console.warn("Failed to fetch notifications:", error.message);
          return [];
        }

        const actorIds = [...new Set(rawNotifs.map((n) => n.actor_id))];
        const dropIds = [...new Set(rawNotifs.map((n) => n.drop_id).filter(Boolean))] as string[];

        // Fetch actors and drops in parallel
        const [actorsRes, dropsRes] = await Promise.all([
          actorIds.length > 0
            ? supabase
                .from("profiles")
                .select("id, username, display_name, avatar_emoji, avatar_color")
                .in("id", actorIds)
            : Promise.resolve({ data: [] }),
          dropIds.length > 0
            ? supabase.from("drops").select("id, content").in("id", dropIds)
            : Promise.resolve({ data: [] }),
        ]);

        const actorsMap = new Map((actorsRes.data ?? []).map((a) => [a.id, a]));
        const dropsMap = new Map((dropsRes.data ?? []).map((d) => [d.id, d]));

        return rawNotifs.map((n) => ({
          id: n.id,
          type: n.type as NotificationItem["type"],
          read: n.read,
          created_at: n.created_at,
          drop_id: n.drop_id,
          actor: actorsMap.get(n.actor_id) ?? null,
          drop: n.drop_id ? (dropsMap.get(n.drop_id) ?? null) : null,
        }));
      } catch (err) {
        console.warn("Notifications query error:", err);
        return [];
      }
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId)
        .eq("user_id", me!.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      try {
        await supabase.rpc("mark_all_notifications_read");
      } catch {
        await supabase
          .from("notifications")
          .update({ read: true })
          .eq("user_id", me!.id)
          .eq("read", false);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return {
    unreadCount,
    notifications: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    isRefetching: listQuery.isRefetching,
    refetch: listQuery.refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  };
}

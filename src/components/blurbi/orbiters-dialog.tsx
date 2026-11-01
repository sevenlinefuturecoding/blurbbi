import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BlurberCard } from "./blurber-card";
import { supabase } from "@/integrations/supabase/client";
import { useEngagement } from "@/hooks/use-engagement";
import type { SearchBlurber } from "@/hooks/use-search";
import { Users, Satellite, Loader2 } from "lucide-react";

export function OrbitersDialog({
  open,
  onOpenChange,
  type,
  userId,
  username,
  viewerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "orbiters" | "orbiting";
  userId: string;
  username: string;
  viewerId?: string | undefined;
}) {
  const isOrbiters = type === "orbiters";
  const title = isOrbiters ? `Orbiters of @${username}` : `@${username} is Orbiting`;

  const query = useQuery({
    queryKey: ["orbits-list", type, userId],
    enabled: open && !!userId,
    queryFn: async (): Promise<SearchBlurber[]> => {
      try {
        const rpcName = isOrbiters ? "get_orbiters" : "get_orbiting";
        const { data, error } = await supabase.rpc(
          rpcName as never,
          {
            p_user_id: userId,
            p_limit: 50,
          } as never,
        );

        if (!error && Array.isArray(data)) {
          return data as unknown as SearchBlurber[];
        }
      } catch (err) {
        console.warn(`${type} RPC fallback:`, err);
      }

      // Graceful fallback direct query
      try {
        const filterCol = isOrbiters ? "followed_id" : "follower_id";
        const targetCol = isOrbiters ? "follower_id" : "followed_id";

        const { data: orbitRows, error: orbitError } = await supabase
          .from("orbits")
          .select(targetCol)
          .eq(filterCol, userId)
          .limit(50);

        if (orbitError || !orbitRows || orbitRows.length === 0) return [];

        const targetIds = orbitRows.map((r: Record<string, unknown>) => r[targetCol] as string);
        const { data: profs } = await supabase
          .from("profiles")
          .select(
            "id, username, display_name, bio, avatar_emoji, avatar_color, followers_count, following_count",
          )
          .in("id", targetIds);

        return (profs ?? []) as SearchBlurber[];
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 30,
  });

  const list = query.data ?? [];
  const engagement = useEngagement(
    list.map((u) => u.id),
    viewerId,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl sm:max-w-md p-5">
        <DialogHeader className="pb-2 border-b border-border/50">
          <DialogTitle className="font-display text-lg font-bold flex items-center gap-2">
            {isOrbiters ? (
              <Users className="h-5 w-5 text-primary" />
            ) : (
              <Satellite className="h-5 w-5 text-primary" />
            )}
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="py-2">
          {query.isLoading ? (
            <div className="space-y-3 py-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted/60" />
              ))}
            </div>
          ) : list.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center my-3">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground mb-2.5">
                {isOrbiters ? <Users className="h-5 w-5" /> : <Satellite className="h-5 w-5" />}
              </div>
              <h4 className="font-semibold text-foreground text-sm">
                {isOrbiters ? "No Orbiters yet" : "Not orbiting anyone"}
              </h4>
              <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto">
                {isOrbiters
                  ? `When blurbers orbit @${username}, they will appear here.`
                  : `@${username} hasn't orbited any blurbers yet.`}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {list.map((blurber) => (
                <BlurberCard
                  key={blurber.id}
                  blurber={blurber}
                  viewerId={viewerId}
                  isOrbited={engagement?.orbited.has(blurber.id) ?? false}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Users, Satellite } from "lucide-react";
import { BlurbiAvatar } from "./blurbi-avatar";
import { Button } from "@/components/ui/button";
import { toggleOrbit, refreshAfterEngagement } from "@/lib/engagement";
import { compactCount } from "@/lib/blurbi";
import type { SearchBlurber } from "@/hooks/use-search";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function BlurberCard({
  blurber,
  viewerId,
  isOrbited = false,
  className,
}: {
  blurber: SearchBlurber;
  viewerId: string | undefined;
  isOrbited?: boolean;
  className?: string;
}) {
  const [orbiting, setOrbiting] = useState(isOrbited);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const isSelf = viewerId === blurber.id;

  async function handleToggleOrbit(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!viewerId) {
      toast.error("Sign in to orbit other blurbers.");
      navigate({ to: "/auth" });
      return;
    }

    if (isSelf || busy) return;

    const nextState = !orbiting;
    setOrbiting(nextState);
    setBusy(true);

    try {
      await toggleOrbit(blurber.id, orbiting, viewerId);
      await refreshAfterEngagement(qc);
      qc.invalidateQueries({ queryKey: ["suggested-profiles"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success(
        nextState ? `Orbiting @${blurber.username} 🛰️` : `Left @${blurber.username}'s orbit`,
      );
    } catch (err) {
      // Revert optimistic update
      setOrbiting(orbiting);
      toast.error(err instanceof Error ? err.message : "Failed to update orbit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={cn(
        "group flex items-start gap-3.5 rounded-3xl border border-border bg-card p-4 shadow-sm transition-all hover:border-ring/50 hover:shadow-md",
        className,
      )}
    >
      <Link to="/u/$username" params={{ username: blurber.username }} className="shrink-0">
        <BlurbiAvatar
          emoji={blurber.avatar_emoji || "✨"}
          color={blurber.avatar_color || "coral"}
          size="md"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            to="/u/$username"
            params={{ username: blurber.username }}
            className="min-w-0 flex-1 group-hover:underline"
          >
            <div className="truncate font-semibold text-foreground text-[15px]">
              {blurber.display_name || blurber.username}
            </div>
            <div className="truncate text-xs text-muted-foreground">@{blurber.username}</div>
          </Link>

          {!isSelf && (
            <Button
              size="sm"
              variant={orbiting ? "secondary" : "default"}
              onClick={handleToggleOrbit}
              disabled={busy}
              className={cn(
                "h-8 rounded-full px-3 text-xs font-semibold shrink-0 transition-colors",
                orbiting &&
                  "text-muted-foreground hover:border-destructive hover:bg-destructive/10 hover:text-destructive",
              )}
            >
              <Satellite className={cn("mr-1 h-3.5 w-3.5", orbiting && "text-primary")} />
              {orbiting ? "Orbiting" : "Orbit"}
            </Button>
          )}

          {isSelf && (
            <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              You
            </span>
          )}
        </div>

        {blurber.bio && (
          <p className="mt-1.5 line-clamp-2 text-xs text-foreground/80 leading-relaxed break-words">
            {blurber.bio}
          </p>
        )}

        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>
              <strong className="font-semibold text-foreground">
                {compactCount(blurber.followers_count ?? 0)}
              </strong>{" "}
              {blurber.followers_count === 1 ? "orbit" : "orbits"}
            </span>
          </div>
          {blurber.following_count !== undefined && blurber.following_count > 0 && (
            <span>
              <strong className="font-semibold text-foreground">
                {compactCount(blurber.following_count)}
              </strong>{" "}
              orbiting
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

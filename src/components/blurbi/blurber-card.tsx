import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Users, Satellite, BadgeCheck, Loader2 } from "lucide-react";
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

  useEffect(() => {
    setOrbiting(isOrbited);
  }, [isOrbited]);

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
      qc.invalidateQueries({ queryKey: ["orbiters"] });
      qc.invalidateQueries({ queryKey: ["orbiting"] });
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
        "group relative flex items-start gap-3 rounded-2xl border border-border/80 bg-card p-3 sm:p-3.5 shadow-2xs transition-all duration-150 hover:border-border hover:bg-card/90",
        className,
      )}
    >
      <Link to="/u/$username" params={{ username: blurber.username }} className="shrink-0 pt-0.5">
        <BlurbiAvatar
          emoji={blurber.avatar_emoji || "✨"}
          color={blurber.avatar_color || "coral"}
          size="md"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <Link
            to="/u/$username"
            params={{ username: blurber.username }}
            className="min-w-0 flex-1 block"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {blurber.display_name || blurber.username}
              </span>
              {blurber.is_verified && (
                <span title="Verified Blurber" className="inline-flex shrink-0">
                  <BadgeCheck className="h-3.5 w-3.5 text-primary fill-primary/20" />
                </span>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">@{blurber.username}</p>
          </Link>

          {!isSelf ? (
            <Button
              size="sm"
              variant={orbiting ? "secondary" : "default"}
              onClick={handleToggleOrbit}
              disabled={busy}
              className={cn(
                "h-7.5 rounded-full px-3 text-xs font-semibold shrink-0 transition-all active:scale-95",
                orbiting
                  ? "border border-border/70 bg-secondary/80 text-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs",
              )}
            >
              {busy ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Satellite className={cn("mr-1 h-3.5 w-3.5", orbiting ? "text-primary" : "")} />
              )}
              {orbiting ? "Following" : "Orbit"}
            </Button>
          ) : (
            <span className="shrink-0 rounded-full bg-secondary/60 px-2.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">
              You
            </span>
          )}
        </div>

        {blurber.bio && (
          <p className="mt-1 line-clamp-1 sm:line-clamp-2 text-xs text-foreground/80 leading-snug break-words">
            {blurber.bio}
          </p>
        )}

        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 shrink-0" />
            <span>
              <strong className="font-semibold text-foreground">
                {compactCount(blurber.followers_count ?? 0)}
              </strong>{" "}
              {blurber.followers_count === 1 ? "orbiter" : "orbiters"}
            </span>
          </div>
          {blurber.following_count !== undefined && blurber.following_count > 0 && (
            <span className="hidden sm:inline">
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

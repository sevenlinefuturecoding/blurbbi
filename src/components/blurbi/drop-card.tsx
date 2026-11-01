import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Flame,
  MessageCircle,
  Repeat2,
  Share2,
  MoreHorizontal,
  EyeOff,
  Flag,
  VolumeX,
  Trash2,
  Pin,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BlurbiAvatar } from "./blurbi-avatar";
import { ReportDialog } from "./report-dialog";
import {
  toggleSpark,
  toggleRelay,
  addPass,
  hideDrop,
  muteUser,
  deleteDrop,
  refreshAfterEngagement,
} from "@/lib/engagement";
import { compactCount, timeAgo, type FeedDrop } from "@/lib/blurbi";
import type { EngagementState } from "@/lib/blurbi";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function DropCard({
  drop,
  rank,
  viewerId,
  engagement,
  className,
  isPinned = false,
  onTogglePin,
  relayedBy,
}: {
  drop: FeedDrop;
  rank?: number | undefined;
  viewerId: string | undefined;
  engagement: EngagementState | undefined;
  className?: string | undefined;
  isPinned?: boolean | undefined;
  onTogglePin?: (() => void | Promise<void>) | undefined;
  relayedBy?: string | undefined;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [reportOpen, setReportOpen] = useState(false);
  const isMine = viewerId === drop.author_id;
  const sparked = engagement?.sparked.has(drop.drop_id) ?? false;
  const relayed = engagement?.relayed.has(drop.drop_id) ?? false;
  const passed = engagement?.passed.has(drop.drop_id) ?? false;

  function requireViewer(): boolean {
    if (!viewerId) {
      toast.error("Sign in to interact with Drops.");
      navigate({ to: "/auth" });
      return false;
    }
    return true;
  }

  async function onSpark() {
    if (!requireViewer()) return;
    try {
      await toggleSpark(drop.drop_id, sparked, viewerId!);
      await refreshAfterEngagement(qc);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  async function onRelay() {
    if (!requireViewer()) return;
    try {
      await toggleRelay(drop.drop_id, relayed, viewerId!);
      await refreshAfterEngagement(qc);
      toast.success(relayed ? "Relay removed" : "Relayed! Your orbit will feel it.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  async function onPass() {
    if (!requireViewer()) return;
    try {
      await addPass(drop.drop_id, viewerId!);
      await navigator.clipboard.writeText(`${window.location.origin}/drop/${drop.drop_id}`);
      await refreshAfterEngagement(qc);
      toast.success("Link copied — Drop passed on! 🔗");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  async function onHide() {
    if (!requireViewer()) return;
    try {
      await hideDrop(drop.drop_id, viewerId!);
      await refreshAfterEngagement(qc);
      toast.success("Drop hidden from your Stream.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  async function onMute() {
    if (!requireViewer()) return;
    try {
      await muteUser(drop.author_id, viewerId!);
      await refreshAfterEngagement(qc);
      toast.success(`@${drop.username} muted. You won't see their Drops.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  async function onDelete() {
    if (!window.confirm("Delete this Drop for good?")) return;
    try {
      await deleteDrop(drop.drop_id);
      await refreshAfterEngagement(qc);
      toast.success("Drop deleted.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "rounded-2xl sm:rounded-3xl border border-border/70 bg-card/90 p-3.5 sm:p-4.5 shadow-xs transition-all duration-150",
        "hover:border-border hover:bg-card hover:shadow-sm",
        isPinned && "border-primary/40 bg-card/95",
        className,
      )}
    >
      {relayedBy && (
        <div className="mb-2 flex items-center gap-1.5 pl-1 text-xs font-medium text-muted-foreground">
          <Repeat2 className="h-3.5 w-3.5 text-chart-2" />
          <span>Relayed by @{relayedBy}</span>
        </div>
      )}
      {isPinned && (
        <div className="mb-2 flex items-center gap-1.5 pl-1 text-xs font-semibold text-primary">
          <Pin className="h-3.5 w-3.5 fill-current" />
          <span>Pinned Drop</span>
        </div>
      )}
      <div className="flex items-start gap-3">
        <Link to="/u/$username" params={{ username: drop.username }} className="shrink-0 pt-0.5">
          <BlurbiAvatar emoji={drop.avatar_emoji} color={drop.avatar_color} size="md" />
        </Link>
        <div className="min-w-0 flex-1">
          {/* Header row: author + meta on one line, menu on right */}
          <div className="flex items-center justify-between gap-1">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
                <Link
                  to="/u/$username"
                  params={{ username: drop.username }}
                  className="truncate font-semibold text-foreground hover:underline"
                >
                  {drop.display_name || drop.username}
                </Link>
                <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                  @{drop.username}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">·</span>
                <Link
                  to="/drop/$id"
                  params={{ id: drop.drop_id }}
                  className="shrink-0 text-xs text-muted-foreground hover:underline"
                >
                  {timeAgo(drop.created_at)}
                </Link>
                {rank !== undefined && (
                  <span className="shrink-0 rounded-full bg-accent/80 px-2 py-0.2 text-[11px] font-semibold text-accent-foreground">
                    #{rank}
                  </span>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="Drop options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl">
                {isMine ? (
                  <>
                    {onTogglePin && (
                      <DropdownMenuItem onClick={onTogglePin}>
                        <Pin className={cn("h-4 w-4", isPinned && "text-primary fill-current")} />
                        {isPinned ? "Unpin from profile" : "Pin to profile"}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={onDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" /> Delete Drop
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => setReportOpen(true)}>
                      <Flag className="h-4 w-4" /> Report Drop
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onHide}>
                      <EyeOff className="h-4 w-4" /> Hide Drop
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onMute}>
                      <VolumeX className="h-4 w-4" /> Mute @{drop.username}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Link to="/drop/$id" params={{ id: drop.drop_id }} className="block">
            <p className="mt-1.5 whitespace-pre-wrap break-words text-[14.5px] leading-relaxed text-foreground/90">
              {drop.content}
            </p>
          </Link>

          {/* Actions: touch-friendly, evenly spaced */}
          <div className="mt-2.5 -ml-1.5 flex items-center justify-between text-muted-foreground max-w-sm sm:max-w-md">
            <ActionButton
              label="Spark"
              active={sparked}
              activeClass="text-primary font-medium"
              onClick={onSpark}
              icon={<Flame className={cn("h-4 w-4", sparked && "fill-current")} />}
              count={drop.spark_count}
            />
            <ActionButton
              label="Echo"
              onClick={() => navigate({ to: "/drop/$id", params: { id: drop.drop_id } })}
              icon={<MessageCircle className="h-4 w-4" />}
              count={drop.echo_count}
            />
            <ActionButton
              label="Relay"
              active={relayed}
              activeClass="text-emerald-500 font-medium"
              onClick={onRelay}
              icon={<Repeat2 className="h-4 w-4" />}
              count={drop.relay_count}
            />
            <ActionButton
              label="Pass"
              active={passed}
              activeClass="text-sky-500 font-medium"
              onClick={onPass}
              icon={<Share2 className="h-4 w-4" />}
              count={drop.pass_count}
            />
          </div>
        </div>
      </div>

      <ReportDialog
        dropId={drop.drop_id}
        authorUsername={drop.username}
        viewerId={viewerId ?? ""}
        open={reportOpen}
        onOpenChange={setReportOpen}
        onDone={() => refreshAfterEngagement(qc)}
      />
    </motion.article>
  );
}

function ActionButton({
  label,
  icon,
  count,
  active,
  activeClass,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  count: number;
  active?: boolean;
  activeClass?: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors hover:bg-accent/80 hover:text-foreground",
        active ? activeClass : "text-muted-foreground",
      )}
      aria-label={label}
    >
      {icon}
      {count > 0 && <span className="tabular-nums text-[11px]">{compactCount(count)}</span>}
    </motion.button>
  );
}

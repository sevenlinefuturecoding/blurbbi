import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Pin,
  EyeOff,
  Eye,
  Trash2,
  RotateCcw,
  Sparkles,
  MessageSquare,
  Repeat2,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BlurbiAvatar } from "@/components/blurbi/blurbi-avatar";
import {
  fetchAdminDrops,
  moderateDrop,
  type AdminDropListItem,
  type DropModerationStatus,
} from "@/lib/admin";
import { timeAgo } from "@/lib/blurbi";

export function AdminDropsView() {
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [moderationStatus, setModerationStatus] = useState<DropModerationStatus | "all">("all");
  const [page, setPage] = useState(1);
  const limit = 15;

  // Moderation Dialog State
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedDrop, setSelectedDrop] = useState<AdminDropListItem | null>(null);
  const [actionType, setActionType] = useState<
    "hide" | "unhide" | "remove" | "restore" | "pin" | "unpin"
  >("hide");
  const [actionReason, setActionReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "drops", { search, moderationStatus, page, limit }],
    queryFn: () =>
      fetchAdminDrops({
        search,
        moderationStatus,
        page,
        limit,
      }),
  });

  const moderateMutation = useMutation({
    mutationFn: moderateDrop,
    onSuccess: (_, vars) => {
      const labels: Record<string, string> = {
        hide: "Drop hidden from feeds",
        unhide: "Drop restored to feeds",
        remove: "Drop removed by administrator",
        restore: "Drop restored",
        pin: "Drop pinned to stream",
        unpin: "Drop unpinned from stream",
      };
      toast.success(labels[vars.action] || "Action completed");
      setActionDialogOpen(false);
      setActionReason("");
      qc.invalidateQueries({ queryKey: ["admin", "drops"] });
      qc.invalidateQueries({ queryKey: ["drops"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Moderation action failed");
    },
  });

  const drops = data?.drops ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(Math.ceil(totalCount / limit), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Drop Content Management
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Search, moderate, hide, remove, or pin short text drops across the platform.
          </p>
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          Showing {drops.length} of {totalCount} drops
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search drop content keywords..."
            className="pl-9 bg-background h-10 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={moderationStatus}
            onValueChange={(val) => {
              setModerationStatus(val as DropModerationStatus | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px] h-10 bg-background text-xs">
              <SelectValue placeholder="Status: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Status: All</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
              <SelectItem value="hidden">Hidden</SelectItem>
              <SelectItem value="removed">Removed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Drops Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground bg-muted/30">
                <th className="py-3 px-4">Content</th>
                <th className="py-3 px-4">Author</th>
                <th className="py-3 px-4">Signals</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    Loading content stream...
                  </td>
                </tr>
              ) : drops.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    No drops found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                drops.map((drop) => (
                  <tr
                    key={drop.id}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-4 max-w-md">
                      <div className="flex items-start gap-2">
                        {drop.is_pinned && (
                          <Pin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        )}
                        <p className="text-foreground line-clamp-2 text-sm">{drop.content}</p>
                      </div>
                      {drop.moderation_reason && (
                        <div className="mt-1 text-[11px] text-destructive italic">
                          Reason: {drop.moderation_reason}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <BlurbiAvatar
                          emoji={drop.author.avatar_emoji}
                          color={drop.author.avatar_color}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-foreground truncate">
                            {drop.author.display_name || drop.author.username}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            @{drop.author.username}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5 text-xs text-muted-foreground font-mono">
                        <span>✨ {drop.spark_count}</span>
                        <span>💬 {drop.echo_count}</span>
                        <span>🔄 {drop.relay_count}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          drop.moderation_status === "approved" && !drop.is_hidden
                            ? "secondary"
                            : drop.moderation_status === "flagged"
                              ? "outline"
                              : "destructive"
                        }
                        className="text-[10px] uppercase font-mono"
                      >
                        {drop.is_hidden && drop.moderation_status !== "removed"
                          ? "hidden"
                          : drop.moderation_status}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 text-xs text-muted-foreground font-mono">
                      {timeAgo(drop.created_at)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Pin Toggle */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedDrop(drop);
                            setActionType(drop.is_pinned ? "unpin" : "pin");
                            setActionDialogOpen(true);
                          }}
                          className={`h-7 w-7 p-0 ${drop.is_pinned ? "text-primary" : "text-muted-foreground"}`}
                          title={drop.is_pinned ? "Unpin drop" : "Pin drop"}
                        >
                          <Pin className="h-3.5 w-3.5" />
                        </Button>

                        {/* Hide / Unhide Toggle */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedDrop(drop);
                            setActionType(drop.is_hidden ? "unhide" : "hide");
                            setActionDialogOpen(true);
                          }}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          title={drop.is_hidden ? "Unhide drop" : "Hide drop"}
                        >
                          {drop.is_hidden ? (
                            <Eye className="h-3.5 w-3.5" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5" />
                          )}
                        </Button>

                        {/* Remove / Restore Button */}
                        {drop.moderation_status === "removed" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedDrop(drop);
                              setActionType("restore");
                              setActionDialogOpen(true);
                            }}
                            className="h-7 text-xs text-emerald-500 hover:text-emerald-400 gap-1 px-2"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Restore
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedDrop(drop);
                              setActionType("remove");
                              setActionDialogOpen(true);
                            }}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            title="Remove drop"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border p-4 text-xs text-muted-foreground">
            <div>
              Page {page} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="h-8 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className="h-8 text-xs"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Moderation Confirmation Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="capitalize">{actionType} Drop Content</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {selectedDrop && (
              <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs">
                <div className="text-muted-foreground font-mono mb-1">
                  Author: @{selectedDrop.author.username}
                </div>
                <p className="text-foreground line-clamp-3">{selectedDrop.content}</p>
              </div>
            )}

            {(actionType === "remove" || actionType === "hide") && (
              <div>
                <Label className="text-xs">Reason for action (Audit trail)</Label>
                <Input
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="e.g. Terms violation, spam content..."
                  className="mt-1.5 bg-background text-sm"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={actionType === "remove" ? "destructive" : "default"}
              disabled={moderateMutation.isPending}
              onClick={() => {
                if (!selectedDrop) return;
                moderateMutation.mutate({
                  dropId: selectedDrop.id,
                  action: actionType,
                  reason: actionReason || undefined,
                });
              }}
            >
              {moderateMutation.isPending ? "Applying..." : `Confirm ${actionType}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

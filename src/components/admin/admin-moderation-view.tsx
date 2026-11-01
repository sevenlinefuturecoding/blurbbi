import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldAlert,
  CheckCircle2,
  Trash2,
  UserX,
  AlertTriangle,
  Clock,
  Filter,
  Eye,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { BlurbiAvatar } from "@/components/blurbi/blurbi-avatar";
import {
  fetchAdminReports,
  manageReport,
  type AdminReportListItem,
  type ReportCategory,
  type ReportStatus,
} from "@/lib/admin";
import { timeAgo } from "@/lib/blurbi";

export function AdminModerationView() {
  const qc = useQueryClient();

  const [status, setStatus] = useState<ReportStatus | "all">("pending");
  const [category, setCategory] = useState<ReportCategory | "all">("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Selected report for review / action
  const [selectedReport, setSelectedReport] = useState<AdminReportListItem | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [internalNotes, setInternalNotes] = useState("");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "reports-center", { status, category, page, limit }],
    queryFn: () => fetchAdminReports({ status, category, page, limit }),
  });

  const manageMutation = useMutation({
    mutationFn: manageReport,
    onSuccess: (_, vars) => {
      const messages: Record<string, string> = {
        dismiss: "Report dismissed",
        resolve: "Report resolved",
        delete_content: "Content removed and report resolved",
        suspend_user: "User suspended and content removed",
        under_review: "Report moved to Under Review",
      };
      toast.success(messages[vars.action] || "Report updated");
      setReviewDialogOpen(false);
      setSelectedReport(null);
      setInternalNotes("");
      qc.invalidateQueries({ queryKey: ["admin", "reports-center"] });
      qc.invalidateQueries({ queryKey: ["admin", "analytics"] });
      qc.invalidateQueries({ queryKey: ["admin", "drops"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Moderation action failed");
    },
  });

  const reports = data?.reports ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(Math.ceil(totalCount / limit), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Moderation & Safety Center
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Investigate reported drops, triage violations, and enforce community standards.
          </p>
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          Showing {reports.length} of {totalCount} reports
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Status:</Label>
          <Select
            value={status}
            onValueChange={(val) => {
              setStatus(val as ReportStatus | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px] h-9 bg-background text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Category:</Label>
          <Select
            value={category}
            onValueChange={(val) => {
              setCategory(val as ReportCategory | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[150px] h-9 bg-background text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="spam">Spam</SelectItem>
              <SelectItem value="harassment">Harassment</SelectItem>
              <SelectItem value="hate_speech">Hate Speech</SelectItem>
              <SelectItem value="impersonation">Impersonation</SelectItem>
              <SelectItem value="inappropriate">Inappropriate</SelectItem>
              <SelectItem value="fake_account">Fake Account</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
            Loading moderation queue...
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500/70" />
            No reports currently in this queue. Everything looks clean!
          </div>
        ) : (
          reports.map((report) => (
            <div
              key={report.id}
              className={`rounded-2xl border p-4 transition-all ${
                report.status === "pending"
                  ? "border-destructive/30 bg-destructive/5 hover:border-destructive/50"
                  : report.status === "under_review"
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-border/60 bg-card opacity-70"
              }`}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      report.status === "pending"
                        ? "destructive"
                        : report.status === "under_review"
                          ? "outline"
                          : "secondary"
                    }
                    className="text-[10px] uppercase font-mono"
                  >
                    {report.status.replace("_", " ")}
                  </Badge>

                  <Badge variant="outline" className="text-[10px] capitalize font-mono">
                    Category: {report.category}
                  </Badge>

                  <span className="font-semibold text-foreground">
                    Reason: &quot;{report.reason}&quot;
                  </span>
                </div>

                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>Reporter: @{report.reporter?.username ?? "anonymous"}</span>
                  <span>·</span>
                  <span className="font-mono">{timeAgo(report.created_at)}</span>
                </div>
              </div>

              {/* Reported Content Card Preview */}
              <div className="mt-3 rounded-xl border border-border bg-background p-3.5 text-sm">
                {report.drop ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <BlurbiAvatar
                        emoji={report.drop.author.avatar_emoji}
                        color={report.drop.author.avatar_color}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <span className="font-medium text-xs text-foreground">
                          {report.drop.author.display_name || report.drop.author.username}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono ml-1.5">
                          @{report.drop.author.username}
                        </span>
                      </div>
                    </div>
                    <p className="text-foreground whitespace-pre-wrap text-sm">
                      {report.drop.content}
                    </p>
                  </>
                ) : (
                  <div className="italic text-muted-foreground text-xs">
                    [This drop has already been deleted or removed from the system]
                  </div>
                )}
              </div>

              {report.note && (
                <div className="mt-2.5 text-xs text-muted-foreground italic px-1">
                  Reporter Note: &quot;{report.note}&quot;
                </div>
              )}

              {report.internal_notes && (
                <div className="mt-2 text-xs text-amber-500 font-mono px-1">
                  Internal Moderator Note: &quot;{report.internal_notes}&quot;
                </div>
              )}

              {/* Actions Footer */}
              <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground font-mono">
                  Report ID: {report.id.slice(0, 8)}...
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedReport(report);
                      setInternalNotes(report.internal_notes || "");
                      setReviewDialogOpen(true);
                    }}
                    className="h-8 text-xs gap-1"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Review & Triage
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
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

      {/* Review & Triage Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>Triage Moderation Report</DialogTitle>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="font-semibold text-foreground">Violation Reason:</span>
                  <span className="font-mono text-destructive">{selectedReport.reason}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reported User:</span>
                  <span className="font-mono">
                    @{selectedReport.drop?.author?.username ?? "unknown"}
                  </span>
                </div>
              </div>

              {selectedReport.drop && (
                <div className="rounded-xl border border-border bg-background p-3 text-sm">
                  <p className="text-foreground whitespace-pre-wrap">
                    {selectedReport.drop.content}
                  </p>
                </div>
              )}

              <div>
                <Label className="text-xs">Internal Moderator Notes</Label>
                <Textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Record findings or reasoning for the team..."
                  className="mt-1.5 bg-background text-sm min-h-[70px]"
                />
              </div>

              <div className="pt-2 border-t border-border space-y-2">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Select Action
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      manageMutation.mutate({
                        reportId: selectedReport.id,
                        action: "dismiss",
                        notes: internalNotes || undefined,
                      });
                    }}
                    disabled={manageMutation.isPending}
                    className="h-9 text-xs justify-start"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4 text-muted-foreground" />
                    Dismiss (No Violation)
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      manageMutation.mutate({
                        reportId: selectedReport.id,
                        action: "resolve",
                        notes: internalNotes || undefined,
                      });
                    }}
                    disabled={manageMutation.isPending}
                    className="h-9 text-xs justify-start"
                  >
                    <UserCheck className="mr-2 h-4 w-4 text-emerald-500" />
                    Mark Resolved
                  </Button>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      manageMutation.mutate({
                        reportId: selectedReport.id,
                        action: "delete_content",
                        notes: internalNotes || undefined,
                      });
                    }}
                    disabled={manageMutation.isPending}
                    className="h-9 text-xs justify-start"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove Offending Drop
                  </Button>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      manageMutation.mutate({
                        reportId: selectedReport.id,
                        action: "suspend_user",
                        notes: internalNotes || undefined,
                      });
                    }}
                    disabled={manageMutation.isPending}
                    className="h-9 text-xs justify-start"
                  >
                    <UserX className="mr-2 h-4 w-4" />
                    Suspend Author & Remove
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

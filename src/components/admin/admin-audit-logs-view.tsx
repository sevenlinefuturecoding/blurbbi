import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Search,
  Filter,
  Clock,
  Shield,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchAdminAuditLogs, type AdminAuditLogItem } from "@/lib/admin";
import { timeAgo } from "@/lib/blurbi";

export function AdminAuditLogsView() {
  const [targetType, setTargetType] = useState<
    "user" | "drop" | "report" | "setting" | "feature_flag" | "role" | "announcement" | "all"
  >("all");
  const [page, setPage] = useState(1);
  const limit = 25;

  const [selectedLog, setSelectedLog] = useState<AdminAuditLogItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "audit-logs", { targetType, page, limit }],
    queryFn: () => fetchAdminAuditLogs({ targetType, page, limit }),
  });

  const logs = data?.logs ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(Math.ceil(totalCount / limit), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Administrative Audit Trail
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Immutable, append-only security log of all moderation, configuration, and privilege
            modifications.
          </p>
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          Showing {logs.length} of {totalCount} log entries
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Target Type:</span>
          <Select
            value={targetType}
            onValueChange={(val) => {
              setTargetType(val as typeof targetType);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px] h-9 bg-background text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Targets</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="drop">Drop Content</SelectItem>
              <SelectItem value="report">Moderation Report</SelectItem>
              <SelectItem value="role">Admin Role</SelectItem>
              <SelectItem value="feature_flag">Feature Flag</SelectItem>
              <SelectItem value="setting">Setting</SelectItem>
              <SelectItem value="announcement">Announcement</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground bg-muted/30">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Admin</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Type</th>
                <th className="py-3 px-4">Reason / Details</th>
                <th className="py-3 px-4 text-right">State Diff</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-muted-foreground">
                    Loading security audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-muted-foreground">
                    No audit records recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-4 text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>

                    <td className="py-3 px-4 font-mono text-xs">
                      @{log.admin?.username ?? "system"}
                    </td>

                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px] font-mono uppercase">
                        {log.action_type}
                      </Badge>
                    </td>

                    <td className="py-3 px-4">
                      <Badge variant="secondary" className="text-[10px] font-mono capitalize">
                        {log.target_type}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 text-xs max-w-xs truncate text-foreground/90">
                      {log.reason || "N/A"}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Inspect
                      </Button>
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

      {/* Inspect State Diff Modal */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-mono flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span>Audit Log Detail: {selectedLog?.action_type}</span>
            </DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 py-2 text-xs">
              <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Admin:</span>
                  <span>@{selectedLog.admin?.username ?? "system"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target ID:</span>
                  <span className="text-primary">{selectedLog.target_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Timestamp:</span>
                  <span>{new Date(selectedLog.created_at).toISOString()}</span>
                </div>
                {selectedLog.reason && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reason:</span>
                    <span className="text-foreground">{selectedLog.reason}</span>
                  </div>
                )}
              </div>

              {/* State Diff */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="font-semibold text-muted-foreground font-mono">
                    Previous State:
                  </span>
                  <pre className="rounded-lg bg-background border border-border p-2.5 overflow-x-auto text-[11px] font-mono min-h-[90px]">
                    {selectedLog.previous_state
                      ? JSON.stringify(selectedLog.previous_state, null, 2)
                      : "null"}
                  </pre>
                </div>

                <div className="space-y-1">
                  <span className="font-semibold text-muted-foreground font-mono">New State:</span>
                  <pre className="rounded-lg bg-background border border-border p-2.5 overflow-x-auto text-[11px] font-mono min-h-[90px]">
                    {selectedLog.new_state
                      ? JSON.stringify(selectedLog.new_state, null, 2)
                      : "null"}
                  </pre>
                </div>
              </div>

              {selectedLog.metadata && (
                <div className="space-y-1">
                  <span className="font-semibold text-muted-foreground font-mono">
                    Action Metadata:
                  </span>
                  <pre className="rounded-lg bg-background border border-border p-2.5 overflow-x-auto text-[11px] font-mono">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

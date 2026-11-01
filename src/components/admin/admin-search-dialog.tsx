import { useState, useEffect } from "react";
import { Search, User, MessageSquare, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { globalAdminSearch, type AdminGlobalSearchResults } from "@/lib/admin";

interface AdminSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectUser: (userId: string) => void;
  onSelectDrop: (dropId: string) => void;
  onSelectReport: (reportId: string) => void;
}

export function AdminSearchDialog({
  open,
  onOpenChange,
  onSelectUser,
  onSelectDrop,
  onSelectReport,
}: AdminSearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminGlobalSearchResults>({
    users: [],
    drops: [],
    reports: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults({ users: [], drops: [], reports: [] });
      return;
    }
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults({ users: [], drops: [], reports: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await globalAdminSearch(query);
        setResults(res);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const hasResults =
    results.users.length > 0 || results.drops.length > 0 || results.reports.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden bg-card border-border shadow-2xl">
        <DialogHeader className="p-4 pb-2 border-b border-border">
          <DialogTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
            <span>Global Admin Search</span>
            <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">ESC to close</span>
          </DialogTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users, drop content, reports..."
              className="pl-9 pr-9 h-11 bg-background text-sm"
              autoFocus
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </DialogHeader>

        <div className="max-h-[380px] overflow-y-auto p-4 space-y-4">
          {query.trim().length < 2 && (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Type at least 2 characters to search across users, drops, and reports.
            </div>
          )}

          {query.trim().length >= 2 && !loading && !hasResults && (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No matching records found for &quot;{query}&quot;.
            </div>
          )}

          {/* Users Section */}
          {results.users.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <User className="h-3 w-3" />
                <span>Users ({results.users.length})</span>
              </div>
              <div className="space-y-1">
                {results.users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      onSelectUser(u.id);
                      onOpenChange(false);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/60 text-left transition-colors text-sm group"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-foreground truncate">
                        {u.display_name || u.username}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">@{u.username}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={u.account_status === "active" ? "secondary" : "destructive"}
                        className="text-[10px] capitalize font-mono"
                      >
                        {u.account_status}
                      </Badge>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Drops Section */}
          {results.drops.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="h-3 w-3" />
                <span>Drops ({results.drops.length})</span>
              </div>
              <div className="space-y-1">
                {results.drops.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      onSelectDrop(d.id);
                      onOpenChange(false);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/60 text-left transition-colors text-sm group"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="text-xs text-muted-foreground">@{d.author_username}</div>
                      <div className="text-sm text-foreground line-clamp-1">{d.content}</div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reports Section */}
          {results.reports.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" />
                <span>Reports ({results.reports.length})</span>
              </div>
              <div className="space-y-1">
                {results.reports.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      onSelectReport(r.id);
                      onOpenChange(false);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/60 text-left transition-colors text-sm group"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="font-medium text-foreground text-xs">Reason: {r.reason}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        id: {r.id.slice(0, 8)}...
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {r.status}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

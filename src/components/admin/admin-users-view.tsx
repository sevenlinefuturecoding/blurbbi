import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Filter,
  ShieldAlert,
  ShieldCheck,
  UserX,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  Eye,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Download,
  Users,
  UserCheck,
  SlidersHorizontal,
  ArrowUpDown,
  MoreHorizontal,
  Shield,
  Clock,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  fetchAdminUsersAdvanced,
  restrictUser,
  restoreUser,
  verifyUser,
  bulkRestrictUsers,
  exportUsersToCsv,
  getCurrentAdminRole,
  type AdminUserListItem,
  type AccountStatus,
  type AdminRole,
} from "@/lib/admin";
import { timeAgo } from "@/lib/blurbi";

export function AdminUsersView() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  // Admin Role for Permissions
  const { data: adminRole } = useQuery<AdminRole | null>({
    queryKey: ["admin", "my-role"],
    queryFn: getCurrentAdminRole,
  });

  const canRestrict =
    adminRole === "super_admin" || adminRole === "admin" || adminRole === "moderator";
  const canBan = adminRole === "super_admin" || adminRole === "admin";
  const canVerify = adminRole === "super_admin" || adminRole === "admin";
  const canExport = adminRole !== "analyst";

  // Filter & Pagination State
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AccountStatus | "all">("all");
  const [verified, setVerified] = useState<boolean | "all">("all");
  const [registeredWithin, setRegisteredWithin] = useState<"all" | "today" | "7d" | "30d" | "90d">(
    "all",
  );
  const [sortBy, setSortBy] = useState<
    "created_at" | "followers_count" | "following_count" | "username"
  >("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const limit = 15;

  // Bulk Selection State
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<"warning" | "suspension" | "ban">(
    "suspension",
  );
  const [bulkReason, setBulkReason] = useState("");
  const [bulkNotes, setBulkNotes] = useState("");
  const [bulkDurationHours, setBulkDurationHours] = useState(24);

  // Single Action Dialog State
  const [restrictDialogOpen, setRestrictDialogOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<AdminUserListItem | null>(null);
  const [restrictionType, setRestrictionType] = useState<"warning" | "suspension" | "ban">(
    "suspension",
  );
  const [restrictionReason, setRestrictionReason] = useState("");
  const [restrictionNotes, setRestrictionNotes] = useState("");
  const [suspensionDuration, setSuspensionDuration] = useState<number>(24);

  // Restore Dialog State
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restoreReason, setRestoreReason] = useState("");

  // Query Users List
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [
      "admin",
      "users-advanced",
      { search, status, verified, registeredWithin, sortBy, sortOrder, page, limit },
    ],
    queryFn: () =>
      fetchAdminUsersAdvanced({
        search,
        status,
        verified,
        registeredWithin,
        sortBy,
        sortOrder,
        page,
        limit,
      }),
  });

  const users = data?.users ?? [];
  const totalCount = data?.totalCount ?? 0;
  const activeCount = data?.activeCount ?? 0;
  const restrictedCount = data?.restrictedCount ?? 0;
  const totalPages = Math.max(Math.ceil(totalCount / limit), 1);

  // Mutations
  const restrictMutation = useMutation({
    mutationFn: restrictUser,
    onSuccess: () => {
      toast.success(`User restriction (${restrictionType}) recorded successfully`);
      setRestrictDialogOpen(false);
      setRestrictionReason("");
      setRestrictionNotes("");
      setTargetUser(null);
      qc.invalidateQueries({ queryKey: ["admin", "users-advanced"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to record restriction");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      restoreUser(userId, reason),
    onSuccess: () => {
      toast.success("Account status restored to active");
      setRestoreDialogOpen(false);
      setRestoreReason("");
      setTargetUser(null);
      qc.invalidateQueries({ queryKey: ["admin", "users-advanced"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to restore account");
    },
  });

  const verifyMutation = useMutation({
    mutationFn: ({ userId, isVerified }: { userId: string; isVerified: boolean }) =>
      verifyUser(userId, isVerified),
    onSuccess: (_, vars) => {
      toast.success(`Verification status ${vars.isVerified ? "granted" : "revoked"}`);
      qc.invalidateQueries({ queryKey: ["admin", "users-advanced"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update verification status");
    },
  });

  const bulkRestrictMutation = useMutation({
    mutationFn: bulkRestrictUsers,
    onSuccess: (res) => {
      toast.success(
        `Bulk ${bulkActionType} successfully applied to ${res.processedCount} accounts`,
      );
      setBulkDialogOpen(false);
      setSelectedUserIds([]);
      setBulkReason("");
      setBulkNotes("");
      qc.invalidateQueries({ queryKey: ["admin", "users-advanced"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to execute bulk restriction");
    },
  });

  // Checkbox handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUserIds(users.map((u) => u.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleToggleRow = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const isAllSelected = users.length > 0 && users.every((u) => selectedUserIds.includes(u.id));

  // Export handlers
  const handleExportFiltered = () => {
    if (users.length === 0) {
      toast.error("No users available to export in current filter view");
      return;
    }
    exportUsersToCsv(users, `blurbbi-users-p${page}-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(`Exported ${users.length} users to CSV`);
  };

  const handleExportSelected = () => {
    const selected = users.filter((u) => selectedUserIds.includes(u.id));
    if (selected.length === 0) {
      toast.error("No users selected to export");
      return;
    }
    exportUsersToCsv(selected, `blurbbi-users-selected-${selected.length}.csv`);
    toast.success(`Exported ${selected.length} selected users to CSV`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            User Management & Intelligence
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Centralized directory, security restrictions, account intelligence, and Orbit networks.
          </p>
        </div>

        {/* Header Badges & Export */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono py-1 px-2.5 gap-1.5 border-border">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-bold text-foreground">{totalCount}</span>
          </Badge>
          <Badge
            variant="outline"
            className="text-xs font-mono py-1 px-2.5 gap-1.5 border-emerald-500/30 text-emerald-500 bg-emerald-500/5"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Active: {activeCount}</span>
          </Badge>
          <Badge
            variant="outline"
            className="text-xs font-mono py-1 px-2.5 gap-1.5 border-amber-500/30 text-amber-500 bg-amber-500/5"
          >
            <span>Restricted: {restrictedCount}</span>
          </Badge>

          {canExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportFiltered}
              className="h-8 text-xs gap-1.5 shadow-sm"
              title="Export current page to CSV"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by @username or display name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 text-xs h-9 bg-background"
            />
          </div>

          {/* Account Status Filter */}
          <div>
            <Select
              value={status}
              onValueChange={(val) => {
                setStatus(val as AccountStatus | "all");
                setPage(1);
              }}
            >
              <SelectTrigger className="text-xs h-9 bg-background">
                <SelectValue placeholder="Status: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="warned">Warned</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Verification Filter */}
          <div>
            <Select
              value={verified === "all" ? "all" : verified ? "verified" : "unverified"}
              onValueChange={(val) => {
                setVerified(val === "all" ? "all" : val === "verified");
                setPage(1);
              }}
            >
              <SelectTrigger className="text-xs h-9 bg-background">
                <SelectValue placeholder="Verification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Verification</SelectItem>
                <SelectItem value="verified">Verified Only</SelectItem>
                <SelectItem value="unverified">Unverified Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Registration Date Filter */}
          <div>
            <Select
              value={registeredWithin}
              onValueChange={(val) => {
                setRegisteredWithin(val as typeof registeredWithin);
                setPage(1);
              }}
            >
              <SelectTrigger className="text-xs h-9 bg-background">
                <SelectValue placeholder="Registration Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Joined Today</SelectItem>
                <SelectItem value="7d">Past 7 Days</SelectItem>
                <SelectItem value="30d">Past 30 Days</SelectItem>
                <SelectItem value="90d">Past 90 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Secondary Toolbar: Sorting & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">Sort By:</span>
            <button
              onClick={() => {
                setSortBy("created_at");
                setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors ${
                sortBy === "created_at"
                  ? "border-primary text-primary bg-primary/5"
                  : "border-border hover:bg-muted"
              }`}
            >
              Joined Date
              <ArrowUpDown className="h-3 w-3" />
            </button>
            <button
              onClick={() => {
                setSortBy("followers_count");
                setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors ${
                sortBy === "followers_count"
                  ? "border-primary text-primary bg-primary/5"
                  : "border-border hover:bg-muted"
              }`}
            >
              Orbiters
              <ArrowUpDown className="h-3 w-3" />
            </button>
            <button
              onClick={() => {
                setSortBy("username");
                setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
              }}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors ${
                sortBy === "username"
                  ? "border-primary text-primary bg-primary/5"
                  : "border-border hover:bg-muted"
              }`}
            >
              Username
              <ArrowUpDown className="h-3 w-3" />
            </button>
          </div>

          {(search || status !== "all" || verified !== "all" || registeredWithin !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatus("all");
                setVerified("all");
                setRegisteredWithin("all");
                setPage(1);
              }}
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Action Bar (when rows selected) */}
      {selectedUserIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-primary/40 bg-primary/5 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {selectedUserIds.length}
            </span>
            <span>Accounts selected</span>
          </div>

          <div className="flex items-center gap-2">
            {canExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportSelected}
                className="h-7 text-xs gap-1.5 bg-background"
              >
                <Download className="h-3.5 w-3.5" />
                Export Selected
              </Button>
            )}

            {canRestrict && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDialogOpen(true)}
                className="h-7 text-xs gap-1.5"
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                Bulk Restrict
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedUserIds([])}
              className="h-7 text-xs text-muted-foreground"
            >
              Deselect All
            </Button>
          </div>
        </div>
      )}

      {/* Users Data Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground font-medium">
                <th className="py-3 px-4 w-10">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all on this page"
                  />
                </th>
                <th className="py-3 px-3">Blurber</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Verification</th>
                <th className="py-3 px-3 text-right">Drops</th>
                <th className="py-3 px-3 text-right">Orbiters</th>
                <th className="py-3 px-3">Joined</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span>Loading user directory...</span>
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-destructive">
                    <AlertTriangle className="h-6 w-6 mx-auto mb-2 opacity-80" />
                    <span>Failed to load user directory. Please refresh.</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <UserX className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium text-foreground">No accounts found</p>
                    <p className="text-[11px] mt-0.5">Try adjusting your search or filters.</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelected = selectedUserIds.includes(u.id);
                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-muted/30 transition-colors ${
                        isSelected ? "bg-primary/5" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleRow(u.id)}
                          aria-label={`Select ${u.username}`}
                        />
                      </td>

                      {/* User Profile */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <BlurbiAvatar emoji={u.avatar_emoji} color={u.avatar_color} size="sm" />
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate max-w-[160px] flex items-center gap-1">
                              <span>{u.display_name || u.username}</span>
                              {u.is_verified && (
                                <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono truncate">
                              @{u.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <StatusBadge status={u.account_status} suspendedUntil={u.suspended_until} />
                        {u.warning_count > 0 && u.account_status !== "banned" && (
                          <span className="block text-[10px] text-amber-500 font-mono mt-0.5">
                            {u.warning_count} warning{u.warning_count > 1 ? "s" : ""}
                          </span>
                        )}
                      </td>

                      {/* Verification */}
                      <td className="py-3 px-3">
                        {u.is_verified ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-primary/30 text-primary gap-1"
                          >
                            <BadgeCheck className="h-3 w-3" />
                            Verified
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">Unverified</span>
                        )}
                      </td>

                      {/* Drops */}
                      <td className="py-3 px-3 text-right font-mono font-medium">
                        {(u.drops_count ?? u.total_drops ?? 0).toLocaleString()}
                      </td>

                      {/* Orbiters */}
                      <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                        {(u.followers_count ?? 0).toLocaleString()}
                      </td>

                      {/* Joined Date */}
                      <td className="py-3 px-3 text-muted-foreground">
                        <span title={new Date(u.created_at).toLocaleString()}>
                          {timeAgo(u.created_at)}
                        </span>
                      </td>

                      {/* Actions Menu */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Inspect Shortcut Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate({ to: `/admin/users/${u.id}` })}
                            className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
                            title="Open detailed user intelligence workspace"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Inspect
                          </Button>

                          {/* Overflow Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="text-xs w-48">
                              <DropdownMenuLabel>Account Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => navigate({ to: `/admin/users/${u.id}` })}
                                className="gap-2 cursor-pointer"
                              >
                                <Eye className="h-3.5 w-3.5 text-primary" />
                                Inspect Account
                              </DropdownMenuItem>

                              <DropdownMenuItem asChild>
                                <a
                                  href={`/u/${u.username}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="gap-2 cursor-pointer flex items-center"
                                >
                                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                  View Public Profile
                                </a>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              {/* Safety / Restrict options */}
                              {canRestrict && u.account_status !== "banned" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setTargetUser(u);
                                      setRestrictionType("warning");
                                      setRestrictDialogOpen(true);
                                    }}
                                    className="gap-2 cursor-pointer text-amber-500 focus:text-amber-500"
                                  >
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    Issue Warning
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => {
                                      setTargetUser(u);
                                      setRestrictionType("suspension");
                                      setRestrictDialogOpen(true);
                                    }}
                                    className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                                  >
                                    <Clock className="h-3.5 w-3.5" />
                                    Suspend Account
                                  </DropdownMenuItem>
                                </>
                              )}

                              {canBan && u.account_status !== "banned" && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setTargetUser(u);
                                    setRestrictionType("ban");
                                    setRestrictDialogOpen(true);
                                  }}
                                  className="gap-2 cursor-pointer text-destructive focus:text-destructive font-medium"
                                >
                                  <UserX className="h-3.5 w-3.5" />
                                  Permanent Ban
                                </DropdownMenuItem>
                              )}

                              {canRestrict && u.account_status !== "active" && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setTargetUser(u);
                                    setRestoreDialogOpen(true);
                                  }}
                                  className="gap-2 cursor-pointer text-emerald-500 focus:text-emerald-500"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Restore to Active
                                </DropdownMenuItem>
                              )}

                              {canVerify && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      verifyMutation.mutate({
                                        userId: u.id,
                                        isVerified: !u.is_verified,
                                      })
                                    }
                                    className="gap-2 cursor-pointer"
                                  >
                                    <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                                    {u.is_verified ? "Revoke Verification" : "Grant Verification"}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border bg-card text-xs text-muted-foreground">
          <div>
            Showing <span className="font-medium text-foreground">{users.length}</span> of{" "}
            <span className="font-medium text-foreground">{totalCount}</span> accounts
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="h-8 text-xs gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>

            <span className="px-3 font-mono text-[11px]">
              Page {page} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 text-xs gap-1"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Single Account Restrict Dialog */}
      {targetUser && (
        <Dialog open={restrictDialogOpen} onOpenChange={setRestrictDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <ShieldAlert className="h-5 w-5 text-destructive" />
                Restrict Account: @{targetUser.username}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Administrative restriction actions are enforced at the database level and recorded
                to the immutable audit trail.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="restriction-type">Action Type</Label>
                <Select
                  value={restrictionType}
                  onValueChange={(val) =>
                    setRestrictionType(val as "warning" | "suspension" | "ban")
                  }
                >
                  <SelectTrigger id="restriction-type" className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warning">Official Warning</SelectItem>
                    <SelectItem value="suspension">Temporary Suspension</SelectItem>
                    {canBan && <SelectItem value="ban">Permanent Ban</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              {restrictionType === "suspension" && (
                <div className="space-y-1.5">
                  <Label htmlFor="suspension-duration">Suspension Duration (Hours)</Label>
                  <Input
                    id="suspension-duration"
                    type="number"
                    min="1"
                    max="720"
                    value={suspensionDuration}
                    onChange={(e) => setSuspensionDuration(parseInt(e.target.value) || 24)}
                    className="text-xs h-9"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Common intervals: 24h (1 day), 72h (3 days), 168h (1 week).
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="restriction-reason">Mandatory Reason (Audited)</Label>
                <Input
                  id="restriction-reason"
                  placeholder="e.g. Terms violation, targeted spam, harassment"
                  value={restrictionReason}
                  onChange={(e) => setRestrictionReason(e.target.value)}
                  className="text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="restriction-notes">Internal Administrator Notes (Optional)</Label>
                <Textarea
                  id="restriction-notes"
                  placeholder="Additional context for other moderators..."
                  value={restrictionNotes}
                  onChange={(e) => setRestrictionNotes(e.target.value)}
                  className="text-xs min-h-[60px]"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRestrictDialogOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={!restrictionReason.trim() || restrictMutation.isPending}
                onClick={() =>
                  restrictMutation.mutate({
                    userId: targetUser.id,
                    type: restrictionType,
                    reason: restrictionReason.trim(),
                    notes: restrictionNotes.trim() || null,
                    durationHours: restrictionType === "suspension" ? suspensionDuration : null,
                  })
                }
                className="text-xs gap-1.5"
              >
                {restrictMutation.isPending ? "Applying..." : `Execute ${restrictionType}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Restore Account Dialog */}
      {targetUser && (
        <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base text-emerald-500">
                <CheckCircle2 className="h-5 w-5" />
                Restore Account: @{targetUser.username}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Restoring clears all active suspensions and bans, returning the account to Active
                status.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="restore-reason">Restoration Reason (Mandatory Audit)</Label>
                <Input
                  id="restore-reason"
                  placeholder="e.g. Appeal approved, mistake rectified, restriction served"
                  value={restoreReason}
                  onChange={(e) => setRestoreReason(e.target.value)}
                  className="text-xs h-9"
                  required
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRestoreDialogOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!restoreReason.trim() || restoreMutation.isPending}
                onClick={() =>
                  restoreMutation.mutate({
                    userId: targetUser.id,
                    reason: restoreReason.trim(),
                  })
                }
                className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {restoreMutation.isPending ? "Restoring..." : "Restore Account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Restrict Modal */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Bulk Restrict {selectedUserIds.length} Accounts
            </DialogTitle>
            <DialogDescription className="text-xs">
              This action will individually restrict each of the selected accounts and log an
              individual entry to the audit trail.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive space-y-1 text-xs">
              <span className="font-semibold block">Preview of affected accounts:</span>
              <div className="max-h-20 overflow-y-auto font-mono text-[11px] space-y-0.5">
                {users
                  .filter((u) => selectedUserIds.includes(u.id))
                  .map((u) => (
                    <div key={u.id}>
                      • @{u.username} ({u.display_name})
                    </div>
                  ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bulk-type">Bulk Action Type</Label>
              <Select
                value={bulkActionType}
                onValueChange={(val) => setBulkActionType(val as "warning" | "suspension" | "ban")}
              >
                <SelectTrigger id="bulk-type" className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warning">Bulk Warning</SelectItem>
                  <SelectItem value="suspension">Bulk Temporary Suspension</SelectItem>
                  {canBan && <SelectItem value="ban">Bulk Permanent Ban</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            {bulkActionType === "suspension" && (
              <div className="space-y-1.5">
                <Label htmlFor="bulk-duration">Suspension Duration (Hours)</Label>
                <Input
                  id="bulk-duration"
                  type="number"
                  min="1"
                  max="720"
                  value={bulkDurationHours}
                  onChange={(e) => setBulkDurationHours(parseInt(e.target.value) || 24)}
                  className="text-xs h-9"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="bulk-reason">Mandatory Operational Reason</Label>
              <Input
                id="bulk-reason"
                placeholder="e.g. Coordinated spam wave, botnet activity"
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bulk-notes">Internal Notes</Label>
              <Textarea
                id="bulk-notes"
                placeholder="Additional audit context..."
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
                className="text-xs min-h-[50px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkDialogOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!bulkReason.trim() || bulkRestrictMutation.isPending}
              onClick={() =>
                bulkRestrictMutation.mutate({
                  userIds: selectedUserIds,
                  type: bulkActionType,
                  reason: bulkReason.trim(),
                  notes: bulkNotes.trim() || null,
                  durationHours: bulkActionType === "suspension" ? bulkDurationHours : null,
                })
              }
              className="text-xs gap-1.5"
            >
              {bulkRestrictMutation.isPending ? "Processing..." : `Confirm Bulk ${bulkActionType}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({
  status,
  suspendedUntil,
}: {
  status: AccountStatus;
  suspendedUntil?: string | null;
}) {
  switch (status) {
    case "active":
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/30 text-emerald-500 bg-emerald-500/5 text-[10px] uppercase font-mono"
        >
          Active
        </Badge>
      );
    case "warned":
      return (
        <Badge
          variant="outline"
          className="border-amber-500/30 text-amber-500 bg-amber-500/5 text-[10px] uppercase font-mono"
        >
          Warned
        </Badge>
      );
    case "suspended":
      return (
        <Badge
          variant="outline"
          className="border-destructive/30 text-destructive bg-destructive/5 text-[10px] uppercase font-mono"
        >
          Suspended
        </Badge>
      );
    case "banned":
      return (
        <Badge variant="destructive" className="text-[10px] uppercase font-mono">
          Banned
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-[10px] uppercase font-mono">
          {status}
        </Badge>
      );
  }
}

import { useState } from "react";
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
  User,
  Clock,
  Sparkles,
  MessageSquare,
  Repeat2,
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
import { Textarea } from "@/components/ui/textarea";
import { BlurbiAvatar } from "@/components/blurbi/blurbi-avatar";
import {
  fetchAdminUsers,
  fetchAdminUserDetail,
  restrictUser,
  restoreUser,
  verifyUser,
  type AdminUserListItem,
  type AdminUserDetail,
  type AccountStatus,
} from "@/lib/admin";
import { timeAgo } from "@/lib/blurbi";

export function AdminUsersView() {
  const qc = useQueryClient();

  // Filter & Pagination State
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AccountStatus | "all">("all");
  const [verified, setVerified] = useState<boolean | "all">("all");
  const [page, setPage] = useState(1);
  const limit = 15;

  // Selected User for Detail Drawer / Actions
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Restriction Dialog State
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
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", { search, status, verified, page, limit }],
    queryFn: () =>
      fetchAdminUsers({
        search,
        status,
        verified,
        page,
        limit,
      }),
  });

  // Query User Detail
  const userDetailQuery = useQuery({
    queryKey: ["admin", "user-detail", selectedUserId],
    enabled: !!selectedUserId,
    queryFn: () => fetchAdminUserDetail(selectedUserId!),
  });

  // Mutations
  const restrictMutation = useMutation({
    mutationFn: restrictUser,
    onSuccess: () => {
      toast.success(`User restriction (${restrictionType}) recorded successfully`);
      setRestrictDialogOpen(false);
      setRestrictionReason("");
      setRestrictionNotes("");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      if (selectedUserId) {
        qc.invalidateQueries({ queryKey: ["admin", "user-detail", selectedUserId] });
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to record restriction");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      restoreUser(userId, reason),
    onSuccess: () => {
      toast.success("User account restored to active status");
      setRestoreDialogOpen(false);
      setRestoreReason("");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      if (selectedUserId) {
        qc.invalidateQueries({ queryKey: ["admin", "user-detail", selectedUserId] });
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to restore user");
    },
  });

  const verifyMutation = useMutation({
    mutationFn: ({ userId, isVerified }: { userId: string; isVerified: boolean }) =>
      verifyUser(userId, isVerified),
    onSuccess: (_, vars) => {
      toast.success(`User verification ${vars.isVerified ? "granted" : "revoked"}`);
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      if (selectedUserId) {
        qc.invalidateQueries({ queryKey: ["admin", "user-detail", selectedUserId] });
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Verification update failed");
    },
  });

  const users = data?.users ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(Math.ceil(totalCount / limit), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            User Management
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Search, inspect, verify, warn, suspend, or ban registered blurbers.
          </p>
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          Showing {users.length} of {totalCount} users
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by username or display name..."
            className="pl-9 bg-background h-10 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <Select
            value={status}
            onValueChange={(val) => {
              setStatus(val as AccountStatus | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px] h-10 bg-background text-xs">
              <SelectValue placeholder="Status: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Status: All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="warned">Warned</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="banned">Banned</SelectItem>
            </SelectContent>
          </Select>

          {/* Verified Filter */}
          <Select
            value={String(verified)}
            onValueChange={(val) => {
              setVerified(val === "all" ? "all" : val === "true");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px] h-10 bg-background text-xs">
              <SelectValue placeholder="Verified: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Verified: All</SelectItem>
              <SelectItem value="true">Verified Only</SelectItem>
              <SelectItem value="false">Unverified</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground bg-muted/30">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Verification</th>
                <th className="py-3 px-4">Orbiters</th>
                <th className="py-3 px-4">Joined</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    Loading users directory...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    No blurbers match the search criteria.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <BlurbiAvatar
                          emoji={user.avatar_emoji}
                          color={user.avatar_color}
                          size="md"
                        />
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate flex items-center gap-1.5">
                            <span>{user.display_name || user.username}</span>
                            {user.is_verified && (
                              <BadgeCheck className="h-4 w-4 text-primary fill-primary/20 shrink-0" />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            @{user.username}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          user.account_status === "active"
                            ? "secondary"
                            : user.account_status === "warned"
                              ? "outline"
                              : "destructive"
                        }
                        className="text-[11px] capitalize font-mono"
                      >
                        {user.account_status}
                        {user.warning_count > 0 && user.account_status !== "banned" && (
                          <span className="ml-1 text-[10px]">({user.warning_count}w)</span>
                        )}
                      </Badge>
                    </td>

                    <td className="py-3 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          verifyMutation.mutate({
                            userId: user.id,
                            isVerified: !user.is_verified,
                          })
                        }
                        className="h-7 text-xs gap-1"
                      >
                        <BadgeCheck
                          className={`h-4 w-4 ${
                            user.is_verified
                              ? "text-primary fill-primary/20"
                              : "text-muted-foreground"
                          }`}
                        />
                        {user.is_verified ? "Verified" : "Unverified"}
                      </Button>
                    </td>

                    <td className="py-3 px-4 font-mono text-xs">{user.followers_count}</td>

                    <td className="py-3 px-4 text-xs text-muted-foreground font-mono">
                      {timeAgo(user.created_at)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedUserId(user.id)}
                          className="h-8 text-xs gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Inspect
                        </Button>

                        {user.account_status === "suspended" || user.account_status === "banned" ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setTargetUser(user);
                              setRestoreDialogOpen(true);
                            }}
                            className="h-8 text-xs text-emerald-500 hover:text-emerald-400 gap-1"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Restore
                          </Button>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setTargetUser(user);
                              setRestrictDialogOpen(true);
                            }}
                            className="h-8 text-xs gap-1"
                          >
                            <ShieldAlert className="h-3.5 w-3.5" />
                            Restrict
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

      {/* User Inspection Modal */}
      <Dialog open={!!selectedUserId} onOpenChange={(open) => !open && setSelectedUserId(null)}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Blurber Profile Inspection</span>
              {userDetailQuery.data?.is_verified && (
                <Badge variant="outline" className="text-primary border-primary/30 text-xs">
                  Verified Creator
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {userDetailQuery.isLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Loading profile details...
            </div>
          ) : userDetailQuery.data ? (
            <div className="space-y-5">
              {/* Profile Card Header */}
              <div className="flex items-start gap-4 rounded-xl bg-muted/40 p-4 border border-border/70">
                <BlurbiAvatar
                  emoji={userDetailQuery.data.avatar_emoji}
                  color={userDetailQuery.data.avatar_color}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-foreground">
                      {userDetailQuery.data.display_name || userDetailQuery.data.username}
                    </h3>
                    <Badge
                      variant={
                        userDetailQuery.data.account_status === "active"
                          ? "secondary"
                          : "destructive"
                      }
                      className="text-[10px] font-mono capitalize"
                    >
                      {userDetailQuery.data.account_status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    @{userDetailQuery.data.username}
                  </div>
                  {userDetailQuery.data.bio && (
                    <p className="mt-2 text-xs text-foreground/90">{userDetailQuery.data.bio}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
                    <span>
                      Joined: {new Date(userDetailQuery.data.created_at).toLocaleDateString()}
                    </span>
                    {userDetailQuery.data.location && (
                      <span>Location: {userDetailQuery.data.location}</span>
                    )}
                    {userDetailQuery.data.website && (
                      <a
                        href={userDetailQuery.data.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        {userDetailQuery.data.website}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Engagement Stats Grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono text-center">
                <div className="rounded-xl border border-border p-3">
                  <div className="text-xs text-muted-foreground">Total Drops</div>
                  <div className="text-xl font-bold mt-1">{userDetailQuery.data.total_drops}</div>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <div className="text-xs text-muted-foreground">Sparks Received</div>
                  <div className="text-xl font-bold mt-1 text-primary">
                    +{userDetailQuery.data.total_sparks_received}
                  </div>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <div className="text-xs text-muted-foreground">Orbiters</div>
                  <div className="text-xl font-bold mt-1">
                    {userDetailQuery.data.followers_count}
                  </div>
                </div>
                <div className="rounded-xl border border-border p-3">
                  <div className="text-xs text-muted-foreground">Orbiting</div>
                  <div className="text-xl font-bold mt-1">
                    {userDetailQuery.data.following_count}
                  </div>
                </div>
              </div>

              {/* Restriction & Moderation History */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Restriction & Warning History ({userDetailQuery.data.restrictions.length})
                </h4>

                {userDetailQuery.data.restrictions.length === 0 ? (
                  <div className="rounded-xl border border-border/60 p-4 text-center text-xs text-muted-foreground">
                    Clean record: No warnings or restrictions have been issued for this account.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {userDetailQuery.data.restrictions.map((res) => (
                      <div
                        key={res.id}
                        className={`rounded-lg border p-3 text-xs ${
                          res.is_active
                            ? "border-destructive/40 bg-destructive/5"
                            : "border-border/60 bg-muted/20 opacity-70"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold uppercase text-destructive font-mono text-[10px]">
                            {res.type}
                          </span>
                          <span className="text-muted-foreground font-mono">
                            {timeAgo(res.created_at)}
                          </span>
                        </div>
                        <div className="mt-1 font-medium">{res.reason}</div>
                        {res.internal_notes && (
                          <div className="mt-0.5 text-muted-foreground italic">
                            Notes: &quot;{res.internal_notes}&quot;
                          </div>
                        )}
                        {res.expires_at && (
                          <div className="mt-1 text-[11px] text-muted-foreground font-mono">
                            Expires: {new Date(res.expires_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => setSelectedUserId(null)}>
                  Close
                </Button>
                {userDetailQuery.data.account_status === "active" ||
                userDetailQuery.data.account_status === "warned" ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setTargetUser(userDetailQuery.data as AdminUserListItem);
                      setRestrictDialogOpen(true);
                    }}
                  >
                    Restrict Account
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setTargetUser(userDetailQuery.data as AdminUserListItem);
                      setRestoreDialogOpen(true);
                    }}
                    className="text-emerald-500"
                  >
                    Restore Account
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Restrict User Dialog (Warn, Suspend, Ban) */}
      <Dialog open={restrictDialogOpen} onOpenChange={setRestrictDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              <span>Restrict User: @{targetUser?.username}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Restriction Action</Label>
              <Select
                value={restrictionType}
                onValueChange={(val) => setRestrictionType(val as "warning" | "suspension" | "ban")}
              >
                <SelectTrigger className="mt-1.5 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warning">Official Warning (Informative notice)</SelectItem>
                  <SelectItem value="suspension">Temporary Suspension (Time-bound lock)</SelectItem>
                  <SelectItem value="ban">Permanent Ban (Complete lock)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {restrictionType === "suspension" && (
              <div>
                <Label className="text-xs">Suspension Duration</Label>
                <Select
                  value={String(suspensionDuration)}
                  onValueChange={(val) => setSuspensionDuration(Number(val))}
                >
                  <SelectTrigger className="mt-1.5 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">24 Hours</SelectItem>
                    <SelectItem value="72">72 Hours (3 Days)</SelectItem>
                    <SelectItem value="168">7 Days (1 Week)</SelectItem>
                    <SelectItem value="720">30 Days (1 Month)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="text-xs">Official Reason (Required)</Label>
              <Input
                value={restrictionReason}
                onChange={(e) => setRestrictionReason(e.target.value)}
                placeholder="e.g. Repeated harassment, spamming links..."
                className="mt-1.5 bg-background text-sm"
              />
            </div>

            <div>
              <Label className="text-xs">Internal Moderator Notes (Optional)</Label>
              <Textarea
                value={restrictionNotes}
                onChange={(e) => setRestrictionNotes(e.target.value)}
                placeholder="Internal context for other administrators..."
                className="mt-1.5 bg-background text-sm min-h-[70px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRestrictDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!restrictionReason.trim() || restrictMutation.isPending}
              onClick={() => {
                if (!targetUser) return;
                restrictMutation.mutate({
                  userId: targetUser.id,
                  type: restrictionType,
                  reason: restrictionReason,
                  notes: restrictionNotes,
                  durationHours: restrictionType === "suspension" ? suspensionDuration : undefined,
                });
              }}
            >
              {restrictMutation.isPending ? "Executing..." : `Confirm ${restrictionType}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore User Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-500">
              <RotateCcw className="h-5 w-5" />
              <span>Restore Account: @{targetUser?.username}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              This will restore the account status to <strong>active</strong>, re-enabling drop
              creation and un-hiding their profile across platform feeds.
            </p>

            <div>
              <Label className="text-xs">Reason for Restoration</Label>
              <Input
                value={restoreReason}
                onChange={(e) => setRestoreReason(e.target.value)}
                placeholder="e.g. Successful appeal, suspension time completed..."
                className="mt-1.5 bg-background text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              disabled={!restoreReason.trim() || restoreMutation.isPending}
              onClick={() => {
                if (!targetUser) return;
                restoreMutation.mutate({
                  userId: targetUser.id,
                  reason: restoreReason,
                });
              }}
            >
              {restoreMutation.isPending ? "Restoring..." : "Confirm Restoration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

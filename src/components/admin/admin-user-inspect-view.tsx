import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgeCheck,
  ShieldAlert,
  ShieldCheck,
  Clock,
  UserX,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Repeat2,
  Users,
  Calendar,
  Globe,
  MapPin,
  Flag,
  FileText,
  Activity,
  History,
  Shield,
  Layers,
  Heart,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BlurbiAvatar } from "@/components/blurbi/blurbi-avatar";
import {
  fetchUserIntelligence,
  fetchUserTimeline,
  fetchUserOrbitNetwork,
  restrictUser,
  restoreUser,
  verifyUser,
  getCurrentAdminRole,
  type AccountStatus,
  type AdminRole,
} from "@/lib/admin";
import { timeAgo } from "@/lib/blurbi";

interface AdminUserInspectViewProps {
  userId: string;
}

export function AdminUserInspectView({ userId }: AdminUserInspectViewProps) {
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

  // Active Tab State
  const [activeTab, setActiveTab] = useState("overview");

  // Single Action Dialog State
  const [restrictDialogOpen, setRestrictDialogOpen] = useState(false);
  const [restrictionType, setRestrictionType] = useState<"warning" | "suspension" | "ban">(
    "suspension",
  );
  const [restrictionReason, setRestrictionReason] = useState("");
  const [restrictionNotes, setRestrictionNotes] = useState("");
  const [suspensionDuration, setSuspensionDuration] = useState<number>(24);

  // Restore Dialog State
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restoreReason, setRestoreReason] = useState("");

  // Network Sub-tab State
  const [networkType, setNetworkType] = useState<"orbiters" | "orbiting">("orbiters");
  const [networkSearch, setNetworkSearch] = useState("");
  const [networkPage, setNetworkPage] = useState(1);

  // Query 1: Comprehensive User Intelligence
  const {
    data: intel,
    isLoading: intelLoading,
    isError: intelError,
  } = useQuery({
    queryKey: ["admin", "user-intelligence", userId],
    queryFn: () => fetchUserIntelligence(userId),
    enabled: !!userId,
  });

  // Query 2: Chronological Activity Timeline
  const { data: timeline = [], isLoading: timelineLoading } = useQuery({
    queryKey: ["admin", "user-timeline", userId],
    queryFn: () => fetchUserTimeline(userId, 50),
    enabled: !!userId && activeTab === "activity",
  });

  // Query 3: Orbit Network
  const { data: networkData, isLoading: networkLoading } = useQuery({
    queryKey: ["admin", "user-network", userId, networkType, networkSearch, networkPage],
    queryFn: () => fetchUserOrbitNetwork(userId, networkType, networkSearch, networkPage, 20),
    enabled: !!userId && activeTab === "network",
  });

  // Mutations
  const restrictMutation = useMutation({
    mutationFn: restrictUser,
    onSuccess: () => {
      toast.success(`User restriction (${restrictionType}) applied successfully`);
      setRestrictDialogOpen(false);
      setRestrictionReason("");
      setRestrictionNotes("");
      qc.invalidateQueries({ queryKey: ["admin", "user-intelligence", userId] });
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
      toast.success("Account status successfully restored to active");
      setRestoreDialogOpen(false);
      setRestoreReason("");
      qc.invalidateQueries({ queryKey: ["admin", "user-intelligence", userId] });
      qc.invalidateQueries({ queryKey: ["admin", "users-advanced"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to restore account");
    },
  });

  const verifyMutation = useMutation({
    mutationFn: ({ isVerified }: { isVerified: boolean }) => verifyUser(userId, isVerified),
    onSuccess: (_, vars) => {
      toast.success(`Verification status ${vars.isVerified ? "granted" : "revoked"}`);
      qc.invalidateQueries({ queryKey: ["admin", "user-intelligence", userId] });
      qc.invalidateQueries({ queryKey: ["admin", "users-advanced"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update verification status");
    },
  });

  if (intelLoading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
        <p className="text-xs text-muted-foreground">Loading user intelligence profile...</p>
      </div>
    );
  }

  if (intelError || !intel) {
    return (
      <div className="py-24 text-center space-y-3">
        <UserX className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
        <h2 className="text-base font-semibold">User Not Found or Unauthorized</h2>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          The requested user profile does not exist or you lack administrative authorization to
          inspect it.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate({ to: "/admin/users" })}
          className="text-xs mt-2"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Back to Directory
        </Button>
      </div>
    );
  }

  const { profile, metrics, recent_drops, restrictions, audit_history, reports } = intel;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Back Action */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/admin/users" })}
          className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to User Directory
        </Button>

        <div className="flex items-center gap-2">
          <a href={`/u/${profile.username}`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              Public Profile
            </Button>
          </a>
        </div>
      </div>

      {/* User Header Profile Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Avatar & Identification */}
          <div className="flex items-start gap-4">
            <BlurbiAvatar
              emoji={profile.avatar_emoji}
              color={profile.avatar_color}
              size="lg"
              className="h-16 w-16 text-3xl"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  {profile.display_name || profile.username}
                </h1>
                {profile.is_verified && (
                  <Badge
                    variant="outline"
                    className="border-primary/40 text-primary gap-1 text-[11px]"
                  >
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Verified
                  </Badge>
                )}
                <StatusBadge
                  status={profile.account_status}
                  suspendedUntil={profile.suspended_until}
                />
                {profile.admin_role && (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono uppercase border-indigo-500/40 text-indigo-400 bg-indigo-500/5"
                  >
                    {profile.admin_role}
                  </Badge>
                )}
              </div>

              <div className="text-xs text-muted-foreground font-mono">@{profile.username}</div>

              {profile.bio && (
                <p className="text-xs text-foreground/90 max-w-xl pt-1 line-clamp-2">
                  {profile.bio}
                </p>
              )}

              {/* Metadata Pills */}
              <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  Joined {new Date(profile.created_at).toLocaleDateString()} (
                  {metrics.account_age_days}d ago)
                </span>
                {profile.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    {profile.location}
                  </span>
                )}
                {profile.website && (
                  <a
                    href={
                      profile.website.startsWith("http")
                        ? profile.website
                        : `https://${profile.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Website
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Administrative Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 md:self-start">
            {canRestrict && profile.account_status !== "banned" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRestrictionType("warning");
                    setRestrictDialogOpen(true);
                  }}
                  className="h-8 text-xs gap-1.5 border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Warn
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRestrictionType("suspension");
                    setRestrictDialogOpen(true);
                  }}
                  className="h-8 text-xs gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Suspend
                </Button>
              </>
            )}

            {canBan && profile.account_status !== "banned" && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setRestrictionType("ban");
                  setRestrictDialogOpen(true);
                }}
                className="h-8 text-xs gap-1.5"
              >
                <UserX className="h-3.5 w-3.5" />
                Permanent Ban
              </Button>
            )}

            {canRestrict && profile.account_status !== "active" && (
              <Button
                size="sm"
                onClick={() => setRestoreDialogOpen(true)}
                className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Restore Account
              </Button>
            )}

            {canVerify && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => verifyMutation.mutate({ isVerified: !profile.is_verified })}
                className="h-8 text-xs gap-1.5"
              >
                <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                {profile.is_verified ? "Revoke Verification" : "Grant Verification"}
              </Button>
            )}
          </div>
        </div>

        {/* Suspended/Banned Notice Banner */}
        {profile.account_status !== "active" && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-semibold uppercase tracking-wide">
                Account Status: {profile.account_status}
              </div>
              <p className="text-muted-foreground text-[11px]">
                {profile.account_status === "suspended" && profile.suspended_until && (
                  <span>
                    Suspension active until{" "}
                    <strong>{new Date(profile.suspended_until).toLocaleString()}</strong>.
                  </span>
                )}
                {profile.account_status === "banned" && profile.ban_reason && (
                  <span>Reason recorded: {profile.ban_reason}.</span>
                )}
                {profile.account_status === "warned" && (
                  <span>Account holds {profile.warning_count} active warning(s).</span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* User Analytics KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-border bg-card p-3.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total Drops</span>
            <MessageSquare className="h-3.5 w-3.5 text-sky-500" />
          </div>
          <div className="mt-1.5 text-xl font-bold font-mono">
            {metrics.total_drops.toLocaleString()}
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            ~{metrics.posting_frequency_weekly}/wk
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Orbiters</span>
            <Users className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="mt-1.5 text-xl font-bold font-mono">
            {metrics.total_orbiters.toLocaleString()}
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">Followers</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Orbiting</span>
            <Repeat2 className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="mt-1.5 text-xl font-bold font-mono">
            {metrics.total_orbiting.toLocaleString()}
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">Following</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Sparks Recv</span>
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="mt-1.5 text-xl font-bold font-mono">
            {metrics.total_sparks_received.toLocaleString()}
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">Likes received</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Echoes Recv</span>
            <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <div className="mt-1.5 text-xl font-bold font-mono">
            {metrics.total_echoes_received.toLocaleString()}
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">Comments</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Relays Recv</span>
            <Repeat2 className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="mt-1.5 text-xl font-bold font-mono">
            {metrics.total_relays_received.toLocaleString()}
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">Shares</div>
        </div>
      </div>

      {/* 8 Detail Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/60 p-1 flex-wrap h-auto">
          <TabsTrigger value="overview" className="text-xs gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Activity Timeline
          </TabsTrigger>
          <TabsTrigger value="drops" className="text-xs gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Drops ({recent_drops.length})
          </TabsTrigger>
          <TabsTrigger value="engagement" className="text-xs gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Engagement
          </TabsTrigger>
          <TabsTrigger value="network" className="text-xs gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Orbit Network
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-xs gap-1.5">
            <Flag className="h-3.5 w-3.5" />
            Reports ({metrics.reports_against_count})
          </TabsTrigger>
          <TabsTrigger value="safety" className="text-xs gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" />
            Safety & Restrictions ({restrictions.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs gap-1.5">
            <History className="h-3.5 w-3.5" />
            Audit History
          </TabsTrigger>
        </TabsList>

        {/* 1. OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Account Details */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold border-b border-border pb-2.5">
                Account Summary
              </h2>
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-muted-foreground">Internal User ID</dt>
                  <dd className="font-mono text-[11px] truncate text-foreground select-all mt-0.5">
                    {profile.id}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Account Status</dt>
                  <dd className="font-medium text-foreground capitalize mt-0.5">
                    {profile.account_status}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Registration Timestamp</dt>
                  <dd className="text-foreground mt-0.5">
                    {new Date(profile.created_at).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Account Age</dt>
                  <dd className="font-mono text-foreground mt-0.5">
                    {metrics.account_age_days} days
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Warning Accumulator</dt>
                  <dd className="font-mono text-foreground mt-0.5">
                    {profile.warning_count} recorded
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Admin Assignment</dt>
                  <dd className="text-foreground mt-0.5">
                    {profile.admin_role || (profile.is_admin ? "Admin" : "Standard User")}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Safety & Status Insights */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold border-b border-border pb-2.5">
                Moderation & Safety Context
              </h2>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-muted/20">
                  <span className="text-muted-foreground">Active Restrictions</span>
                  <Badge variant="outline" className="font-mono text-[11px]">
                    {restrictions.filter((r) => r.is_active).length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-muted/20">
                  <span className="text-muted-foreground">Reports Against User</span>
                  <Badge
                    variant="outline"
                    className={`font-mono text-[11px] ${
                      metrics.reports_against_count > 0 ? "border-amber-500/40 text-amber-500" : ""
                    }`}
                  >
                    {metrics.reports_against_count}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-muted/20">
                  <span className="text-muted-foreground">Reports Submitted by User</span>
                  <Badge variant="outline" className="font-mono text-[11px]">
                    {metrics.reports_filed_count}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Drops Preview */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-semibold">Recent Drops by @{profile.username}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab("drops")}
                className="h-7 text-xs text-primary"
              >
                View all drops →
              </Button>
            </div>

            {recent_drops.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No drops published by this user yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recent_drops.slice(0, 5).map((drop) => (
                  <div
                    key={drop.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/70 hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0 flex-1 pr-4">
                      <p className="text-xs text-foreground line-clamp-2">{drop.content}</p>
                      <span className="text-[10px] text-muted-foreground font-mono mt-1 block">
                        {new Date(drop.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono shrink-0">
                      <span>✨ {drop.spark_count}</span>
                      <span>💬 {drop.echo_count}</span>
                      <span>🔄 {drop.relay_count}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {drop.moderation_status || "approved"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* 2. ACTIVITY TIMELINE TAB */}
        <TabsContent value="activity" className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h2 className="text-sm font-semibold border-b border-border pb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Chronological User Activity Timeline
            </h2>

            {timelineLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                Reconstructing activity history...
              </div>
            ) : timeline.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No recorded activity found for this user.
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {timeline.map((ev, idx) => (
                  <div key={idx} className="relative flex items-start gap-3 text-xs group">
                    <span className="absolute -left-6 mt-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-card border-2 border-primary" />
                    <div className="flex-1 rounded-xl border border-border/60 bg-muted/20 p-3 group-hover:bg-muted/40 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground">{ev.description}</span>
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                          {timeAgo(ev.created_at)}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                        {new Date(ev.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* 3. DROPS TAB */}
        <TabsContent value="drops" className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h2 className="text-sm font-semibold border-b border-border pb-3">
              All Published Drops ({recent_drops.length})
            </h2>

            {recent_drops.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No drops found for this user.
              </div>
            ) : (
              <div className="space-y-3">
                {recent_drops.map((drop) => (
                  <div
                    key={drop.id}
                    className="p-4 rounded-xl border border-border/80 bg-card space-y-2.5 hover:border-border transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                        {drop.content}
                      </p>
                      <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                        {drop.moderation_status || "approved"}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60 text-[11px] text-muted-foreground font-mono">
                      <span>Published {new Date(drop.created_at).toLocaleString()}</span>
                      <div className="flex items-center gap-3">
                        <span>✨ {drop.spark_count} sparks</span>
                        <span>💬 {drop.echo_count} echoes</span>
                        <span>🔄 {drop.relay_count} relays</span>
                        <a
                          href={`/drop/${drop.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          View
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* 4. ENGAGEMENT TAB */}
        <TabsContent value="engagement" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold border-b border-border pb-2.5">
                Inbound Engagement (Received)
              </h2>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between p-3 rounded-xl border border-border/60 bg-muted/20">
                  <span className="text-muted-foreground">Sparks (Likes)</span>
                  <span className="font-mono font-bold text-foreground">
                    {metrics.total_sparks_received}
                  </span>
                </div>
                <div className="flex justify-between p-3 rounded-xl border border-border/60 bg-muted/20">
                  <span className="text-muted-foreground">Echoes (Comments)</span>
                  <span className="font-mono font-bold text-foreground">
                    {metrics.total_echoes_received}
                  </span>
                </div>
                <div className="flex justify-between p-3 rounded-xl border border-border/60 bg-muted/20">
                  <span className="text-muted-foreground">Relays (Shares)</span>
                  <span className="font-mono font-bold text-foreground">
                    {metrics.total_relays_received}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold border-b border-border pb-2.5">
                Outbound Engagement (Created)
              </h2>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between p-3 rounded-xl border border-border/60 bg-muted/20">
                  <span className="text-muted-foreground">Sparks Given</span>
                  <span className="font-mono font-bold text-foreground">
                    {metrics.total_sparks_given}
                  </span>
                </div>
                <div className="flex justify-between p-3 rounded-xl border border-border/60 bg-muted/20">
                  <span className="text-muted-foreground">Echoes Left</span>
                  <span className="font-mono font-bold text-foreground">
                    {metrics.total_echoes_created}
                  </span>
                </div>
                <div className="flex justify-between p-3 rounded-xl border border-border/60 bg-muted/20">
                  <span className="text-muted-foreground">Relays Initiated</span>
                  <span className="font-mono font-bold text-foreground">
                    {metrics.total_relays_created}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 5. ORBIT NETWORK TAB */}
        <TabsContent value="network" className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant={networkType === "orbiters" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setNetworkType("orbiters");
                    setNetworkPage(1);
                  }}
                  className="h-8 text-xs"
                >
                  Orbiters (Followers) · {metrics.total_orbiters}
                </Button>
                <Button
                  variant={networkType === "orbiting" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setNetworkType("orbiting");
                    setNetworkPage(1);
                  }}
                  className="h-8 text-xs"
                >
                  Orbiting (Following) · {metrics.total_orbiting}
                </Button>
              </div>

              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter network..."
                  value={networkSearch}
                  onChange={(e) => {
                    setNetworkSearch(e.target.value);
                    setNetworkPage(1);
                  }}
                  className="pl-9 h-8 text-xs bg-background"
                />
              </div>
            </div>

            {networkLoading ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
                Loading network connections...
              </div>
            ) : (networkData?.connections ?? []).length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No connections found matching the criteria.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {networkData!.connections.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl border border-border/70 flex items-center justify-between hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <BlurbiAvatar emoji={c.avatar_emoji} color={c.avatar_color} size="sm" />
                      <div className="min-w-0 text-xs">
                        <div className="font-semibold text-foreground truncate flex items-center gap-1">
                          <span>{c.display_name || c.username}</span>
                          {c.is_verified && (
                            <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono truncate">
                          @{c.username}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {c.is_mutual && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-primary/30 text-primary"
                        >
                          Mutual
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate({ to: `/admin/users/${c.id}` })}
                        className="h-7 text-xs text-primary"
                      >
                        Inspect
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* 6. REPORTS TAB */}
        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Reports Against User */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold border-b border-border pb-2.5 flex items-center gap-2 text-destructive">
                <Flag className="h-4 w-4" />
                Reports Against User ({reports.reports_against.length})
              </h2>

              {reports.reports_against.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No reports submitted against this user.
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.reports_against.map((rep) => (
                    <div
                      key={rep.id}
                      className="p-3 rounded-xl border border-border/70 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="capitalize text-[10px]">
                          {rep.category}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {rep.status}
                        </Badge>
                      </div>
                      <p className="text-foreground">{rep.reason}</p>
                      {rep.drop_snippet && (
                        <div className="p-2 rounded bg-muted/40 font-mono text-[11px] text-muted-foreground truncate">
                          Drop: {rep.drop_snippet}
                        </div>
                      )}
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {new Date(rep.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reports Submitted by User */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold border-b border-border pb-2.5 flex items-center gap-2">
                <Flag className="h-4 w-4" />
                Reports Submitted by User ({reports.reports_submitted.length})
              </h2>

              {reports.reports_submitted.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  User has not submitted any content reports.
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.reports_submitted.map((rep) => (
                    <div
                      key={rep.id}
                      className="p-3 rounded-xl border border-border/70 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="capitalize text-[10px]">
                          {rep.category}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {rep.status}
                        </Badge>
                      </div>
                      <p className="text-foreground">{rep.reason}</p>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {new Date(rep.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* 7. SAFETY & RESTRICTIONS TAB */}
        <TabsContent value="safety" className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-destructive">
                <ShieldAlert className="h-4 w-4" />
                Restrictions & Moderation History ({restrictions.length})
              </h2>

              {canRestrict && profile.account_status !== "banned" && (
                <Button
                  size="sm"
                  onClick={() => setRestrictDialogOpen(true)}
                  className="h-8 text-xs gap-1.5 bg-destructive hover:bg-destructive/90"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Issue Restriction
                </Button>
              )}
            </div>

            {restrictions.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-60" />
                <p className="font-semibold text-foreground">Clean Safety Record</p>
                <p className="text-[11px] mt-0.5">
                  No administrative restrictions or warnings recorded against this account.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {restrictions.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl border border-border/80 bg-card space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={r.is_active ? "destructive" : "secondary"}
                        className="text-[10px] uppercase font-mono"
                      >
                        {r.type} {r.is_active ? "(Active)" : "(Revoked)"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(r.created_at).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-foreground font-medium">Reason: {r.reason}</p>

                    {r.internal_notes && (
                      <p className="text-muted-foreground text-[11px] p-2 rounded bg-muted/30">
                        Notes: {r.internal_notes}
                      </p>
                    )}

                    {r.admin && (
                      <div className="text-[10px] text-muted-foreground font-mono pt-1 border-t border-border/50">
                        Enforced by Administrator: @{r.admin.username} ({r.admin.display_name})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* 8. AUDIT HISTORY TAB */}
        <TabsContent value="history" className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h2 className="text-sm font-semibold border-b border-border pb-3 flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Administrative Audit Trail Records
            </h2>

            {audit_history.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No administrative actions logged targeting this account.
              </div>
            ) : (
              <div className="space-y-3">
                {audit_history.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl border border-border/70 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {log.action_type}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    {log.reason && <p className="text-foreground">Reason: {log.reason}</p>}
                    {log.admin && (
                      <div className="text-[10px] text-muted-foreground font-mono">
                        Actor: @{log.admin.username} ({log.admin.display_name})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Restrict Dialog */}
      <Dialog open={restrictDialogOpen} onOpenChange={setRestrictDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Restrict Account: @{profile.username}
            </DialogTitle>
            <DialogDescription className="text-xs">
              This action updates the database account status and writes to the immutable audit
              trail.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="insp-restriction-type">Action Type</Label>
              <Select
                value={restrictionType}
                onValueChange={(val) => setRestrictionType(val as "warning" | "suspension" | "ban")}
              >
                <SelectTrigger id="insp-restriction-type" className="text-xs h-9">
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
                <Label htmlFor="insp-suspension-duration">Suspension Duration (Hours)</Label>
                <Input
                  id="insp-suspension-duration"
                  type="number"
                  min="1"
                  max="720"
                  value={suspensionDuration}
                  onChange={(e) => setSuspensionDuration(parseInt(e.target.value) || 24)}
                  className="text-xs h-9"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="insp-restriction-reason">Mandatory Operational Reason</Label>
              <Input
                id="insp-restriction-reason"
                placeholder="Reason for restriction..."
                value={restrictionReason}
                onChange={(e) => setRestrictionReason(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="insp-restriction-notes">Internal Notes (Optional)</Label>
              <Textarea
                id="insp-restriction-notes"
                placeholder="Additional audit context..."
                value={restrictionNotes}
                onChange={(e) => setRestrictionNotes(e.target.value)}
                className="text-xs min-h-[50px]"
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
                  userId: profile.id,
                  type: restrictionType,
                  reason: restrictionReason.trim(),
                  notes: restrictionNotes.trim() || null,
                  durationHours: restrictionType === "suspension" ? suspensionDuration : null,
                })
              }
              className="text-xs gap-1.5"
            >
              {restrictMutation.isPending ? "Executing..." : `Confirm ${restrictionType}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
              Restore Account: @{profile.username}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Restoring clears active bans and suspensions, returning the account status to Active.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="insp-restore-reason">Restoration Reason (Mandatory Audit)</Label>
              <Input
                id="insp-restore-reason"
                placeholder="e.g. Appeal approved, time served"
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
                  userId: profile.id,
                  reason: restoreReason.trim(),
                })
              }
              className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {restoreMutation.isPending ? "Restoring..." : "Confirm Restoration"}
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

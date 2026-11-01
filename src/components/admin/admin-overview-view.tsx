import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  Activity,
  CheckCircle2,
  TrendingUp,
  Server,
  Shield,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BlurbiAvatar } from "@/components/blurbi/blurbi-avatar";
import { fetchPlatformAnalytics, type PlatformAnalyticsData } from "@/lib/admin";
import { timeAgo } from "@/lib/blurbi";
import type { AdminTab } from "./admin-layout";

interface AdminOverviewViewProps {
  onNavigateTab?: (tab: AdminTab) => void;
}

export function AdminOverviewView({ onNavigateTab }: AdminOverviewViewProps) {
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useQuery<PlatformAnalyticsData | null>({
    queryKey: ["admin", "analytics", "overview"],
    queryFn: () => fetchPlatformAnalytics("30d"),
    refetchInterval: 20000,
  });

  function handleNavigate(tab: AdminTab, path: string) {
    if (onNavigateTab) {
      onNavigateTab(tab);
    } else {
      navigate({ to: path });
    }
  }

  const kpis = data?.kpis ?? {
    total_users: 0,
    active_today: 0,
    dau: 0,
    wau: 0,
    mau: 0,
    total_drops: 0,
    total_sparks: 0,
    total_echoes: 0,
    total_relays: 0,
    pending_reports: 0,
    suspended_users: 0,
  };

  return (
    <div className="space-y-6">
      {/* Overview Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Platform Operations Overview
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Live database aggregates, user growth metrics, engagement signals, and platform health.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 border-emerald-500/30 text-emerald-500 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Supabase Live
          </Badge>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-8 text-xs">
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {/* Total Users */}
        <div
          onClick={() => handleNavigate("users", "/admin/users")}
          className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total Users</span>
            <Users className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono">
            {isLoading ? "..." : kpis.total_users.toLocaleString()}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="text-emerald-500 font-medium">DAU: {kpis.dau}</span>
            <span>·</span>
            <span>MAU: {kpis.mau}</span>
          </div>
        </div>

        {/* Total Drops */}
        <div
          onClick={() => handleNavigate("drops", "/admin/drops")}
          className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total Drops</span>
            <MessageSquare className="h-4 w-4 text-sky-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono">
            {isLoading ? "..." : kpis.total_drops.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">Short text & emoji posts</div>
        </div>

        {/* Engagement Signals */}
        <div
          onClick={() => handleNavigate("analytics", "/admin/analytics")}
          className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total Sparks</span>
            <Sparkles className="h-4 w-4 text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono">
            {isLoading ? "..." : kpis.total_sparks.toLocaleString()}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>Relays: {kpis.total_relays}</span>
            <span>·</span>
            <span>Echoes: {kpis.total_echoes}</span>
          </div>
        </div>

        {/* Pending Moderation */}
        <div
          onClick={() => handleNavigate("moderation", "/admin/moderation")}
          className="rounded-xl border border-border bg-card p-4 hover:border-destructive/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Pending Reports</span>
            <AlertTriangle className="h-4 w-4 text-destructive group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-destructive">
            {isLoading ? "..." : kpis.pending_reports}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {kpis.pending_reports > 0 ? "Requires review" : "Queue is clear"}
          </div>
        </div>

        {/* Suspended Accounts */}
        <div
          onClick={() => handleNavigate("users", "/admin/users")}
          className="rounded-xl border border-border bg-card p-4 hover:border-border transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Suspended</span>
            <Shield className="h-4 w-4 text-muted-foreground group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono">
            {isLoading ? "..." : kpis.suspended_users}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">Enforced by backend</div>
        </div>
      </div>

      {/* Main Grid: Trends & System Health */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Activity & Trends */}
        <div className="space-y-6 lg:col-span-2">
          {/* Recent Registrations Chart/Curve */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">User Registrations (Last 30 Days)</h2>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {data?.daily_registrations?.length ?? 0} data points
              </Badge>
            </div>

            <div className="mt-4">
              {data?.daily_registrations && data.daily_registrations.length > 0 ? (
                <div className="flex items-end gap-1.5 h-36 pt-4 px-2">
                  {data.daily_registrations.map((item) => {
                    const maxVal = Math.max(...data.daily_registrations.map((d) => d.count), 1);
                    const heightPct = Math.max((item.count / maxVal) * 100, 8);
                    return (
                      <div
                        key={item.day}
                        className="flex-1 flex flex-col items-center gap-1 group relative"
                      >
                        <div
                          style={{ height: `${heightPct}%` }}
                          className="w-full bg-primary/70 hover:bg-primary rounded-t transition-all"
                        />
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-popover text-popover-foreground text-[10px] py-0.5 px-1.5 rounded shadow pointer-events-none whitespace-nowrap z-10 font-mono">
                          {item.day}: {item.count} users
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  No historical registration logs available yet.
                </div>
              )}
            </div>
          </div>

          {/* Top Engaged Drops */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-semibold">Highest Velocity Content</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavigate("drops", "/admin/drops")}
                className="h-7 text-xs"
              >
                View all drops
              </Button>
            </div>

            <div className="mt-3 space-y-2.5">
              {data?.top_engaged_drops && data.top_engaged_drops.length > 0 ? (
                data.top_engaged_drops.map((drop) => (
                  <div
                    key={drop.id}
                    className="flex items-center justify-between rounded-xl border border-border/70 p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="text-xs text-muted-foreground">
                        @{drop.username} · {timeAgo(drop.created_at)}
                      </div>
                      <p className="mt-1 text-sm text-foreground line-clamp-1">{drop.content}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                      <span>✨ {drop.spark_count}</span>
                      <span>💬 {drop.echo_count}</span>
                      <span>🔄 {drop.relay_count}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No drops recorded in this interval.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Top Blurbers & System Status */}
        <div className="space-y-6">
          {/* Top Blurbers by Activity */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-sky-500" />
                <h2 className="text-sm font-semibold">Most Active Blurbers</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNavigate("users", "/admin/users")}
                className="h-7 text-xs"
              >
                View all
              </Button>
            </div>

            <div className="mt-3 space-y-2.5">
              {data?.top_active_users && data.top_active_users.length > 0 ? (
                data.top_active_users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded-xl border border-border/60 p-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BlurbiAvatar emoji={user.avatar_emoji} color={user.avatar_color} size="sm" />
                      <div className="min-w-0">
                        <div className="font-semibold text-xs truncate">
                          {user.display_name || user.username}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          @{user.username}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {user.drops_count} drops
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No active blurber data yet.
                </div>
              )}
            </div>
          </div>

          {/* System & Architecture Status */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Server className="h-4 w-4 text-emerald-500" />
              <h2 className="text-sm font-semibold">System Diagnostics</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Database Engine</span>
                <span className="font-mono font-medium flex items-center gap-1.5 text-emerald-500">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  PostgreSQL 15+ (RLS)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Realtime CDC WebSockets</span>
                <span className="font-mono font-medium text-emerald-500">Active</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Intelligence Engine</span>
                <span className="font-mono font-medium text-primary">v2.0 Dynamic Gravity</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Telemetry Ingestion</span>
                <span className="font-mono font-medium text-foreground">Batched (4s buffer)</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Access Control</span>
                <span className="font-mono font-medium text-indigo-400">Strict RBAC</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

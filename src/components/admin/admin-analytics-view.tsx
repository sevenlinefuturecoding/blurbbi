import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  Sparkles,
  Users,
  MessageSquare,
  Repeat2,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BlurbiAvatar } from "@/components/blurbi/blurbi-avatar";
import { fetchPlatformAnalytics, type PlatformAnalyticsData } from "@/lib/admin";
import { timeAgo } from "@/lib/blurbi";

export function AdminAnalyticsView() {
  const [range, setRange] = useState<"today" | "7d" | "30d" | "90d">("30d");

  const { data, isLoading, refetch } = useQuery<PlatformAnalyticsData | null>({
    queryKey: ["admin", "analytics-deep", range],
    queryFn: () => fetchPlatformAnalytics(range),
  });

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

  function exportCSV() {
    if (!data) return;
    const rows = [
      ["Metric", "Value"],
      ["Total Users", kpis.total_users],
      ["DAU", kpis.dau],
      ["WAU", kpis.wau],
      ["MAU", kpis.mau],
      ["Total Drops", kpis.total_drops],
      ["Total Sparks", kpis.total_sparks],
      ["Total Echoes", kpis.total_echoes],
      ["Total Relays", kpis.total_relays],
      ["Pending Reports", kpis.pending_reports],
      ["Suspended Users", kpis.suspended_users],
      [],
      ["Day", "Registrations"],
      ...data.daily_registrations.map((r) => [r.day, r.count]),
      [],
      ["Day", "Drops Published"],
      ...data.daily_drops.map((d) => [d.day, d.count]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `blurbbi_analytics_${range}_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Analytics CSV report exported");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Analytics & Engagement Intelligence
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Platform adoption curves, engagement ratios, and exportable reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={range} onValueChange={(val) => setRange(val as typeof range)}>
            <SelectTrigger className="w-[130px] h-9 bg-card text-xs">
              <Calendar className="mr-1.5 h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today (24h)</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="h-9 text-xs gap-1.5"
            disabled={isLoading || !data}
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>DAU / MAU Ratio</span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono">
            {kpis.mau > 0 ? ((kpis.dau / kpis.mau) * 100).toFixed(1) + "%" : "0.0%"}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">User stickiness</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Avg Sparks / Drop</span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono">
            {kpis.total_drops > 0 ? (kpis.total_sparks / kpis.total_drops).toFixed(1) : "0.0"}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">Reaction intensity</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total Relays</span>
            <Repeat2 className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono">{kpis.total_relays}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">Re-shared content</div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Weekly Active (WAU)</span>
            <Users className="h-4 w-4 text-sky-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono">{kpis.wau}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">7-day active blurbers</div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* User Registration Trend */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-semibold">User Registrations Over Time</h2>
            <Badge variant="outline" className="text-xs font-mono">
              {data?.daily_registrations?.length ?? 0} days
            </Badge>
          </div>

          <div className="mt-4">
            {data?.daily_registrations && data.daily_registrations.length > 0 ? (
              <div className="flex items-end gap-1.5 h-40 pt-4 px-2">
                {data.daily_registrations.map((item) => {
                  const maxVal = Math.max(...data.daily_registrations.map((d) => d.count), 1);
                  const heightPct = Math.max((item.count / maxVal) * 100, 6);
                  return (
                    <div
                      key={item.day}
                      className="flex-1 flex flex-col items-center gap-1 group relative"
                    >
                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-full bg-primary/80 hover:bg-primary rounded-t transition-all"
                      />
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-popover text-popover-foreground text-[10px] py-0.5 px-1.5 rounded shadow pointer-events-none whitespace-nowrap z-10 font-mono">
                        {item.day}: {item.count} users
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No registration records in this interval.
              </div>
            )}
          </div>
        </div>

        {/* Daily Drops Volume */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-semibold">Daily Drops Published</h2>
            <Badge variant="outline" className="text-xs font-mono">
              {data?.daily_drops?.length ?? 0} days
            </Badge>
          </div>

          <div className="mt-4">
            {data?.daily_drops && data.daily_drops.length > 0 ? (
              <div className="flex items-end gap-1.5 h-40 pt-4 px-2">
                {data.daily_drops.map((item) => {
                  const maxVal = Math.max(...data.daily_drops.map((d) => d.count), 1);
                  const heightPct = Math.max((item.count / maxVal) * 100, 6);
                  return (
                    <div
                      key={item.day}
                      className="flex-1 flex flex-col items-center gap-1 group relative"
                    >
                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-full bg-sky-500/80 hover:bg-sky-500 rounded-t transition-all"
                      />
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-popover text-popover-foreground text-[10px] py-0.5 px-1.5 rounded shadow pointer-events-none whitespace-nowrap z-10 font-mono">
                        {item.day}: {item.count} drops
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No drop publication records in this interval.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

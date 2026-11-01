import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useId } from "react";
import {
  Sliders,
  Cpu,
  Activity,
  Flame,
  ShieldAlert,
  CheckCircle2,
  Trash2,
  UserX,
  Save,
  RotateCcw,
  Sparkles,
  Clock,
  Shield,
  Layers,
  BarChart3,
  Users,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/use-my-profile";
import { AppShell } from "@/components/blurbi/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BlurbiAvatar } from "@/components/blurbi/blurbi-avatar";
import {
  DEFAULT_ALGORITHM_CONFIG,
  calculateHeatScore,
  getIntelligenceMetrics,
  updateAlgorithmConfig,
  fetchModerationReports,
  resolveModerationReport,
  type AlgorithmConfig,
  type ExperimentVariant,
} from "@/lib/intelligence";
import { timeAgo } from "@/lib/blurbi";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Intelligence Engine · Admin · Blurbbi" },
      {
        name: "description",
        content:
          "Blurbbi Intelligence Engine configuration, A/B variants, feed telemetry, and moderation.",
      },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data: me, isLoading: meLoading } = useMyProfile();
  const qc = useQueryClient();

  // Fetch telemetry and config
  const metricsQuery = useQuery({
    queryKey: ["admin", "metrics"],
    queryFn: getIntelligenceMetrics,
    refetchInterval: 15000,
  });

  // Fetch moderation reports
  const reportsQuery = useQuery({
    queryKey: ["admin", "reports"],
    queryFn: fetchModerationReports,
    refetchInterval: 20000,
  });

  // Fetch live trending drops
  const trendingQuery = useQuery({
    queryKey: ["admin", "trending"],
    queryFn: async () => {
      const { data } = await supabase.rpc("viral_now_v2" as never, { p_limit: 8 } as never);
      const rows = (data ?? []) as unknown as Array<{
        drop_id: string;
        content: string;
        username: string;
        display_name: string;
        avatar_emoji: string;
        avatar_color: string;
        spark_count: number;
        echo_count: number;
        relay_count: number;
        created_at: string;
        score?: number;
      }>;
      if (rows.length > 0) return rows;
      // fallback
      const { data: legacy } = await supabase.rpc("viral_now" as never, { p_limit: 8 } as never);
      return (legacy ?? []) as Array<{
        drop_id: string;
        content: string;
        username: string;
        display_name: string;
        avatar_emoji: string;
        avatar_color: string;
        spark_count: number;
        echo_count: number;
        relay_count: number;
        created_at: string;
        score?: number;
      }>;
    },
  });

  // Fetch creator recommendations
  const creatorsQuery = useQuery({
    queryKey: ["admin", "creators"],
    queryFn: async () => {
      const { data } = await supabase.rpc("recommend_creators" as never, { p_limit: 6 } as never);
      return (data ?? []) as Array<{
        id: string;
        username: string;
        display_name: string;
        bio?: string;
        avatar_emoji: string;
        avatar_color: string;
        followers_count: number;
        following_count: number;
        recent_drops_count: number;
        total_sparks_received: number;
      }>;
    },
  });

  // Local state for algorithm config inputs
  const [configForm, setConfigForm] = useState<AlgorithmConfig>(() => {
    return metricsQuery.data?.config ?? DEFAULT_ALGORITHM_CONFIG;
  });

  // Sync state once remote config is loaded
  const [isInitialized, setIsInitialized] = useState(false);
  if (metricsQuery.data?.config && !isInitialized) {
    setConfigForm(metricsQuery.data.config);
    setIsInitialized(true);
  }

  // Interactive Heat Score Simulator
  const [simSparks, setSimSparks] = useState(12);
  const [simEchoes, setSimEchoes] = useState(4);
  const [simRelays, setSimRelays] = useState(2);
  const [simPasses, setSimPasses] = useState(1);
  const [simAgeHours, setSimAgeHours] = useState(3);

  const simulatedScore = calculateHeatScore(
    simSparks,
    simEchoes,
    simRelays,
    simPasses,
    new Date(Date.now() - simAgeHours * 3600 * 1000),
    configForm,
  );

  // Mutations
  const updateConfigMutation = useMutation({
    mutationFn: async (newConfig: Partial<AlgorithmConfig>) => {
      const ok = await updateAlgorithmConfig(newConfig);
      if (!ok) throw new Error("Failed to save algorithm configuration");
      return ok;
    },
    onSuccess: () => {
      toast.success("Algorithm parameters updated successfully");
      qc.invalidateQueries({ queryKey: ["admin", "metrics"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Error updating configuration");
    },
  });

  const resolveReportMutation = useMutation({
    mutationFn: async ({
      reportId,
      action,
      notes,
    }: {
      reportId: string;
      action: "dismiss" | "delete_drop" | "suspend_author";
      notes?: string;
    }) => {
      const ok = await resolveModerationReport(reportId, action, notes);
      if (!ok) throw new Error("Failed to process moderation action");
      return ok;
    },
    onSuccess: (_, vars) => {
      const actionLabels = {
        dismiss: "Report dismissed",
        delete_drop: "Drop deleted and report resolved",
        suspend_author: "Author suspended and drop removed",
      };
      toast.success(actionLabels[vars.action]);
      qc.invalidateQueries({ queryKey: ["admin", "reports"] });
      qc.invalidateQueries({ queryKey: ["admin", "metrics"] });
      qc.invalidateQueries({ queryKey: ["drops"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Moderation action failed");
    },
  });

  if (meLoading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-4xl px-4 py-12 text-center text-muted-foreground">
          Loading intelligence dashboard...
        </div>
      </AppShell>
    );
  }

  // Admin Access Check
  if (!me?.is_admin) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Authorization Required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The Blurbbi Intelligence Engine configuration, telemetry, and moderation tools are
            reserved for designated system administrators.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link to="/">
              <Button variant="outline" className="w-full sm:w-auto">
                Back to Stream
              </Button>
            </Link>
            <Link to="/auth">
              <Button className="w-full sm:w-auto">Sign in as Administrator</Button>
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const telemetry = metricsQuery.data?.telemetry ?? [];
  const reports = reportsQuery.data ?? [];
  const pendingReports = reports.filter((r) => r.status === "pending");
  const variants = metricsQuery.data?.variants ?? [];

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Cpu className="h-4 w-4" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight">Blurbbi Intelligence Engine</h1>
              <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                v2.0 Dynamic
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Dynamic heat score calculations, controlled A/B experiments, telemetry latency, and
              moderation review.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1 font-mono text-xs">
              Admin: @{me.username}
            </Badge>
          </div>
        </div>

        {/* Quick KPI Overview */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Drops (24h)</span>
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="mt-2 text-2xl font-bold">{metricsQuery.data?.total_drops_24h ?? 0}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">Published to stream</div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Active Blurbers</span>
              <Users className="h-3.5 w-3.5 text-sky-500" />
            </div>
            <div className="mt-2 text-2xl font-bold">
              {metricsQuery.data?.total_active_blurbers_7d ?? 0}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">Last 7 days</div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Pending Reports</span>
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-bold">
              {metricsQuery.data?.pending_reports_count ?? pendingReports.length}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">Needs review</div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>A/B Variants</span>
              <Layers className="h-3.5 w-3.5 text-indigo-500" />
            </div>
            <div className="mt-2 text-2xl font-bold">
              {variants.filter((v) => v.is_active).length} / {variants.length || 3}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">Active in rotation</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs defaultValue="algorithm" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-card/60 p-1 border border-border">
            <TabsTrigger value="algorithm" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Sliders className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Algorithm</span>
            </TabsTrigger>
            <TabsTrigger value="variants" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Layers className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">A/B Testing</span>
            </TabsTrigger>
            <TabsTrigger value="telemetry" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Activity className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Telemetry</span>
            </TabsTrigger>
            <TabsTrigger value="trending" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Flame className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Trending & Recs</span>
            </TabsTrigger>
            <TabsTrigger
              value="moderation"
              className="flex items-center gap-1.5 text-xs sm:text-sm relative"
            >
              <Shield className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Moderation</span>
              {pendingReports.length > 0 && (
                <span className="ml-1 rounded-full bg-destructive px-1.5 py-0.2 text-[10px] text-destructive-foreground">
                  {pendingReports.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: ALGORITHM CONFIGURATION */}
          <TabsContent value="algorithm" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left 2 Cols: Parameter Sliders */}
              <div className="space-y-5 rounded-2xl border border-border bg-card p-6 lg:col-span-2">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <h2 className="text-base font-semibold">Ranking Formula Weights</h2>
                    <p className="text-xs text-muted-foreground">
                      Dynamic weights used in{" "}
                      <code className="text-primary">heat_score_dynamic</code>.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfigForm(DEFAULT_ALGORITHM_CONFIG)}
                    className="h-8 gap-1 text-xs"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset Baseline
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">Spark Weight (Likes)</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.5"
                        value={configForm.spark_weight}
                        onChange={(e) =>
                          setConfigForm({
                            ...configForm,
                            spark_weight: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground">Baseline: 3.0</span>
                  </div>

                  <div>
                    <Label className="text-xs">Echo Weight (Comments)</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.5"
                        value={configForm.echo_weight}
                        onChange={(e) =>
                          setConfigForm({
                            ...configForm,
                            echo_weight: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground">Baseline: 2.0</span>
                  </div>

                  <div>
                    <Label className="text-xs">Relay Weight (Reposts)</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.5"
                        value={configForm.relay_weight}
                        onChange={(e) =>
                          setConfigForm({
                            ...configForm,
                            relay_weight: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Baseline: 5.0 (High virality signal)
                    </span>
                  </div>

                  <div>
                    <Label className="text-xs">Pass Weight (Shares)</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.5"
                        value={configForm.pass_weight}
                        onChange={(e) =>
                          setConfigForm({
                            ...configForm,
                            pass_weight: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground">Baseline: 2.0</span>
                  </div>

                  <div>
                    <Label className="text-xs">Gravity Decay Exponent (Decay)</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.1"
                        value={configForm.decay_gravity}
                        onChange={(e) =>
                          setConfigForm({
                            ...configForm,
                            decay_gravity: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Baseline: 1.4 (Higher = faster decay)
                    </span>
                  </div>

                  <div>
                    <Label className="text-xs">Time Offset (Hours)</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.5"
                        value={configForm.time_offset_hours}
                        onChange={(e) =>
                          setConfigForm({
                            ...configForm,
                            time_offset_hours: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Prevents division by zero (2.0h)
                    </span>
                  </div>

                  <div>
                    <Label className="text-xs">Trending Window (Hours)</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        type="number"
                        step="1"
                        value={configForm.trending_window_hours}
                        onChange={(e) =>
                          setConfigForm({
                            ...configForm,
                            trending_window_hours: parseInt(e.target.value) || 24,
                          })
                        }
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Window for viral_now (24h)
                    </span>
                  </div>

                  <div>
                    <Label className="text-xs">For You Window (Hours)</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        type="number"
                        step="1"
                        value={configForm.for_you_window_hours}
                        onChange={(e) =>
                          setConfigForm({
                            ...configForm,
                            for_you_window_hours: parseInt(e.target.value) || 72,
                          })
                        }
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Window for feed_for_you (72h)
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={() => updateConfigMutation.mutate(configForm)}
                    disabled={updateConfigMutation.isPending}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {updateConfigMutation.isPending
                      ? "Applying Changes..."
                      : "Deploy Active Configuration"}
                  </Button>
                </div>
              </div>

              {/* Right Col: Live Formula Simulator */}
              <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
                <div>
                  <h3 className="text-base font-semibold">Live Heat Simulator</h3>
                  <p className="text-xs text-muted-foreground">
                    Test ranking formula output with simulated engagement.
                  </p>
                </div>

                <div className="rounded-xl bg-muted/40 p-4 font-mono text-center">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">
                    Calculated Score
                  </div>
                  <div className="mt-1 text-3xl font-extrabold text-primary">{simulatedScore}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    Formula: (Engagement + 1) / (Age + Offset)^Gravity
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <div className="flex justify-between text-xs">
                      <span>Sparks: {simSparks}</span>
                      <span className="text-muted-foreground">
                        +{(simSparks * configForm.spark_weight).toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={simSparks}
                      onChange={(e) => setSimSparks(parseInt(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs">
                      <span>Echoes: {simEchoes}</span>
                      <span className="text-muted-foreground">
                        +{(simEchoes * configForm.echo_weight).toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={simEchoes}
                      onChange={(e) => setSimEchoes(parseInt(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs">
                      <span>Relays: {simRelays}</span>
                      <span className="text-muted-foreground">
                        +{(simRelays * configForm.relay_weight).toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      value={simRelays}
                      onChange={(e) => setSimRelays(parseInt(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs">
                      <span>Passes: {simPasses}</span>
                      <span className="text-muted-foreground">
                        +{(simPasses * configForm.pass_weight).toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      value={simPasses}
                      onChange={(e) => setSimPasses(parseInt(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs">
                      <span>Drop Age: {simAgeHours} hours</span>
                      <span className="text-muted-foreground">
                        Denominator:{" "}
                        {Math.pow(
                          simAgeHours + configForm.time_offset_hours,
                          configForm.decay_gravity,
                        ).toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="72"
                      value={simAgeHours}
                      onChange={(e) => setSimAgeHours(parseInt(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: A/B TESTING VARIANTS */}
          <TabsContent value="variants" className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h2 className="text-base font-semibold">Active Experiment Variants</h2>
                  <p className="text-xs text-muted-foreground">
                    Traffic distribution and parameter overrides across user buckets.
                  </p>
                </div>
                <Badge variant="outline" className="border-indigo-500/30 text-indigo-400">
                  3 Variants Configured
                </Badge>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                {variants.map((v) => (
                  <div
                    key={v.id}
                    className={`rounded-xl border p-4 transition-all ${
                      v.is_active
                        ? "border-primary/40 bg-card"
                        : "border-border/60 bg-muted/20 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{v.name}</span>
                      <Badge
                        variant={v.is_active ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {v.is_active ? `${v.allocation_pct}% traffic` : "Paused"}
                      </Badge>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Spark Weight:</span>
                        <span className="font-mono text-foreground">{v.spark_weight}x</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Echo Weight:</span>
                        <span className="font-mono text-foreground">{v.echo_weight}x</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Relay Weight:</span>
                        <span className="font-mono text-foreground">{v.relay_weight}x</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Decay Gravity:</span>
                        <span className="font-mono text-foreground">{v.decay_gravity}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-mono">id: {v.id}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={async () => {
                          const nextState = !v.is_active;
                          await supabase
                            .from("experiment_variants")
                            .update({ is_active: nextState } as never)
                            .eq("id", v.id);
                          qc.invalidateQueries({ queryKey: ["admin", "metrics"] });
                          toast.success(`Variant ${v.name} ${nextState ? "activated" : "paused"}`);
                        }}
                      >
                        {v.is_active ? "Pause" : "Activate"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: FEED TELEMETRY & LATENCY */}
          <TabsContent value="telemetry" className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h2 className="text-base font-semibold">Feed Performance & Latency Telemetry</h2>
                  <p className="text-xs text-muted-foreground">
                    Aggregated client-side feed load latencies and item throughput (24h rolling).
                  </p>
                </div>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-500">
                  Live Buffer Active
                </Badge>
              </div>

              {telemetry.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  <Activity className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                  No telemetry logged in the last 24 hours yet. Telemetry batches automatically as
                  users browse feeds.
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="py-2.5 px-3">Feed Type</th>
                        <th className="py-2.5 px-3">Requests (24h)</th>
                        <th className="py-2.5 px-3">Avg Latency</th>
                        <th className="py-2.5 px-3">Peak Latency</th>
                        <th className="py-2.5 px-3">Avg Items</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {telemetry.map((t) => (
                        <tr
                          key={t.feed_type}
                          className="border-b border-border/50 hover:bg-muted/30"
                        >
                          <td className="py-3 px-3 font-medium font-mono text-xs">{t.feed_type}</td>
                          <td className="py-3 px-3">{t.request_count}</td>
                          <td className="py-3 px-3 font-mono">
                            <span
                              className={
                                t.avg_latency_ms < 150
                                  ? "text-emerald-500"
                                  : t.avg_latency_ms < 400
                                    ? "text-amber-500"
                                    : "text-destructive"
                              }
                            >
                              {t.avg_latency_ms} ms
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-muted-foreground">
                            {t.max_latency_ms} ms
                          </td>
                          <td className="py-3 px-3">{t.avg_items_returned}</td>
                          <td className="py-3 px-3">
                            <Badge
                              variant="outline"
                              className={
                                t.avg_latency_ms < 300
                                  ? "border-emerald-500/30 text-emerald-500 text-[10px]"
                                  : "border-amber-500/30 text-amber-500 text-[10px]"
                              }
                            >
                              {t.avg_latency_ms < 300 ? "Healthy" : "Investigate"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 4: TRENDING & CREATOR RECOMMENDATIONS */}
          <TabsContent value="trending" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Trending Drops */}
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-primary" />
                    <h2 className="text-base font-semibold">Live Trending Drops</h2>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {trendingQuery.data?.length ?? 0} active
                  </Badge>
                </div>

                <div className="mt-4 space-y-3">
                  {trendingQuery.data?.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      No drops currently meet the trending velocity threshold.
                    </div>
                  ) : (
                    trendingQuery.data?.map((drop) => (
                      <div
                        key={drop.drop_id}
                        className="rounded-xl border border-border/70 p-3 hover:border-border transition-colors"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">@{drop.username}</span>
                          <span className="text-muted-foreground">{timeAgo(drop.created_at)}</span>
                        </div>
                        <p className="mt-1.5 text-sm line-clamp-2 text-foreground/90">
                          {drop.content}
                        </p>
                        <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex gap-3">
                            <span>✨ {drop.spark_count}</span>
                            <span>💬 {drop.echo_count}</span>
                            <span>🔄 {drop.relay_count}</span>
                          </div>
                          {drop.score && (
                            <span className="font-mono text-primary text-[11px]">
                              Score: {Number(drop.score).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recommended Creators */}
              <div className="rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-sky-500" />
                    <h2 className="text-base font-semibold">Creator Recommendations</h2>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {creatorsQuery.data?.length ?? 0} creators
                  </Badge>
                </div>

                <div className="mt-4 space-y-3">
                  {creatorsQuery.data?.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      No creator recommendations available.
                    </div>
                  ) : (
                    creatorsQuery.data?.map((creator) => (
                      <div
                        key={creator.id}
                        className="flex items-center justify-between rounded-xl border border-border/70 p-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <BlurbiAvatar
                            emoji={creator.avatar_emoji}
                            color={creator.avatar_color}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-xs truncate">
                              {creator.display_name}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              @{creator.username}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-right text-xs">
                          <div>
                            <div className="font-medium">{creator.followers_count}</div>
                            <div className="text-[10px] text-muted-foreground">Orbiters</div>
                          </div>
                          <div>
                            <div className="font-medium text-primary">
                              +{creator.total_sparks_received}
                            </div>
                            <div className="text-[10px] text-muted-foreground">Sparks</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 5: MODERATION REVIEW TOOLS */}
          <TabsContent value="moderation" className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h2 className="text-base font-semibold">Moderation Review Queue</h2>
                  <p className="text-xs text-muted-foreground">
                    User-reported drops requiring administrator action or resolution.
                  </p>
                </div>
                <Badge
                  variant={pendingReports.length > 0 ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  {pendingReports.length} Pending
                </Badge>
              </div>

              {reports.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500/70" />
                  Zero reports currently pending. The moderation queue is completely clear!
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className={`rounded-xl border p-4 transition-all ${
                        report.status === "pending"
                          ? "border-destructive/30 bg-destructive/5"
                          : "border-border/60 bg-muted/20 opacity-70"
                      }`}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              report.status === "pending"
                                ? "destructive"
                                : report.status === "resolved"
                                  ? "default"
                                  : "secondary"
                            }
                            className="text-[10px] uppercase font-mono"
                          >
                            {report.status}
                          </Badge>
                          <span className="font-medium text-foreground">
                            Reason: {report.reason}
                          </span>
                          <span className="text-muted-foreground">
                            · {timeAgo(report.created_at)}
                          </span>
                        </div>

                        <div className="text-muted-foreground">
                          Reporter: @{report.reporter?.username ?? "anonymous"}
                        </div>
                      </div>

                      {/* Drop Content Preview */}
                      <div className="mt-3 rounded-lg border border-border bg-background p-3 text-sm">
                        {report.drop ? (
                          <>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                              <span>Author: @{report.drop.author?.username ?? "unknown"}</span>
                              <span>·</span>
                              <span>{timeAgo(report.drop.created_at)}</span>
                            </div>
                            <p className="text-foreground whitespace-pre-wrap">
                              {report.drop.content}
                            </p>
                          </>
                        ) : (
                          <span className="italic text-muted-foreground text-xs">
                            [Content has already been deleted]
                          </span>
                        )}
                      </div>

                      {report.note && (
                        <div className="mt-2 text-xs text-muted-foreground italic">
                          Reporter Note: &quot;{report.note}&quot;
                        </div>
                      )}

                      {/* Action buttons (only for pending reports) */}
                      {report.status === "pending" && (
                        <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              resolveReportMutation.mutate({
                                reportId: report.id,
                                action: "dismiss",
                              })
                            }
                            disabled={resolveReportMutation.isPending}
                            className="h-7 text-xs"
                          >
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                            Dismiss Report
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              resolveReportMutation.mutate({
                                reportId: report.id,
                                action: "delete_drop",
                              })
                            }
                            disabled={resolveReportMutation.isPending}
                            className="h-7 text-xs"
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Delete Drop
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              resolveReportMutation.mutate({
                                reportId: report.id,
                                action: "suspend_author",
                              })
                            }
                            disabled={resolveReportMutation.isPending}
                            className="h-7 text-xs"
                          >
                            <UserX className="mr-1 h-3.5 w-3.5" />
                            Suspend User & Remove Drop
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

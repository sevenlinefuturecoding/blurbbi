import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldAlert,
  Sliders,
  Cpu,
  Activity,
  Flame,
  CheckCircle2,
  Trash2,
  UserX,
  Save,
  RotateCcw,
  Sparkles,
  Layers,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/use-my-profile";
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
  type AlgorithmConfig,
} from "@/lib/intelligence";
import { timeAgo } from "@/lib/blurbi";
import { getCurrentAdminRole, type AdminRole } from "@/lib/admin";
import { AdminLayout, type AdminTab } from "@/components/admin/admin-layout";
import { AdminOverviewView } from "@/components/admin/admin-overview-view";
import { AdminUsersView } from "@/components/admin/admin-users-view";
import { AdminDropsView } from "@/components/admin/admin-drops-view";
import { AdminModerationView } from "@/components/admin/admin-moderation-view";
import { AdminAnalyticsView } from "@/components/admin/admin-analytics-view";
import { AdminAnnouncementsView } from "@/components/admin/admin-announcements-view";
import { AdminFeatureFlagsView } from "@/components/admin/admin-feature-flags-view";
import { AdminRolesView } from "@/components/admin/admin-roles-view";
import { AdminAuditLogsView } from "@/components/admin/admin-audit-logs-view";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Control Center · Super Admin · Blurbbi" },
      {
        name: "description",
        content:
          "Blurbbi Super Admin Control Center: centralized platform management, users, content, moderation, analytics, and safety.",
      },
    ],
  }),
  component: AdminControlCenter,
});

function AdminControlCenter() {
  const { data: me, isLoading: meLoading } = useMyProfile();
  const [currentTab, setCurrentTab] = useState<AdminTab>("overview");

  const { data: adminRole, isLoading: roleLoading } = useQuery<AdminRole | null>({
    queryKey: ["admin", "auth-role", me?.id],
    enabled: !!me,
    queryFn: getCurrentAdminRole,
  });

  if (meLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-xs text-muted-foreground">
        Loading administrative control center...
      </div>
    );
  }

  // Access Guard: requires adminRole or me.is_admin
  const hasAccess = Boolean(adminRole || me?.is_admin);

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Administrative Access Required
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The Blurbbi Control Center is restricted to authorized platform administrators. Sign in
            with an administrative account or return to the public stream.
          </p>
          <div className="pt-2 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link to="/">
              <Button variant="outline" className="w-full sm:w-auto text-xs">
                Back to Stream
              </Button>
            </Link>
            <Link to="/auth">
              <Button className="w-full sm:w-auto text-xs">Sign In as Admin</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout currentTab={currentTab} onSelectTab={setCurrentTab}>
      {currentTab === "overview" && <AdminOverviewView onNavigateTab={setCurrentTab} />}
      {currentTab === "users" && <AdminUsersView />}
      {currentTab === "drops" && <AdminDropsView />}
      {currentTab === "moderation" && <AdminModerationView />}
      {currentTab === "analytics" && <AdminAnalyticsView />}
      {currentTab === "engine" && <IntelligenceEngineView />}
      {currentTab === "announcements" && <AdminAnnouncementsView />}
      {currentTab === "settings" && <AdminFeatureFlagsView />}
      {currentTab === "roles" && <AdminRolesView />}
      {currentTab === "audit" && <AdminAuditLogsView />}
    </AdminLayout>
  );
}

// -----------------------------------------------------------------------------
// INTELLIGENCE ENGINE VIEW (Ranking Weights, A/B Variants, Telemetry)
// -----------------------------------------------------------------------------

function IntelligenceEngineView() {
  const qc = useQueryClient();

  const metricsQuery = useQuery({
    queryKey: ["admin", "metrics"],
    queryFn: getIntelligenceMetrics,
    refetchInterval: 15000,
  });

  const [configForm, setConfigForm] = useState<AlgorithmConfig>(() => {
    return metricsQuery.data?.config ?? DEFAULT_ALGORITHM_CONFIG;
  });

  const [isInitialized, setIsInitialized] = useState(false);
  if (metricsQuery.data?.config && !isInitialized) {
    setConfigForm(metricsQuery.data.config);
    setIsInitialized(true);
  }

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

  const telemetry = metricsQuery.data?.telemetry ?? [];
  const variants = metricsQuery.data?.variants ?? [];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Intelligence Engine & Discovery Ranking
          </h1>
          <Badge variant="outline" className="border-primary/30 text-primary text-xs">
            v2.0 Dynamic
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Dynamic gravity decay weights, controlled A/B experiment buckets, and batched latency
          telemetry.
        </p>
      </div>

      <Tabs defaultValue="algorithm" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-card border border-border">
          <TabsTrigger value="algorithm" className="flex items-center gap-1.5 text-xs">
            <Sliders className="h-3.5 w-3.5" />
            <span>Algorithm Weights</span>
          </TabsTrigger>
          <TabsTrigger value="variants" className="flex items-center gap-1.5 text-xs">
            <Layers className="h-3.5 w-3.5" />
            <span>A/B Experiment Variants</span>
          </TabsTrigger>
          <TabsTrigger value="telemetry" className="flex items-center gap-1.5 text-xs">
            <Activity className="h-3.5 w-3.5" />
            <span>Latency Telemetry</span>
          </TabsTrigger>
        </TabsList>

        {/* Algorithm Weights & Simulator */}
        <TabsContent value="algorithm" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-5 rounded-2xl border border-border bg-card p-6 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h2 className="text-base font-semibold">Ranking Formula Weights</h2>
                  <p className="text-xs text-muted-foreground">
                    Dynamic weights used in{" "}
                    <code className="text-primary font-mono">heat_score_dynamic</code>.
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
                    className="mt-1 bg-background"
                  />
                  <span className="text-[11px] text-muted-foreground">Baseline: 3.0</span>
                </div>

                <div>
                  <Label className="text-xs">Echo Weight (Comments)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={configForm.echo_weight}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, echo_weight: parseFloat(e.target.value) || 0 })
                    }
                    className="mt-1 bg-background"
                  />
                  <span className="text-[11px] text-muted-foreground">Baseline: 2.0</span>
                </div>

                <div>
                  <Label className="text-xs">Relay Weight (Reposts)</Label>
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
                    className="mt-1 bg-background"
                  />
                  <span className="text-[11px] text-muted-foreground">
                    Baseline: 5.0 (Viral multiplier)
                  </span>
                </div>

                <div>
                  <Label className="text-xs">Pass Weight (Direct Shares)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={configForm.pass_weight}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, pass_weight: parseFloat(e.target.value) || 0 })
                    }
                    className="mt-1 bg-background"
                  />
                  <span className="text-[11px] text-muted-foreground">Baseline: 2.0</span>
                </div>

                <div>
                  <Label className="text-xs">Gravity Decay Exponent</Label>
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
                    className="mt-1 bg-background"
                  />
                  <span className="text-[11px] text-muted-foreground">
                    Baseline: 1.4 (Higher = faster decay)
                  </span>
                </div>

                <div>
                  <Label className="text-xs">Time Offset (Hours)</Label>
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
                    className="mt-1 bg-background"
                  />
                  <span className="text-[11px] text-muted-foreground">Offset dampener: 2.0h</span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => updateConfigMutation.mutate(configForm)}
                  disabled={updateConfigMutation.isPending}
                  className="gap-2 text-xs"
                >
                  <Save className="h-4 w-4" />
                  {updateConfigMutation.isPending ? "Deploying..." : "Deploy Active Configuration"}
                </Button>
              </div>
            </div>

            {/* Live Heat Simulator */}
            <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
              <div>
                <h3 className="text-base font-semibold">Live Heat Simulator</h3>
                <p className="text-xs text-muted-foreground">
                  Test ranking formula score with simulated metrics.
                </p>
              </div>

              <div className="rounded-xl bg-muted/40 p-4 font-mono text-center">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">
                  Calculated Score
                </div>
                <div className="mt-1 text-3xl font-extrabold text-primary">{simulatedScore}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  (Engagement + 1) / (Age + Offset)^Gravity
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
                    <span>Drop Age: {simAgeHours} hours</span>
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

        {/* A/B Testing Variants */}
        <TabsContent value="variants" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="border-b border-border pb-4">
              <h2 className="text-base font-semibold">Active Experiment Variants</h2>
              <p className="text-xs text-muted-foreground">
                Traffic distribution and parameter overrides across user buckets.
              </p>
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
                    <Badge variant={v.is_active ? "default" : "secondary"} className="text-[10px]">
                      {v.is_active ? `${v.allocation_pct}% traffic` : "Paused"}
                    </Badge>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-muted-foreground font-mono">
                    <div className="flex justify-between">
                      <span>Spark Weight:</span>
                      <span className="text-foreground">{v.spark_weight}x</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Echo Weight:</span>
                      <span className="text-foreground">{v.echo_weight}x</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Relay Weight:</span>
                      <span className="text-foreground">{v.relay_weight}x</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Decay Gravity:</span>
                      <span className="text-foreground">{v.decay_gravity}</span>
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

        {/* Telemetry */}
        <TabsContent value="telemetry" className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="border-b border-border pb-4">
              <h2 className="text-base font-semibold">Feed Performance & Latency Telemetry</h2>
              <p className="text-xs text-muted-foreground">
                Aggregated client-side feed load latencies and item throughput (24h rolling).
              </p>
            </div>

            {telemetry.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
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
                    </tr>
                  </thead>
                  <tbody>
                    {telemetry.map((t) => (
                      <tr key={t.feed_type} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 px-3 font-medium font-mono text-xs">{t.feed_type}</td>
                        <td className="py-3 px-3 font-mono">{t.request_count}</td>
                        <td className="py-3 px-3 font-mono text-emerald-500">
                          {t.avg_latency_ms} ms
                        </td>
                        <td className="py-3 px-3 font-mono text-muted-foreground">
                          {t.max_latency_ms} ms
                        </td>
                        <td className="py-3 px-3 font-mono">{t.avg_items_returned}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

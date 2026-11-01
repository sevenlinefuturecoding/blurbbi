import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sliders, Cpu, Flame, CheckCircle2, Save, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  DEFAULT_ALGORITHM_CONFIG,
  calculateHeatScore,
  getIntelligenceMetrics,
  updateAlgorithmConfig,
  type AlgorithmConfig,
} from "@/lib/intelligence";

export function AdminIntelligenceView() {
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

  const updateMutation = useMutation({
    mutationFn: updateAlgorithmConfig,
    onSuccess: () => {
      toast.success("Algorithm parameters updated and deployed");
      qc.invalidateQueries({ queryKey: ["admin", "metrics"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update algorithm config");
    },
  });

  // Simulator test inputs
  const [simSparks, setSimSparks] = useState(12);
  const [simEchoes, setSimEchoes] = useState(3);
  const [simRelays, setSimRelays] = useState(1);
  const [simPasses, setSimPasses] = useState(0);
  const [simAgeHours, setSimAgeHours] = useState(2);

  const simulatedScore = calculateHeatScore(
    simSparks,
    simEchoes,
    simRelays,
    simPasses,
    new Date(Date.now() - simAgeHours * 3600 * 1000).toISOString(),
    configForm,
  );

  const telemetry = metricsQuery.data?.telemetry ?? [];
  const variants = metricsQuery.data?.variants ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Cpu className="h-6 w-6 text-primary" />
            Intelligence Engine & Ranking Controls
          </h1>
          <p className="text-xs text-muted-foreground">
            Tune algorithmic discovery weights, evaluate simulator curves, and inspect telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfigForm(DEFAULT_ALGORITHM_CONFIG)}
            className="text-xs gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Defaults
          </Button>
          <Button
            size="sm"
            onClick={() => updateMutation.mutate(configForm)}
            disabled={updateMutation.isPending}
            className="text-xs gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            {updateMutation.isPending ? "Deploying..." : "Save & Deploy"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="weights" className="space-y-4">
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="weights" className="text-xs gap-1.5">
            <Sliders className="h-3.5 w-3.5" />
            Signal Weights & Decay
          </TabsTrigger>
          <TabsTrigger value="simulator" className="text-xs gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Live Ranking Simulator
          </TabsTrigger>
          <TabsTrigger value="variants" className="text-xs gap-1.5">
            <Flame className="h-3.5 w-3.5" />
            A/B Experiment Variants
          </TabsTrigger>
          <TabsTrigger value="telemetry" className="text-xs gap-1.5">
            <Cpu className="h-3.5 w-3.5" />
            Feed Performance Telemetry
          </TabsTrigger>
        </TabsList>

        {/* Signal Weights Form */}
        <TabsContent value="weights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-base font-semibold border-b border-border pb-3">
                Engagement Multipliers
              </h2>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <Label htmlFor="spark_weight">Spark (Like) Weight</Label>
                    <span className="font-mono text-muted-foreground">
                      {configForm.spark_weight}x
                    </span>
                  </div>
                  <Input
                    id="spark_weight"
                    type="number"
                    step="0.1"
                    min="0"
                    value={configForm.spark_weight}
                    onChange={(e) =>
                      setConfigForm({
                        ...configForm,
                        spark_weight: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <Label htmlFor="echo_weight">Echo (Comment) Weight</Label>
                    <span className="font-mono text-muted-foreground">
                      {configForm.echo_weight}x
                    </span>
                  </div>
                  <Input
                    id="echo_weight"
                    type="number"
                    step="0.1"
                    min="0"
                    value={configForm.echo_weight}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, echo_weight: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <Label htmlFor="relay_weight">Relay (Share) Weight</Label>
                    <span className="font-mono text-muted-foreground">
                      {configForm.relay_weight}x
                    </span>
                  </div>
                  <Input
                    id="relay_weight"
                    type="number"
                    step="0.1"
                    min="0"
                    value={configForm.relay_weight}
                    onChange={(e) =>
                      setConfigForm({
                        ...configForm,
                        relay_weight: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <Label htmlFor="pass_weight">Pass (Skip) Negative Penalty</Label>
                    <span className="font-mono text-muted-foreground">
                      {configForm.pass_weight}x
                    </span>
                  </div>
                  <Input
                    id="pass_weight"
                    type="number"
                    step="0.1"
                    value={configForm.pass_weight}
                    onChange={(e) =>
                      setConfigForm({ ...configForm, pass_weight: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-base font-semibold border-b border-border pb-3">
                Temporal Decay & Discovery Windows
              </h2>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <Label htmlFor="decay_gravity">Gravity Exponent (G)</Label>
                    <span className="font-mono text-muted-foreground">
                      {configForm.decay_gravity}
                    </span>
                  </div>
                  <Input
                    id="decay_gravity"
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="5.0"
                    value={configForm.decay_gravity}
                    onChange={(e) =>
                      setConfigForm({
                        ...configForm,
                        decay_gravity: parseFloat(e.target.value) || 1.8,
                      })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <Label htmlFor="trending_window_hours">Trending Window (Hours)</Label>
                    <span className="font-mono text-muted-foreground">
                      {configForm.trending_window_hours}h
                    </span>
                  </div>
                  <Input
                    id="trending_window_hours"
                    type="number"
                    min="1"
                    max="720"
                    value={configForm.trending_window_hours}
                    onChange={(e) =>
                      setConfigForm({
                        ...configForm,
                        trending_window_hours: parseInt(e.target.value) || 48,
                      })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <Label htmlFor="time_offset_hours">Time Offset Constant</Label>
                    <span className="font-mono text-muted-foreground">
                      {configForm.time_offset_hours}
                    </span>
                  </div>
                  <Input
                    id="time_offset_hours"
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={configForm.time_offset_hours}
                    onChange={(e) =>
                      setConfigForm({
                        ...configForm,
                        time_offset_hours: parseFloat(e.target.value) || 2,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Live Ranking Simulator */}
        <TabsContent value="simulator" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-base font-semibold">Simulated Drop Properties</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs">
                    <span>Sparks: {simSparks}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={simSparks}
                    onChange={(e) => setSimSparks(parseInt(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs">
                    <span>Echoes: {simEchoes}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={simEchoes}
                    onChange={(e) => setSimEchoes(parseInt(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs">
                    <span>Relays: {simRelays}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={simRelays}
                    onChange={(e) => setSimRelays(parseInt(e.target.value))}
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

            <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-center items-center text-center space-y-4">
              <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Simulated Gravity Heat Score
              </div>
              <div className="text-5xl font-extrabold font-mono text-primary">
                {simulatedScore.toFixed(3)}
              </div>
              <div className="text-xs text-muted-foreground max-w-sm">
                Calculated using active config parameters with formula:
                <code className="block mt-1 p-2 rounded bg-muted/60 font-mono text-[11px]">
                  (Sparks*{configForm.spark_weight} + Echoes*{configForm.echo_weight} + Relays*
                  {configForm.relay_weight}) / (Age + {configForm.time_offset_hours})^
                  {configForm.decay_gravity}
                </code>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Variants */}
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

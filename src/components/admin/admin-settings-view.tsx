import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sliders,
  Settings,
  ShieldAlert,
  Save,
  RotateCcw,
  CheckCircle2,
  Lock,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Flame,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  fetchPlatformSettings,
  updatePlatformSetting,
  fetchFeatureFlags,
  toggleFeatureFlag,
  type PlatformSettingItem,
  type FeatureFlagItem,
} from "@/lib/admin";
import {
  DEFAULT_ALGORITHM_CONFIG,
  getIntelligenceMetrics,
  updateAlgorithmConfig,
  type AlgorithmConfig,
} from "@/lib/intelligence";

export function AdminSettingsView() {
  const qc = useQueryClient();

  // Settings Queries
  const settingsQuery = useQuery({
    queryKey: ["admin", "platform-settings"],
    queryFn: fetchPlatformSettings,
  });

  const flagsQuery = useQuery({
    queryKey: ["admin", "feature-flags"],
    queryFn: fetchFeatureFlags,
  });

  const algorithmQuery = useQuery({
    queryKey: ["admin", "algorithm-config"],
    queryFn: getIntelligenceMetrics,
  });

  // Local state for algorithm form
  const [algoConfig, setAlgoConfig] = useState<AlgorithmConfig>(DEFAULT_ALGORITHM_CONFIG);
  const [algoInitialized, setAlgoInitialized] = useState(false);

  useEffect(() => {
    if (algorithmQuery.data?.config && !algoInitialized) {
      setAlgoConfig(algorithmQuery.data.config);
      setAlgoInitialized(true);
    }
  }, [algorithmQuery.data, algoInitialized]);

  // Mutations
  const updateSettingMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      updatePlatformSetting(key, value),
    onSuccess: (_, vars) => {
      toast.success(`Setting '${vars.key}' updated`);
      qc.invalidateQueries({ queryKey: ["admin", "platform-settings"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update setting");
    },
  });

  const toggleFlagMutation = useMutation({
    mutationFn: ({
      id,
      isEnabled,
      rolloutPct,
    }: {
      id: string;
      isEnabled: boolean;
      rolloutPct: number;
    }) => toggleFeatureFlag(id, isEnabled, rolloutPct),
    onSuccess: (_, vars) => {
      toast.success(`Feature flag '${vars.id}' updated`);
      qc.invalidateQueries({ queryKey: ["admin", "feature-flags"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update feature flag");
    },
  });

  const updateAlgoMutation = useMutation({
    mutationFn: updateAlgorithmConfig,
    onSuccess: () => {
      toast.success("Algorithm ranking parameters deployed successfully");
      qc.invalidateQueries({ queryKey: ["admin", "algorithm-config"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to deploy algorithm configuration");
    },
  });

  const settings = settingsQuery.data ?? [];
  const flags = flagsQuery.data ?? [];

  // Helper to read setting boolean value
  function getBoolSetting(key: string, defaultVal = false): boolean {
    const item = settings.find((s) => s.key === key);
    if (!item) return defaultVal;
    try {
      if (typeof item.value === "boolean") return item.value;
      if (typeof item.value === "string") return item.value === "true";
      return Boolean(item.value);
    } catch {
      return defaultVal;
    }
  }

  // Helper to read setting number value
  function getNumSetting(key: string, defaultVal = 0): number {
    const item = settings.find((s) => s.key === key);
    if (!item) return defaultVal;
    try {
      const val = Number(item.value);
      return isNaN(val) ? defaultVal : val;
    } catch {
      return defaultVal;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Platform Configuration & Settings
        </h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Live control over platform operations, feature flags, safety constraints, and discovery
          algorithms.
        </p>
      </div>

      <Tabs defaultValue="platform" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-card border border-border">
          <TabsTrigger value="platform" className="text-xs flex items-center gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            <span>Platform Controls</span>
          </TabsTrigger>
          <TabsTrigger value="flags" className="text-xs flex items-center gap-1.5">
            <ToggleRight className="h-3.5 w-3.5" />
            <span>Feature Flags</span>
          </TabsTrigger>
          <TabsTrigger value="algorithm" className="text-xs flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5" />
            <span>Algorithm Weights</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PLATFORM CONTROLS */}
        <TabsContent value="platform" className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
            <div className="border-b border-border pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">System Safety & Operational Rules</h2>
                <p className="text-xs text-muted-foreground">
                  Backend-enforced platform parameters and global switches.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono border-primary/30 text-primary">
                Live Database Backed
              </Badge>
            </div>

            <div className="space-y-5">
              {/* Maintenance Mode */}
              <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-background">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-foreground">Maintenance Mode</span>
                    {getBoolSetting("maintenance_mode") && (
                      <Badge variant="destructive" className="text-[10px] uppercase font-mono">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    When enabled, restricts drop creation and engagement actions to administrators
                    only.
                  </p>
                </div>
                <Switch
                  checked={getBoolSetting("maintenance_mode")}
                  onCheckedChange={(checked) =>
                    updateSettingMutation.mutate({ key: "maintenance_mode", value: checked })
                  }
                />
              </div>

              {/* User Registrations */}
              <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-background">
                <div>
                  <span className="font-semibold text-xs text-foreground">
                    New User Registrations
                  </span>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Allow new visitors to sign up and create Blurbbi accounts.
                  </p>
                </div>
                <Switch
                  checked={getBoolSetting("registrations_enabled", true)}
                  onCheckedChange={(checked) =>
                    updateSettingMutation.mutate({ key: "registrations_enabled", value: checked })
                  }
                />
              </div>

              {/* Automated Spam Filter */}
              <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-background">
                <div>
                  <span className="font-semibold text-xs text-foreground">
                    Automated Spam & Link Filter
                  </span>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Heuristic detection flags repetitive URL drops for immediate moderator
                    inspection.
                  </p>
                </div>
                <Switch
                  checked={getBoolSetting("auto_moderation_spam_filter", true)}
                  onCheckedChange={(checked) =>
                    updateSettingMutation.mutate({
                      key: "auto_moderation_spam_filter",
                      value: checked,
                    })
                  }
                />
              </div>

              {/* Require Admin MFA */}
              <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-background">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-foreground">
                      Enforce Multi-Factor Authentication (MFA)
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono border-indigo-500/40 text-indigo-400"
                    >
                      Privileged Roles
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Requires two-factor authentication (TOTP) verification for Super Admin and Admin
                    sessions.
                  </p>
                </div>
                <Switch
                  checked={getBoolSetting("require_admin_mfa", false)}
                  onCheckedChange={(checked) =>
                    updateSettingMutation.mutate({ key: "require_admin_mfa", value: checked })
                  }
                />
              </div>

              {/* Numeric Thresholds */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
                <div className="p-4 rounded-xl border border-border bg-background space-y-2">
                  <Label className="text-xs">Max Drop Length (Characters)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      defaultValue={getNumSetting("max_drop_length", 500)}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value) || 500;
                        updateSettingMutation.mutate({ key: "max_drop_length", value: val });
                      }}
                      className="bg-card text-xs font-mono h-9"
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground">Default: 500 chars</span>
                </div>

                <div className="p-4 rounded-xl border border-border bg-background space-y-2">
                  <Label className="text-xs">Rate Limit (Drops / User / Hour)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      defaultValue={getNumSetting("rate_limit_drops_per_hour", 30)}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value) || 30;
                        updateSettingMutation.mutate({
                          key: "rate_limit_drops_per_hour",
                          value: val,
                        });
                      }}
                      className="bg-card text-xs font-mono h-9"
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground">Default: 30 drops/hour</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: FEATURE FLAGS */}
        <TabsContent value="flags" className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="border-b border-border pb-3">
              <h2 className="text-sm font-semibold">Platform Feature Flags</h2>
              <p className="text-xs text-muted-foreground">
                Runtime toggles with progressive rollout percentages.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {flags.map((flag) => (
                <div
                  key={flag.id}
                  className={`rounded-xl border p-4 transition-all ${
                    flag.is_enabled
                      ? "border-primary/40 bg-background"
                      : "border-border/70 bg-muted/20 opacity-70"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-foreground">{flag.name}</span>
                        <Badge variant="secondary" className="text-[10px] font-mono capitalize">
                          {flag.category}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{flag.description}</p>
                    </div>

                    <Switch
                      checked={flag.is_enabled}
                      onCheckedChange={(checked) =>
                        toggleFlagMutation.mutate({
                          id: flag.id,
                          isEnabled: checked,
                          rolloutPct: flag.rollout_pct,
                        })
                      }
                      className="shrink-0"
                    />
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground font-mono">
                    <span>id: {flag.id}</span>
                    <span className="text-foreground">{flag.rollout_pct}% rollout</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: ALGORITHM WEIGHTS */}
        <TabsContent value="algorithm" className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-sm font-semibold">Ranking & Gravity Decay Configuration</h2>
                <p className="text-xs text-muted-foreground">
                  Formula: (Sparks * Ws + Echoes * We + Relays * Wr + Passes * Wp + 1) / (Age +
                  Offset)^Gravity
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setAlgoConfig(DEFAULT_ALGORITHM_CONFIG)}
                className="h-8 text-xs gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Reset Baseline
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label className="text-xs">Spark Weight (Likes)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={algoConfig.spark_weight}
                  onChange={(e) =>
                    setAlgoConfig({ ...algoConfig, spark_weight: parseFloat(e.target.value) || 0 })
                  }
                  className="mt-1 bg-background text-xs font-mono"
                />
                <span className="text-[11px] text-muted-foreground">Baseline: 3.0</span>
              </div>

              <div>
                <Label className="text-xs">Echo Weight (Comments)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={algoConfig.echo_weight}
                  onChange={(e) =>
                    setAlgoConfig({ ...algoConfig, echo_weight: parseFloat(e.target.value) || 0 })
                  }
                  className="mt-1 bg-background text-xs font-mono"
                />
                <span className="text-[11px] text-muted-foreground">Baseline: 2.0</span>
              </div>

              <div>
                <Label className="text-xs">Relay Weight (Reposts)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={algoConfig.relay_weight}
                  onChange={(e) =>
                    setAlgoConfig({ ...algoConfig, relay_weight: parseFloat(e.target.value) || 0 })
                  }
                  className="mt-1 bg-background text-xs font-mono"
                />
                <span className="text-[11px] text-muted-foreground">Baseline: 5.0</span>
              </div>

              <div>
                <Label className="text-xs">Pass Weight (Direct Shares)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={algoConfig.pass_weight}
                  onChange={(e) =>
                    setAlgoConfig({ ...algoConfig, pass_weight: parseFloat(e.target.value) || 0 })
                  }
                  className="mt-1 bg-background text-xs font-mono"
                />
                <span className="text-[11px] text-muted-foreground">Baseline: 2.0</span>
              </div>

              <div>
                <Label className="text-xs">Gravity Decay Exponent</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={algoConfig.decay_gravity}
                  onChange={(e) =>
                    setAlgoConfig({ ...algoConfig, decay_gravity: parseFloat(e.target.value) || 0 })
                  }
                  className="mt-1 bg-background text-xs font-mono"
                />
                <span className="text-[11px] text-muted-foreground">Baseline: 1.4</span>
              </div>

              <div>
                <Label className="text-xs">Time Offset (Hours)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={algoConfig.time_offset_hours}
                  onChange={(e) =>
                    setAlgoConfig({
                      ...algoConfig,
                      time_offset_hours: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="mt-1 bg-background text-xs font-mono"
                />
                <span className="text-[11px] text-muted-foreground">Baseline: 2.0h</span>
              </div>

              <div>
                <Label className="text-xs">Trending Window (Hours)</Label>
                <Input
                  type="number"
                  value={algoConfig.trending_window_hours}
                  onChange={(e) =>
                    setAlgoConfig({
                      ...algoConfig,
                      trending_window_hours: parseInt(e.target.value) || 24,
                    })
                  }
                  className="mt-1 bg-background text-xs font-mono"
                />
                <span className="text-[11px] text-muted-foreground">Baseline: 24h</span>
              </div>

              <div>
                <Label className="text-xs">For You Window (Hours)</Label>
                <Input
                  type="number"
                  value={algoConfig.for_you_window_hours}
                  onChange={(e) =>
                    setAlgoConfig({
                      ...algoConfig,
                      for_you_window_hours: parseInt(e.target.value) || 72,
                    })
                  }
                  className="mt-1 bg-background text-xs font-mono"
                />
                <span className="text-[11px] text-muted-foreground">Baseline: 72h</span>
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={() => updateAlgoMutation.mutate(algoConfig)}
                disabled={updateAlgoMutation.isPending}
                className="gap-2 text-xs"
              >
                <Save className="h-4 w-4" />
                {updateAlgoMutation.isPending ? "Deploying..." : "Deploy Active Configuration"}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

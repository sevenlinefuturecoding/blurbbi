import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sliders,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  Save,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  fetchFeatureFlags,
  toggleFeatureFlag,
  fetchPlatformSettings,
  updatePlatformSetting,
  type FeatureFlagItem,
  type PlatformSettingItem,
} from "@/lib/admin";

export function AdminFeatureFlagsView() {
  const qc = useQueryClient();

  const flagsQuery = useQuery({
    queryKey: ["admin", "feature-flags"],
    queryFn: fetchFeatureFlags,
  });

  const settingsQuery = useQuery({
    queryKey: ["admin", "platform-settings"],
    queryFn: fetchPlatformSettings,
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
    onSuccess: () => {
      toast.success("Feature flag updated");
      qc.invalidateQueries({ queryKey: ["admin", "feature-flags"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update feature flag");
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      updatePlatformSetting(key, value),
    onSuccess: () => {
      toast.success("Platform setting saved");
      qc.invalidateQueries({ queryKey: ["admin", "platform-settings"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update platform setting");
    },
  });

  const flags = flagsQuery.data ?? [];
  const settings = settingsQuery.data ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Feature Flags & Platform Configuration
        </h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Control platform capabilities, experimental rollouts, rate limits, and maintenance mode in
          real time.
        </p>
      </div>

      {/* Feature Flags Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-base font-semibold">Active Feature Flags</h2>
            <p className="text-xs text-muted-foreground">
              Dynamic functionality toggles evaluated server-side and client-side.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {flags.filter((f) => f.is_enabled).length} / {flags.length} Enabled
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {flags.map((flag) => (
            <div
              key={flag.id}
              className={`rounded-2xl border p-5 transition-all ${
                flag.is_enabled
                  ? "border-primary/40 bg-card shadow-sm"
                  : "border-border/70 bg-muted/20 opacity-75"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{flag.name}</span>
                    <Badge variant="secondary" className="text-[10px] font-mono capitalize">
                      {flag.category}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {flag.description || "No description provided."}
                  </p>
                </div>

                <Switch
                  checked={flag.is_enabled}
                  onCheckedChange={(checked) => {
                    toggleFlagMutation.mutate({
                      id: flag.id,
                      isEnabled: checked,
                      rolloutPct: flag.rollout_pct,
                    });
                  }}
                  className="shrink-0"
                />
              </div>

              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-mono text-[11px]">id: {flag.id}</span>
                <span className="font-mono text-[11px] font-medium text-foreground">
                  {flag.rollout_pct}% traffic
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Platform Settings Section */}
      <div className="space-y-4 pt-4 border-t border-border">
        <div className="border-b border-border pb-3">
          <h2 className="text-base font-semibold">Platform & Safety Settings</h2>
          <p className="text-xs text-muted-foreground">
            Core operational constraints, limits, and system protection parameters.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          {settings.map((setting) => (
            <div
              key={setting.key}
              className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-2 border-b border-border/50 last:border-0"
            >
              <div className="min-w-0 pr-4">
                <div className="font-semibold text-xs text-foreground font-mono">{setting.key}</div>
                <div className="text-xs text-muted-foreground">{setting.description}</div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {String(setting.value)}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { supabase } from "@/integrations/supabase/client";

export interface AlgorithmConfig {
  id: string;
  spark_weight: number;
  echo_weight: number;
  relay_weight: number;
  pass_weight: number;
  decay_gravity: number;
  time_offset_hours: number;
  trending_window_hours: number;
  for_you_window_hours: number;
  min_spark_for_viral: number;
  creator_boost_multiplier: number;
  description: string;
  updated_at?: string;
}

export interface ExperimentVariant {
  id: string;
  name: string;
  allocation_pct: number;
  spark_weight: number;
  echo_weight: number;
  relay_weight: number;
  pass_weight: number;
  decay_gravity: number;
  is_active: boolean;
}

export interface FeedPerformanceMetric {
  feed_type: string;
  request_count: number;
  avg_latency_ms: number;
  max_latency_ms: number;
  avg_items_returned: number;
}

export interface IntelligenceMetrics {
  telemetry: FeedPerformanceMetric[];
  pending_reports_count: number;
  total_drops_24h: number;
  total_active_blurbers_7d: number;
  config: AlgorithmConfig;
  variants: ExperimentVariant[];
}

export interface ReportedDropItem {
  id: string;
  drop_id: string;
  reporter_id: string;
  reason: string;
  note: string | null;
  status: "pending" | "resolved" | "dismissed";
  created_at: string;
  drop: {
    id: string;
    content: string;
    user_id: string;
    created_at: string;
    author: {
      username: string;
      display_name: string;
      avatar_emoji: string;
    };
  } | null;
  reporter: {
    username: string;
    display_name: string;
  } | null;
}

export const DEFAULT_ALGORITHM_CONFIG: AlgorithmConfig = {
  id: "active",
  spark_weight: 3.0,
  echo_weight: 2.0,
  relay_weight: 5.0,
  pass_weight: 2.0,
  decay_gravity: 1.4,
  time_offset_hours: 2.0,
  trending_window_hours: 24,
  for_you_window_hours: 72,
  min_spark_for_viral: 1,
  creator_boost_multiplier: 1.2,
  description: "Production algorithm baseline",
};

/**
 * Pure function: calculates heat score based on engagement metrics and creation timestamp.
 * Formula: (Sparks * sw + Echoes * ew + Relays * rw + Passes * pw + 1) / (AgeInHours + offset)^gravity
 */
export function calculateHeatScore(
  sparks: number,
  echoes: number,
  relays: number,
  passes: number,
  createdAt: string | Date,
  config: Partial<AlgorithmConfig> = {},
): number {
  const sw = config.spark_weight ?? DEFAULT_ALGORITHM_CONFIG.spark_weight;
  const ew = config.echo_weight ?? DEFAULT_ALGORITHM_CONFIG.echo_weight;
  const rw = config.relay_weight ?? DEFAULT_ALGORITHM_CONFIG.relay_weight;
  const pw = config.pass_weight ?? DEFAULT_ALGORITHM_CONFIG.pass_weight;
  const grav = config.decay_gravity ?? DEFAULT_ALGORITHM_CONFIG.decay_gravity;
  const offset = config.time_offset_hours ?? DEFAULT_ALGORITHM_CONFIG.time_offset_hours;

  const createdTime =
    typeof createdAt === "string" ? new Date(createdAt).getTime() : createdAt.getTime();
  const now = Date.now();
  const ageHours = Math.max((now - createdTime) / (1000 * 60 * 60), 0);

  const numerator = sparks * sw + echoes * ew + relays * rw + passes * pw + 1;
  const denominator = Math.pow(ageHours + offset, grav);

  return Number((numerator / Math.max(denominator, 0.0001)).toFixed(4));
}

// -----------------------------------------------------------------------------
// BATCHED TELEMETRY SERVICE (Reduces Edge and RPC overhead)
// -----------------------------------------------------------------------------
interface TelemetryItem {
  feed_type: string;
  latency_ms: number;
  items_returned: number;
  experiment_variant: string;
}

let telemetryQueue: TelemetryItem[] = [];
let telemetryFlushTimeout: ReturnType<typeof setTimeout> | null = null;

export function recordFeedTelemetry(
  feedType: string,
  latencyMs: number,
  itemsReturned: number,
  experimentVariant = "control",
) {
  telemetryQueue.push({
    feed_type: feedType,
    latency_ms: latencyMs,
    items_returned: itemsReturned,
    experiment_variant: experimentVariant,
  });

  if (!telemetryFlushTimeout) {
    telemetryFlushTimeout = setTimeout(() => {
      flushTelemetry();
    }, 4000); // Flush batched items every 4 seconds
  }
}

async function flushTelemetry() {
  if (telemetryFlushTimeout) {
    clearTimeout(telemetryFlushTimeout);
    telemetryFlushTimeout = null;
  }

  if (telemetryQueue.length === 0) return;

  const batch = [...telemetryQueue];
  telemetryQueue = [];

  try {
    // Send telemetry items to Supabase
    const rows = batch.map((item) => ({
      feed_type: item.feed_type,
      latency_ms: item.latency_ms,
      items_returned: item.items_returned,
      experiment_variant: item.experiment_variant,
    }));

    await supabase.from("feed_telemetry").insert(rows as never);
  } catch {
    // Telemetry is non-critical; suppress silent logging failure
  }
}

// -----------------------------------------------------------------------------
// ADMIN INTELLIGENCE ENGINE CONTROLS
// -----------------------------------------------------------------------------

/** Check if current user has admin privileges */
export async function checkIsAdmin(): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (error || !data) return false;
    return Boolean(data.is_admin);
  } catch {
    return false;
  }
}

/** Fetch live metrics and aggregated feed performance */
export async function getIntelligenceMetrics(): Promise<IntelligenceMetrics | null> {
  try {
    const { data, error } = await supabase.rpc("admin_get_intelligence_metrics" as never);
    if (!error && data) {
      return data as unknown as IntelligenceMetrics;
    }
  } catch (err) {
    console.warn("admin_get_intelligence_metrics error:", err);
  }

  // Graceful fallback reading direct tables if RPC is not yet configured
  try {
    const { data: configData } = await supabase
      .from("algorithm_config")
      .select("*")
      .eq("id", "active")
      .maybeSingle();

    const { data: variantsData } = await supabase.from("experiment_variants").select("*");

    const { count: pendingReportsCount } = await supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    return {
      telemetry: [],
      pending_reports_count: pendingReportsCount ?? 0,
      total_drops_24h: 0,
      total_active_blurbers_7d: 0,
      config: (configData as unknown as AlgorithmConfig) ?? DEFAULT_ALGORITHM_CONFIG,
      variants: (variantsData as unknown as ExperimentVariant[]) ?? [],
    };
  } catch {
    return null;
  }
}

/** Update the active algorithm configuration */
export async function updateAlgorithmConfig(config: Partial<AlgorithmConfig>): Promise<boolean> {
  try {
    const { error } = await supabase.from("algorithm_config").upsert({
      id: "active",
      ...config,
      updated_at: new Date().toISOString(),
    } as never);

    return !error;
  } catch {
    return false;
  }
}

/** Fetch pending moderation reports for review */
export async function fetchModerationReports(): Promise<ReportedDropItem[]> {
  try {
    const { data, error } = await supabase
      .from("reports")
      .select(
        `
        id, drop_id, reporter_id, reason, note, status, created_at,
        drop:drops(
          id, content, user_id, created_at,
          author:profiles(username, display_name, avatar_emoji)
        ),
        reporter:profiles!reports_reporter_id_fkey(username, display_name)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(30);

    if (error || !data) return [];
    return data as unknown as ReportedDropItem[];
  } catch {
    return [];
  }
}

/** Resolve a reported item (dismiss, delete drop, or suspend author) */
export async function resolveModerationReport(
  reportId: string,
  action: "dismiss" | "delete_drop" | "suspend_author",
  notes?: string,
): Promise<boolean> {
  try {
    // Try RPC first
    const { error: rpcErr } = await supabase.rpc(
      "admin_resolve_report" as never,
      {
        p_report_id: reportId,
        p_action: action,
        p_notes: notes ?? null,
      } as never,
    );

    if (!rpcErr) return true;
  } catch {
    /* fallback to direct update */
  }

  try {
    const { error } = await supabase
      .from("reports")
      .update({
        status: action === "dismiss" ? "dismissed" : "resolved",
        resolution_action: action,
        resolved_at: new Date().toISOString(),
      } as never)
      .eq("id", reportId);

    return !error;
  } catch {
    return false;
  }
}

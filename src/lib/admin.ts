import { supabase } from "@/integrations/supabase/client";

export type AdminRole = "super_admin" | "admin" | "moderator" | "support" | "analyst";
export type AccountStatus = "active" | "warned" | "suspended" | "banned";
export type DropModerationStatus = "approved" | "flagged" | "hidden" | "removed";
export type ReportCategory =
  | "spam"
  | "harassment"
  | "hate_speech"
  | "impersonation"
  | "inappropriate"
  | "fake_account"
  | "other";
export type ReportStatus = "pending" | "under_review" | "resolved" | "dismissed";

export interface AdminUserListItem {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_emoji: string;
  avatar_color: string;
  account_status: AccountStatus;
  is_verified: boolean;
  is_admin: boolean;
  warning_count: number;
  suspended_until: string | null;
  ban_reason?: string | null;
  followers_count: number;
  following_count: number;
  created_at: string;
  updated_at: string;
  total_drops?: number;
  drops_count?: number;
  last_drop_at?: string | null;
  role?: AdminRole | null;
  admin_role?: AdminRole | null;
}

export interface UserIntelligenceData {
  profile: AdminUserDetail & {
    admin_role?: AdminRole | null;
    ban_reason?: string | null;
  };
  metrics: {
    account_age_days: number;
    total_drops: number;
    total_orbiters: number;
    total_orbiting: number;
    total_sparks_received: number;
    total_echoes_received: number;
    total_relays_received: number;
    total_sparks_given: number;
    total_echoes_created: number;
    total_relays_created: number;
    reports_against_count: number;
    reports_filed_count: number;
    posting_frequency_weekly: number;
  };
  recent_drops: Array<{
    id: string;
    content: string;
    spark_count: number;
    echo_count: number;
    relay_count: number;
    pass_count: number;
    is_pinned: boolean;
    is_hidden: boolean;
    moderation_status: DropModerationStatus;
    moderation_reason: string | null;
    created_at: string;
  }>;
  restrictions: UserRestrictionRecord[];
  audit_history: Array<{
    id: string;
    action_type: string;
    target_type: string;
    previous_state: Record<string, unknown> | null;
    new_state: Record<string, unknown> | null;
    reason: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
    admin?: {
      username: string;
      display_name: string;
    };
  }>;
  reports: {
    reports_against: Array<{
      id: string;
      category: ReportCategory;
      reason: string;
      status: ReportStatus;
      created_at: string;
      resolved_at: string | null;
      resolution_action: string | null;
      drop_id: string;
      drop_snippet?: string;
    }>;
    reports_submitted: Array<{
      id: string;
      category: ReportCategory;
      reason: string;
      status: ReportStatus;
      created_at: string;
      resolved_at: string | null;
    }>;
  };
}

export interface UserTimelineEvent {
  event_type: string;
  description: string;
  created_at: string;
  entity_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UserNetworkConnection {
  id: string;
  username: string;
  display_name: string;
  avatar_emoji: string;
  avatar_color: string;
  bio: string | null;
  account_status: AccountStatus;
  is_verified: boolean;
  followers_count: number;
  following_count: number;
  connected_at: string;
  is_mutual: boolean;
}

export interface AdminUserDetail extends AdminUserListItem {
  website?: string | null;
  location?: string | null;
  total_sparks_received: number;
  total_echoes: number;
  total_relays: number;
  restrictions: UserRestrictionRecord[];
  reports_against: number;
}

export interface UserRestrictionRecord {
  id: string;
  type: "warning" | "suspension" | "ban";
  reason: string;
  internal_notes: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  admin?: {
    username: string;
    display_name: string;
  };
}

export interface AdminDropListItem {
  id: string;
  user_id: string;
  content: string;
  spark_count: number;
  echo_count: number;
  relay_count: number;
  pass_count: number;
  is_pinned: boolean;
  is_hidden: boolean;
  moderation_status: DropModerationStatus;
  moderation_reason: string | null;
  created_at: string;
  author: {
    username: string;
    display_name: string;
    avatar_emoji: string;
    avatar_color: string;
    account_status: AccountStatus;
  };
  reports_count?: number;
}

export interface AdminReportListItem {
  id: string;
  drop_id: string;
  reporter_id: string;
  reason: string;
  category: ReportCategory;
  note: string | null;
  internal_notes: string | null;
  status: ReportStatus;
  assigned_to: string | null;
  created_at: string;
  resolved_at: string | null;
  resolution_action: string | null;
  drop: {
    id: string;
    content: string;
    user_id: string;
    created_at: string;
    author: {
      id: string;
      username: string;
      display_name: string;
      avatar_emoji: string;
      avatar_color: string;
    };
  } | null;
  reporter: {
    id: string;
    username: string;
    display_name: string;
  } | null;
  assignee?: {
    id: string;
    username: string;
    display_name: string;
  } | null;
}

export interface AdminAuditLogItem {
  id: string;
  admin_id: string;
  action_type: string;
  target_type: "user" | "drop" | "report" | "setting" | "feature_flag" | "role" | "announcement";
  target_id: string;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  admin?: {
    username: string;
    display_name: string;
  };
}

export interface PlatformAnnouncementItem {
  id: string;
  title: string;
  content: string;
  type: "general" | "feature_update" | "maintenance" | "important";
  audience: "all" | "verified" | "new_users";
  status: "draft" | "scheduled" | "published" | "archived";
  scheduled_for: string | null;
  published_at: string | null;
  created_at: string;
  author?: {
    username: string;
  };
}

export interface FeatureFlagItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  is_enabled: boolean;
  rollout_pct: number;
  updated_at: string;
}

export interface PlatformSettingItem {
  key: string;
  value: unknown;
  description: string | null;
  category: string;
  updated_at: string;
}

export interface PlatformKPIs {
  total_users: number;
  active_today: number;
  dau: number;
  wau: number;
  mau: number;
  total_drops: number;
  total_sparks: number;
  total_echoes: number;
  total_relays: number;
  pending_reports: number;
  suspended_users: number;
}

export interface PlatformAnalyticsData {
  kpis: PlatformKPIs;
  daily_registrations: Array<{ day: string; count: number }>;
  daily_drops: Array<{ day: string; count: number }>;
  top_active_users: Array<{
    id: string;
    username: string;
    display_name: string;
    avatar_emoji: string;
    avatar_color: string;
    drops_count: number;
  }>;
  top_engaged_drops: Array<{
    id: string;
    content: string;
    username: string;
    spark_count: number;
    echo_count: number;
    relay_count: number;
    created_at: string;
  }>;
}

// -----------------------------------------------------------------------------
// 1. RBAC & PERMISSION CHECKS
// -----------------------------------------------------------------------------

export async function getCurrentAdminRole(): Promise<AdminRole | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase.rpc(
      "get_admin_role" as never,
      {
        p_user_id: user.id,
      } as never,
    );
    if (!error && data) return data as unknown as AdminRole;

    // Fallback: check profile is_admin flag directly
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (profile?.is_admin) return "super_admin";
    return null;
  } catch {
    return null;
  }
}

export async function hasPermission(permission: string): Promise<boolean> {
  try {
    const role = await getCurrentAdminRole();
    if (!role) return false;
    if (role === "super_admin") return true;

    const { data } = await supabase.rpc(
      "has_admin_permission" as never,
      {
        p_permission: permission,
      } as never,
    );
    return Boolean(data);
  } catch {
    return false;
  }
}

// -----------------------------------------------------------------------------
// 2. DASHBOARD & ANALYTICS
// -----------------------------------------------------------------------------

export async function fetchPlatformAnalytics(
  range: "today" | "7d" | "30d" | "90d" = "30d",
): Promise<PlatformAnalyticsData | null> {
  try {
    const { data, error } = await supabase.rpc(
      "admin_get_platform_analytics" as never,
      {
        p_range: range,
      } as never,
    );

    if (!error && data) {
      return data as unknown as PlatformAnalyticsData;
    }
  } catch (err) {
    console.warn("Analytics RPC error:", err);
  }

  // Graceful fallback from base tables if RPC not ready
  try {
    const { count: userCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });
    const { count: dropCount } = await supabase
      .from("drops")
      .select("id", { count: "exact", head: true });
    const { count: reportCount } = await supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "under_review"]);
    const { count: suspendedCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .in("account_status", ["suspended", "banned"]);

    return {
      kpis: {
        total_users: userCount ?? 0,
        active_today: 0,
        dau: 0,
        wau: 0,
        mau: userCount ?? 0,
        total_drops: dropCount ?? 0,
        total_sparks: 0,
        total_echoes: 0,
        total_relays: 0,
        pending_reports: reportCount ?? 0,
        suspended_users: suspendedCount ?? 0,
      },
      daily_registrations: [],
      daily_drops: [],
      top_active_users: [],
      top_engaged_drops: [],
    };
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// 3. USER MANAGEMENT
// -----------------------------------------------------------------------------

export interface UserFilterOptions {
  search?: string;
  status?: AccountStatus | "all";
  verified?: boolean | "all";
  page?: number;
  limit?: number;
  sortBy?: "created_at" | "followers_count" | "following_count" | "username";
  sortOrder?: "asc" | "desc";
}

export async function fetchAdminUsers(
  options: UserFilterOptions = {},
): Promise<{ users: AdminUserListItem[]; totalCount: number }> {
  const {
    search = "",
    status = "all",
    verified = "all",
    page = 1,
    limit = 20,
    sortBy = "created_at",
    sortOrder = "desc",
  } = options;

  try {
    let query = supabase.from("profiles").select("*", { count: "exact" });

    if (search.trim()) {
      const s = `%${search.trim()}%`;
      query = query.or(`username.ilike.${s},display_name.ilike.${s}`);
    }

    if (status !== "all") {
      query = query.eq("account_status", status);
    }

    if (verified !== "all") {
      query = query.eq("is_verified", verified);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.order(sortBy, { ascending: sortOrder === "asc" }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      users: (data ?? []).map((u) => ({
        ...u,
        account_status:
          (u.account_status as AccountStatus) || (u.is_suspended ? "suspended" : "active"),
        is_verified: Boolean(u.is_verified),
        is_admin: Boolean(u.is_admin),
        warning_count: u.warning_count ?? 0,
        suspended_until: u.suspended_until ?? null,
      })),
      totalCount: count ?? 0,
    };
  } catch (err) {
    console.error("fetchAdminUsers error:", err);
    return { users: [], totalCount: 0 };
  }
}

export async function fetchAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !profile) return null;

    // Fetch user drops stats
    const { count: dropCount } = await supabase
      .from("drops")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    const { data: dropRows } = await supabase
      .from("drops")
      .select("spark_count, echo_count, relay_count")
      .eq("user_id", userId);

    const totalSparks = (dropRows ?? []).reduce((acc, r) => acc + (r.spark_count || 0), 0);
    const totalEchoes = (dropRows ?? []).reduce((acc, r) => acc + (r.echo_count || 0), 0);
    const totalRelays = (dropRows ?? []).reduce((acc, r) => acc + (r.relay_count || 0), 0);

    // Fetch reports against this user's drops
    const { count: reportsCount } = await supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .in(
        "drop_id",
        (dropRows ?? []).map(() => ""),
      );

    // Fetch restrictions
    const { data: restrictions } = await supabase
      .from("user_restrictions")
      .select(
        "id, type, reason, internal_notes, expires_at, is_active, created_at, admin:profiles!user_restrictions_admin_id_fkey(username, display_name)",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    return {
      ...profile,
      account_status:
        (profile.account_status as AccountStatus) ||
        (profile.is_suspended ? "suspended" : "active"),
      is_verified: Boolean(profile.is_verified),
      is_admin: Boolean(profile.is_admin),
      warning_count: profile.warning_count ?? 0,
      suspended_until: profile.suspended_until ?? null,
      total_drops: dropCount ?? 0,
      total_sparks_received: totalSparks,
      total_echoes: totalEchoes,
      total_relays: totalRelays,
      restrictions: (restrictions as unknown as UserRestrictionRecord[]) ?? [],
      reports_against: reportsCount ?? 0,
    };
  } catch (err) {
    console.error("fetchAdminUserDetail error:", err);
    return null;
  }
}

export async function restrictUser(params: {
  userId: string;
  type: "warning" | "suspension" | "ban";
  reason: string;
  notes?: string | null | undefined;
  durationHours?: number | null | undefined;
}): Promise<boolean> {
  try {
    const { error } = await supabase.rpc(
      "admin_restrict_user" as never,
      {
        p_user_id: params.userId,
        p_type: params.type,
        p_reason: params.reason,
        p_notes: params.notes ?? null,
        p_duration_hours: params.durationHours ?? null,
      } as never,
    );

    return !error;
  } catch {
    return false;
  }
}

export async function restoreUser(userId: string, reason: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc(
      "admin_restore_user" as never,
      {
        p_user_id: userId,
        p_reason: reason,
      } as never,
    );

    return !error;
  } catch {
    return false;
  }
}

export async function verifyUser(userId: string, isVerified: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({ is_verified: isVerified } as never)
      .eq("id", userId);

    return !error;
  } catch {
    return false;
  }
}

// -----------------------------------------------------------------------------
// PHASE 2: ADVANCED USER INTELLIGENCE & MANAGEMENT API
// -----------------------------------------------------------------------------

export interface AdvancedUserFilterOptions extends UserFilterOptions {
  registeredWithin?: "all" | "today" | "7d" | "30d" | "90d";
}

export interface AdvancedUsersResult {
  users: AdminUserListItem[];
  totalCount: number;
  activeCount: number;
  restrictedCount: number;
  totalOverall: number;
  page: number;
  limit: number;
}

export async function fetchAdminUsersAdvanced(
  options: AdvancedUserFilterOptions = {},
): Promise<AdvancedUsersResult> {
  const {
    search = "",
    status = "all",
    verified = "all",
    registeredWithin = "all",
    sortBy = "created_at",
    sortOrder = "desc",
    page = 1,
    limit = 15,
  } = options;

  try {
    const { data, error } = await supabase.rpc(
      "admin_get_users_advanced" as never,
      {
        p_search: search.trim() || null,
        p_status: status,
        p_verified: verified === "all" ? "all" : verified ? "verified" : "unverified",
        p_registered_within: registeredWithin,
        p_sort_by: sortBy,
        p_sort_order: sortOrder,
        p_page: page,
        p_limit: limit,
      } as never,
    );

    if (!error && data) {
      const res = data as unknown as {
        users: AdminUserListItem[];
        total_count: number;
        active_count: number;
        restricted_count: number;
        total_overall: number;
        page: number;
        limit: number;
      };
      return {
        users: res.users ?? [],
        totalCount: res.total_count ?? 0,
        activeCount: res.active_count ?? 0,
        restrictedCount: res.restricted_count ?? 0,
        totalOverall: res.total_overall ?? 0,
        page: res.page ?? page,
        limit: res.limit ?? limit,
      };
    }
  } catch (err) {
    console.warn("admin_get_users_advanced RPC fallback:", err);
  }

  // Graceful fallback to client query
  const fallback = await fetchAdminUsers(options);
  return {
    users: fallback.users,
    totalCount: fallback.totalCount,
    activeCount: fallback.users.filter((u) => u.account_status === "active").length,
    restrictedCount: fallback.users.filter((u) => u.account_status !== "active").length,
    totalOverall: fallback.totalCount,
    page,
    limit,
  };
}

export async function fetchUserIntelligence(userId: string): Promise<UserIntelligenceData | null> {
  try {
    const { data, error } = await supabase.rpc(
      "admin_get_user_intelligence" as never,
      {
        p_target_user_id: userId,
      } as never,
    );

    if (!error && data) {
      return data as unknown as UserIntelligenceData;
    }
  } catch (err) {
    console.warn("admin_get_user_intelligence RPC fallback:", err);
  }

  // Fallback: construct from base tables
  const baseDetail = await fetchAdminUserDetail(userId);
  if (!baseDetail) return null;

  const { data: drops } = await supabase
    .from("drops")
    .select(
      "id, content, spark_count, echo_count, relay_count, pass_count, is_pinned, is_hidden, moderation_status, moderation_reason, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  const now = Date.now();
  const createdTime = new Date(baseDetail.created_at).getTime();
  const ageDays = Math.max(Math.floor((now - createdTime) / (1000 * 60 * 60 * 24)), 0);

  return {
    profile: baseDetail,
    metrics: {
      account_age_days: ageDays,
      total_drops: baseDetail.total_drops || (drops?.length ?? 0),
      total_orbiters: baseDetail.followers_count || 0,
      total_orbiting: baseDetail.following_count || 0,
      total_sparks_received: baseDetail.total_sparks_received || 0,
      total_echoes_received: baseDetail.total_echoes || 0,
      total_relays_received: baseDetail.total_relays || 0,
      total_sparks_given: 0,
      total_echoes_created: 0,
      total_relays_created: 0,
      reports_against_count: baseDetail.reports_against || 0,
      reports_filed_count: 0,
      posting_frequency_weekly: Number(
        ((baseDetail.total_drops || 0) / Math.max(ageDays > 7 ? ageDays / 7 : 1, 1)).toFixed(2),
      ),
    },
    recent_drops: (drops as unknown as UserIntelligenceData["recent_drops"]) ?? [],
    restrictions: baseDetail.restrictions || [],
    audit_history: [],
    reports: {
      reports_against: [],
      reports_submitted: [],
    },
  };
}

export async function fetchUserTimeline(
  userId: string,
  limit: number = 50,
): Promise<UserTimelineEvent[]> {
  try {
    const { data, error } = await supabase.rpc(
      "admin_get_user_timeline" as never,
      {
        p_target_user_id: userId,
        p_limit: limit,
      } as never,
    );

    if (!error && data) {
      return (data as unknown as UserTimelineEvent[]) ?? [];
    }
  } catch (err) {
    console.warn("admin_get_user_timeline RPC fallback:", err);
  }

  // Fallback: construct timeline from drops and restrictions
  try {
    const { data: drops } = await supabase
      .from("drops")
      .select("id, content, created_at, spark_count, echo_count, moderation_status")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    const { data: restrictions } = await supabase
      .from("user_restrictions")
      .select("id, type, reason, created_at, expires_at, is_active")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const events: UserTimelineEvent[] = [];

    (drops ?? []).forEach((d) => {
      events.push({
        event_type: "drop_published",
        description: `Published drop: ${d.content?.slice(0, 45) || ""}`,
        created_at: d.created_at,
        entity_id: d.id,
        metadata: {
          content: d.content,
          sparks: d.spark_count,
          echoes: d.echo_count,
          status: d.moderation_status,
        },
      });
    });

    (restrictions ?? []).forEach((r) => {
      events.push({
        event_type: `restriction_${r.type}`,
        description: `Administrative ${r.type} issued: ${r.reason}`,
        created_at: r.created_at,
        entity_id: r.id,
        metadata: {
          type: r.type,
          reason: r.reason,
          expires_at: r.expires_at,
          is_active: r.is_active,
        },
      });
    });

    events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return events.slice(0, limit);
  } catch {
    return [];
  }
}

export async function fetchUserOrbitNetwork(
  userId: string,
  type: "orbiters" | "orbiting" = "orbiters",
  search: string = "",
  page: number = 1,
  limit: number = 20,
): Promise<{ connections: UserNetworkConnection[]; totalCount: number }> {
  try {
    const { data, error } = await supabase.rpc(
      "admin_get_user_network" as never,
      {
        p_target_user_id: userId,
        p_type: type,
        p_search: search.trim() || null,
        p_page: page,
        p_limit: limit,
      } as never,
    );

    if (!error && data) {
      const res = data as unknown as {
        connections: UserNetworkConnection[];
        total_count: number;
      };
      return {
        connections: res.connections ?? [],
        totalCount: res.total_count ?? 0,
      };
    }
  } catch (err) {
    console.warn("admin_get_user_network RPC fallback:", err);
  }

  // Fallback: direct query
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    if (type === "orbiters") {
      const { data, count } = await supabase
        .from("orbits")
        .select(
          `
          created_at,
          follower:profiles!orbits_follower_id_fkey(
            id, username, display_name, avatar_emoji, avatar_color, bio, account_status, is_verified, followers_count, following_count
          )
        `,
          { count: "exact" },
        )
        .eq("followed_id", userId)
        .range(from, to)
        .order("created_at", { ascending: false });

      const connections: UserNetworkConnection[] = (
        (data as unknown as Array<{ follower: UserNetworkConnection; created_at: string }>) ?? []
      ).map((row) => ({
        ...row.follower,
        connected_at: row.created_at,
        is_mutual: false,
      }));

      return { connections, totalCount: count ?? 0 };
    } else {
      const { data, count } = await supabase
        .from("orbits")
        .select(
          `
          created_at,
          followed:profiles!orbits_followed_id_fkey(
            id, username, display_name, avatar_emoji, avatar_color, bio, account_status, is_verified, followers_count, following_count
          )
        `,
          { count: "exact" },
        )
        .eq("follower_id", userId)
        .range(from, to)
        .order("created_at", { ascending: false });

      const connections: UserNetworkConnection[] = (
        (data as unknown as Array<{ followed: UserNetworkConnection; created_at: string }>) ?? []
      ).map((row) => ({
        ...row.followed,
        connected_at: row.created_at,
        is_mutual: false,
      }));

      return { connections, totalCount: count ?? 0 };
    }
  } catch {
    return { connections: [], totalCount: 0 };
  }
}

export async function bulkRestrictUsers(params: {
  userIds: string[];
  type: "warning" | "suspension" | "ban";
  reason: string;
  notes?: string | null | undefined;
  durationHours?: number | null | undefined;
}): Promise<{ processedCount: number; status: string }> {
  try {
    const { data, error } = await supabase.rpc(
      "admin_bulk_restrict_users" as never,
      {
        p_user_ids: params.userIds,
        p_type: params.type,
        p_reason: params.reason,
        p_notes: params.notes ?? null,
        p_duration_hours: params.durationHours ?? 24,
      } as never,
    );

    if (error) throw error;
    const res = data as unknown as { processed_count: number; status: string };
    return {
      processedCount: res.processed_count ?? 0,
      status: res.status ?? "success",
    };
  } catch (err) {
    console.error("bulkRestrictUsers error:", err);
    throw err;
  }
}

export async function logUserExport(
  exportCount: number,
  filters: Record<string, unknown> = {},
): Promise<void> {
  try {
    await supabase.rpc(
      "admin_log_user_export" as never,
      {
        p_export_count: exportCount,
        p_filters: filters,
      } as never,
    );
  } catch (err) {
    console.warn("logUserExport error:", err);
  }
}

export function exportUsersToCsv(
  users: AdminUserListItem[],
  filename: string = "blurbbi-users-export.csv",
): void {
  const headers = [
    "User ID",
    "Username",
    "Display Name",
    "Account Status",
    "Verified",
    "Drops Count",
    "Orbiters",
    "Orbiting",
    "Warning Count",
    "Joined Date",
    "Suspended Until",
  ];

  const escapeCsv = (str: unknown): string => {
    if (str === null || str === undefined) return "";
    const s = String(str);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = users.map((u) => [
    escapeCsv(u.id),
    escapeCsv(`@${u.username}`),
    escapeCsv(u.display_name),
    escapeCsv(u.account_status),
    escapeCsv(u.is_verified ? "Yes" : "No"),
    escapeCsv(u.drops_count ?? u.total_drops ?? 0),
    escapeCsv(u.followers_count ?? 0),
    escapeCsv(u.following_count ?? 0),
    escapeCsv(u.warning_count ?? 0),
    escapeCsv(new Date(u.created_at).toISOString()),
    escapeCsv(u.suspended_until ? new Date(u.suspended_until).toISOString() : "N/A"),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// -----------------------------------------------------------------------------
// 4. CONTENT / DROP MANAGEMENT
// -----------------------------------------------------------------------------

export interface DropFilterOptions {
  search?: string;
  moderationStatus?: DropModerationStatus | "all";
  userId?: string;
  page?: number;
  limit?: number;
  sortBy?: "created_at" | "spark_count" | "relay_count";
}

export async function fetchAdminDrops(
  options: DropFilterOptions = {},
): Promise<{ drops: AdminDropListItem[]; totalCount: number }> {
  const {
    search = "",
    moderationStatus = "all",
    userId,
    page = 1,
    limit = 20,
    sortBy = "created_at",
  } = options;

  try {
    let query = supabase.from("drops").select(
      `
        id, content, spark_count, echo_count, relay_count, pass_count,
        is_pinned, is_hidden, moderation_status, moderation_reason, created_at, user_id,
        author:profiles!drops_user_id_fkey(username, display_name, avatar_emoji, avatar_color, account_status)
      `,
      { count: "exact" },
    );

    if (search.trim()) {
      query = query.ilike("content", `%${search.trim()}%`);
    }

    if (moderationStatus !== "all") {
      query = query.eq("moderation_status", moderationStatus);
    }

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.order(sortBy, { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      drops: (data as unknown as AdminDropListItem[]) ?? [],
      totalCount: count ?? 0,
    };
  } catch (err) {
    console.error("fetchAdminDrops error:", err);
    return { drops: [], totalCount: 0 };
  }
}

export async function moderateDrop(params: {
  dropId: string;
  action: "hide" | "unhide" | "remove" | "restore" | "pin" | "unpin";
  reason?: string | null | undefined;
}): Promise<boolean> {
  try {
    const { error } = await supabase.rpc(
      "admin_moderate_drop" as never,
      {
        p_drop_id: params.dropId,
        p_action: params.action,
        p_reason: params.reason ?? null,
      } as never,
    );

    return !error;
  } catch {
    return false;
  }
}

// -----------------------------------------------------------------------------
// 5. REPORT & MODERATION CENTER
// -----------------------------------------------------------------------------

export interface ReportFilterOptions {
  status?: ReportStatus | "all";
  category?: ReportCategory | "all";
  page?: number;
  limit?: number;
}

export async function fetchAdminReports(
  options: ReportFilterOptions = {},
): Promise<{ reports: AdminReportListItem[]; totalCount: number }> {
  const { status = "all", category = "all", page = 1, limit = 25 } = options;

  try {
    let query = supabase.from("reports").select(
      `
        id, drop_id, reporter_id, reason, category, note, internal_notes,
        status, assigned_to, created_at, resolved_at, resolution_action,
        drop:drops(
          id, content, user_id, created_at,
          author:profiles(id, username, display_name, avatar_emoji, avatar_color)
        ),
        reporter:profiles!reports_reporter_id_fkey(id, username, display_name)
      `,
      { count: "exact" },
    );

    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (category !== "all") {
      query = query.eq("category", category);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      reports: (data as unknown as AdminReportListItem[]) ?? [],
      totalCount: count ?? 0,
    };
  } catch (err) {
    console.error("fetchAdminReports error:", err);
    return { reports: [], totalCount: 0 };
  }
}

export async function manageReport(params: {
  reportId: string;
  action: "assign" | "under_review" | "dismiss" | "resolve" | "delete_content" | "suspend_user";
  assignedTo?: string | null | undefined;
  notes?: string | null | undefined;
}): Promise<boolean> {
  try {
    const { error } = await supabase.rpc(
      "admin_manage_report" as never,
      {
        p_report_id: params.reportId,
        p_action: params.action,
        p_assigned_to: params.assignedTo ?? null,
        p_notes: params.notes ?? null,
      } as never,
    );

    return !error;
  } catch {
    return false;
  }
}

// -----------------------------------------------------------------------------
// 6. AUDIT LOGS
// -----------------------------------------------------------------------------

export async function fetchAdminAuditLogs(
  options: {
    actionType?: string;
    targetType?:
      "user" | "drop" | "report" | "setting" | "feature_flag" | "role" | "announcement" | "all";
    page?: number;
    limit?: number;
  } = {},
): Promise<{ logs: AdminAuditLogItem[]; totalCount: number }> {
  const { actionType, targetType, page = 1, limit = 30 } = options;

  try {
    let query = supabase.from("admin_audit_logs").select(
      `
        id, admin_id, action_type, target_type, target_id,
        previous_state, new_state, reason, metadata, created_at,
        admin:profiles!admin_audit_logs_admin_id_fkey(username, display_name)
      `,
      { count: "exact" },
    );

    if (actionType) {
      query = query.eq("action_type", actionType);
    }

    if (targetType && targetType !== "all") {
      query = query.eq("target_type", targetType);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      logs: (data as unknown as AdminAuditLogItem[]) ?? [],
      totalCount: count ?? 0,
    };
  } catch (err) {
    console.error("fetchAdminAuditLogs error:", err);
    return { logs: [], totalCount: 0 };
  }
}

// -----------------------------------------------------------------------------
// 7. ANNOUNCEMENTS
// -----------------------------------------------------------------------------

export async function fetchAnnouncements(): Promise<PlatformAnnouncementItem[]> {
  try {
    const { data, error } = await supabase
      .from("platform_announcements")
      .select("*, author:profiles!platform_announcements_created_by_fkey(username)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as unknown as PlatformAnnouncementItem[]) ?? [];
  } catch {
    return [];
  }
}

export async function createAnnouncement(params: {
  title: string;
  content: string;
  type: "general" | "feature_update" | "maintenance" | "important";
  audience: "all" | "verified" | "new_users";
  scheduledFor?: string | null;
}): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.from("platform_announcements").insert({
      title: params.title,
      content: params.content,
      type: params.type,
      audience: params.audience,
      status: params.scheduledFor ? "scheduled" : "draft",
      scheduled_for: params.scheduledFor ?? null,
      created_by: user.id,
    } as never);

    return !error;
  } catch {
    return false;
  }
}

export async function publishAnnouncement(announcementId: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc(
      "admin_publish_announcement" as never,
      {
        p_announcement_id: announcementId,
      } as never,
    );

    return !error;
  } catch {
    return false;
  }
}

// -----------------------------------------------------------------------------
// 8. FEATURE FLAGS & PLATFORM SETTINGS
// -----------------------------------------------------------------------------

export async function fetchFeatureFlags(): Promise<FeatureFlagItem[]> {
  try {
    const { data } = await supabase.from("platform_feature_flags").select("*").order("name");
    return (data as unknown as FeatureFlagItem[]) ?? [];
  } catch {
    return [];
  }
}

export async function toggleFeatureFlag(
  id: string,
  isEnabled: boolean,
  rolloutPct = 100,
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("platform_feature_flags")
      .update({
        is_enabled: isEnabled,
        rollout_pct: rolloutPct,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", id);

    return !error;
  } catch {
    return false;
  }
}

export async function fetchPlatformSettings(): Promise<PlatformSettingItem[]> {
  try {
    const { data } = await supabase.from("platform_settings").select("*").order("category");
    return (data as unknown as PlatformSettingItem[]) ?? [];
  } catch {
    return [];
  }
}

export async function updatePlatformSetting(key: string, value: unknown): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("platform_settings")
      .update({
        value: JSON.stringify(value),
        updated_at: new Date().toISOString(),
      } as never)
      .eq("key", key);

    return !error;
  } catch {
    return false;
  }
}

// -----------------------------------------------------------------------------
// 9. ADMIN ROLES MANAGEMENT (Super Admin Only)
// -----------------------------------------------------------------------------

export interface AdminUserRoleItem {
  id: string;
  user_id: string;
  role_id: AdminRole;
  assigned_at: string;
  user: {
    username: string;
    display_name: string;
    avatar_emoji: string;
    avatar_color: string;
  };
}

export async function fetchAdminUserRoles(): Promise<AdminUserRoleItem[]> {
  try {
    const { data, error } = await supabase
      .from("admin_user_roles")
      .select(
        "id, user_id, role_id, assigned_at, user:profiles!admin_user_roles_user_id_fkey(username, display_name, avatar_emoji, avatar_color)",
      )
      .order("assigned_at", { ascending: false });

    if (error) throw error;
    return (data as unknown as AdminUserRoleItem[]) ?? [];
  } catch {
    return [];
  }
}

export async function manageAdminRole(params: {
  targetUserId: string;
  roleId: AdminRole;
  action: "assign" | "revoke";
}): Promise<boolean> {
  try {
    const { error } = await supabase.rpc(
      "admin_manage_role" as never,
      {
        p_target_user_id: params.targetUserId,
        p_role_id: params.roleId,
        p_action: params.action,
      } as never,
    );

    return !error;
  } catch {
    return false;
  }
}

// -----------------------------------------------------------------------------
// 10. GLOBAL ADMIN SEARCH
// -----------------------------------------------------------------------------

export interface AdminGlobalSearchResults {
  users: Array<{ id: string; username: string; display_name: string; account_status: string }>;
  drops: Array<{ id: string; content: string; author_username: string }>;
  reports: Array<{ id: string; reason: string; status: string; drop_id: string }>;
}

export async function globalAdminSearch(queryText: string): Promise<AdminGlobalSearchResults> {
  if (!queryText.trim() || queryText.length < 2) {
    return { users: [], drops: [], reports: [] };
  }

  const s = `%${queryText.trim()}%`;

  const [usersRes, dropsRes, reportsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, display_name, account_status")
      .or(`username.ilike.${s},display_name.ilike.${s}`)
      .limit(5),
    supabase
      .from("drops")
      .select("id, content, profiles!drops_user_id_fkey(username)")
      .ilike("content", s)
      .limit(5),
    supabase
      .from("reports")
      .select("id, reason, status, drop_id")
      .or(`reason.ilike.${s},note.ilike.${s}`)
      .limit(5),
  ]);

  return {
    users: (usersRes.data ?? []).map((u) => ({
      id: u.id,
      username: u.username,
      display_name: u.display_name,
      account_status: u.account_status ?? "active",
    })),
    drops: (dropsRes.data ?? []).map((d) => ({
      id: d.id,
      content: d.content,
      author_username: (d.profiles as unknown as { username: string })?.username ?? "unknown",
    })),
    reports: (reportsRes.data ?? []).map((r) => ({
      id: r.id,
      reason: r.reason,
      status: r.status,
      drop_id: r.drop_id,
    })),
  };
}

// -----------------------------------------------------------------------------
// 11. ADMIN INVITATIONS & ACCESS CONTROL
// -----------------------------------------------------------------------------

export interface AdminInvitationItem {
  id: string;
  email: string;
  user_id: string | null;
  role_id: AdminRole;
  invited_by: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  status: "pending" | "accepted" | "expired" | "revoked";
  created_at: string;
  inviter?: {
    username: string;
    display_name: string;
  };
}

export async function fetchAdminInvitations(): Promise<AdminInvitationItem[]> {
  try {
    const { data, error } = await supabase
      .from("admin_invitations")
      .select(
        `
        id, email, user_id, role_id, invited_by, token, expires_at,
        accepted_at, revoked_at, status, created_at,
        inviter:profiles!admin_invitations_invited_by_fkey(username, display_name)
      `,
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as unknown as AdminInvitationItem[]) ?? [];
  } catch (err) {
    console.error("fetchAdminInvitations error:", err);
    return [];
  }
}

export async function createAdminInvitation(
  email: string,
  roleId: AdminRole,
): Promise<{ token: string; id: string } | null> {
  try {
    const { data, error } = await supabase.rpc(
      "admin_create_invitation" as never,
      {
        p_email: email,
        p_role_id: roleId,
      } as never,
    );

    if (error || !data) throw error || new Error("Failed to create invitation");
    return data as unknown as { token: string; id: string };
  } catch (err) {
    console.error("createAdminInvitation error:", err);
    return null;
  }
}

export async function acceptAdminInvitation(token: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc(
      "admin_accept_invitation" as never,
      {
        p_token: token,
      } as never,
    );

    return !error;
  } catch (err) {
    console.error("acceptAdminInvitation error:", err);
    return false;
  }
}

export async function revokeAdminInvitation(invitationId: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc(
      "admin_revoke_invitation" as never,
      {
        p_invitation_id: invitationId,
      } as never,
    );

    return !error;
  } catch (err) {
    console.error("revokeAdminInvitation error:", err);
    return false;
  }
}

export async function recordAdminLogin(metadata: Record<string, unknown> = {}): Promise<void> {
  try {
    await supabase.rpc(
      "admin_record_login" as never,
      {
        p_metadata: metadata,
      } as never,
    );
  } catch (err) {
    console.warn("recordAdminLogin error:", err);
  }
}

export async function verifyAdminSession(): Promise<{
  authorized: boolean;
  role: AdminRole | null;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { authorized: false, role: null };

    const role = await getCurrentAdminRole();
    return {
      authorized: Boolean(role),
      role,
    };
  } catch {
    return { authorized: false, role: null };
  }
}

-- =============================================================================
-- Blurbbi Advanced Super Admin Control Center: Schema & Security Migration
-- =============================================================================

-- 1. PROFILES ENHANCEMENTS (Account Status & Restrictions)
alter table public.profiles add column if not exists is_admin boolean default false;
alter table public.profiles add column if not exists is_suspended boolean default false;
alter table public.profiles add column if not exists account_status text not null default 'active';
alter table public.profiles add column if not exists suspended_until timestamptz;
alter table public.profiles add column if not exists ban_reason text;
alter table public.profiles add column if not exists warning_count integer not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_account_status_check') then
    alter table public.profiles add constraint profiles_account_status_check
      check (account_status in ('active', 'warned', 'suspended', 'banned'));
  end if;
end $$;

-- 2. DROPS ENHANCEMENTS (Content Moderation Flags)
alter table public.drops add column if not exists is_pinned boolean not null default false;
alter table public.drops add column if not exists is_hidden boolean not null default false;
alter table public.drops add column if not exists moderation_status text not null default 'approved';
alter table public.drops add column if not exists moderation_reason text;
alter table public.drops add column if not exists moderated_by uuid references public.profiles(id);
alter table public.drops add column if not exists moderated_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'drops_moderation_status_check') then
    alter table public.drops add constraint drops_moderation_status_check
      check (moderation_status in ('approved', 'flagged', 'hidden', 'removed'));
  end if;
end $$;

-- 3. REPORTS ENHANCEMENTS (Workflow & Categories)
alter table public.reports add column if not exists category text not null default 'other';
alter table public.reports add column if not exists assigned_to uuid references public.profiles(id);
alter table public.reports add column if not exists internal_notes text;
alter table public.reports add column if not exists status text not null default 'pending';
alter table public.reports add column if not exists resolved_by uuid references public.profiles(id);
alter table public.reports add column if not exists resolved_at timestamptz;
alter table public.reports add column if not exists resolution_action text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'reports_status_check') then
    alter table public.reports add constraint reports_status_check
      check (status in ('pending', 'under_review', 'resolved', 'dismissed'));
  end if;
end $$;

-- 4. ROLE-BASED ACCESS CONTROL (RBAC) TABLES
create table if not exists public.admin_roles (
  id text primary key,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_permissions (
  id text primary key,
  name text not null,
  module text not null,
  description text
);

create table if not exists public.admin_role_permissions (
  role_id text not null references public.admin_roles(id) on delete cascade,
  permission_id text not null references public.admin_permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table if not exists public.admin_user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id text not null references public.admin_roles(id) on delete cascade,
  assigned_by uuid references public.profiles(id),
  assigned_at timestamptz not null default now(),
  unique (user_id, role_id)
);

-- Seed Standard Admin Roles
insert into public.admin_roles (id, name, description)
values
  ('super_admin', 'Super Administrator', 'Unrestricted system control, admin role management, and system configuration'),
  ('admin', 'Administrator', 'Platform operations, user moderation, drop management, and analytics inspection'),
  ('moderator', 'Content Moderator', 'Report review, drop moderation, user warning and temporary suspension'),
  ('support', 'Customer Support', 'User profile inspection, account status review, and assistance handling'),
  ('analyst', 'Platform Analyst', 'Read-only access to platform metrics, telemetry, and growth reports')
on conflict (id) do update set name = excluded.name, description = excluded.description;

-- Seed Standard Permissions
insert into public.admin_permissions (id, name, module, description)
values
  ('users.view', 'View Users', 'users', 'Inspect user list and profiles'),
  ('users.manage', 'Manage Users', 'users', 'Edit permitted profile attributes and verify accounts'),
  ('users.restrict', 'Restrict Users', 'users', 'Issue warnings, suspensions, and bans'),
  ('drops.view', 'View Drops', 'content', 'Inspect all platform content including flagged items'),
  ('drops.moderate', 'Moderate Drops', 'content', 'Hide, remove, restore, or pin drops'),
  ('reports.review', 'Review Reports', 'moderation', 'Manage report triage, assignees, and resolution actions'),
  ('analytics.view', 'View Analytics', 'analytics', 'Access platform KPI dashboards and activity reports'),
  ('announcements.manage', 'Manage Announcements', 'announcements', 'Create and broadcast platform announcements'),
  ('settings.manage', 'Manage Settings', 'settings', 'Configure platform settings, algorithms, and feature flags'),
  ('roles.manage', 'Manage Admin Roles', 'roles', 'Assign, update, and revoke administrative privileges')
on conflict (id) do nothing;

-- Seed Role Permissions Mapping
insert into public.admin_role_permissions (role_id, permission_id)
select 'super_admin', id from public.admin_permissions
on conflict do nothing;

insert into public.admin_role_permissions (role_id, permission_id)
values
  ('admin', 'users.view'),
  ('admin', 'users.manage'),
  ('admin', 'users.restrict'),
  ('admin', 'drops.view'),
  ('admin', 'drops.moderate'),
  ('admin', 'reports.review'),
  ('admin', 'analytics.view'),
  ('admin', 'announcements.manage')
on conflict do nothing;

insert into public.admin_role_permissions (role_id, permission_id)
values
  ('moderator', 'users.view'),
  ('moderator', 'users.restrict'),
  ('moderator', 'drops.view'),
  ('moderator', 'drops.moderate'),
  ('moderator', 'reports.review')
on conflict do nothing;

insert into public.admin_role_permissions (role_id, permission_id)
values
  ('support', 'users.view'),
  ('support', 'drops.view'),
  ('support', 'reports.review')
on conflict do nothing;

insert into public.admin_role_permissions (role_id, permission_id)
values
  ('analyst', 'analytics.view')
on conflict do nothing;

-- 5. USER RESTRICTIONS AUDIT TABLE
create table if not exists public.user_restrictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  admin_id uuid not null references public.profiles(id),
  type text not null check (type in ('warning', 'suspension', 'ban')),
  reason text not null,
  internal_notes text,
  expires_at timestamptz,
  is_active boolean not null default true,
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id),
  revocation_reason text,
  created_at timestamptz not null default now()
);

-- 6. APPEND-ONLY AUDIT LOGS TABLE
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id),
  action_type text not null,
  target_type text not null check (target_type in ('user', 'drop', 'report', 'setting', 'feature_flag', 'role', 'announcement')),
  target_id text not null,
  previous_state jsonb,
  new_state jsonb,
  reason text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- 7. PLATFORM ANNOUNCEMENTS TABLE
create table if not exists public.platform_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  type text not null default 'general' check (type in ('general', 'feature_update', 'maintenance', 'important')),
  audience text not null default 'all' check (audience in ('all', 'verified', 'new_users')),
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published', 'archived')),
  scheduled_for timestamptz,
  published_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- 8. FEATURE FLAGS & PLATFORM SETTINGS
create table if not exists public.platform_feature_flags (
  id text primary key,
  name text not null,
  description text,
  category text not null default 'core',
  is_enabled boolean not null default false,
  rollout_pct integer not null default 100 check (rollout_pct between 0 and 100),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  description text,
  category text not null default 'general',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

-- Seed Baseline Platform Settings & Feature Flags
insert into public.platform_feature_flags (id, name, description, category, is_enabled, rollout_pct)
values
  ('feed_v2_ranking', 'Dynamic Feed v2 Ranking', 'Enables dynamic gravity decay and multi-weight scoring', 'algorithm', true, 100),
  ('creator_recommendations', 'Creator Discovery Feed', 'Surfaces high-momentum blurbers in explore feeds', 'discovery', true, 100),
  ('maintenance_mode_banner', 'System Maintenance Notice', 'Displays scheduled maintenance notification banner', 'system', false, 0),
  ('public_read_guest_stream', 'Guest Stream Browsing', 'Permits unauthenticated visitors to read public stream', 'core', true, 100),
  ('hashtag_streams', 'Clickable #Hashtag Topics', 'Auto-links hashtags to dedicated topic timelines', 'content', true, 100)
on conflict (id) do nothing;

insert into public.platform_settings (key, value, description, category)
values
  ('maintenance_mode', 'false'::jsonb, 'When enabled, locks all drop composition and interactions', 'system'),
  ('registrations_enabled', 'true'::jsonb, 'Allow new user account creation', 'auth'),
  ('max_drop_length', '500'::jsonb, 'Maximum character limit per drop post', 'content'),
  ('rate_limit_drops_per_hour', '30'::jsonb, 'Anti-spam threshold for drops published per user per hour', 'safety'),
  ('auto_moderation_spam_filter', 'true'::jsonb, 'Heuristic filter for rapid repetitive links', 'safety')
on conflict (key) do nothing;

-- 9. PERFORMANCE INDEXES
create index if not exists admin_user_roles_user_idx on public.admin_user_roles (user_id);
create index if not exists user_restrictions_user_idx on public.user_restrictions (user_id, is_active);
create index if not exists user_restrictions_expires_idx on public.user_restrictions (expires_at) where is_active;
create index if not exists admin_audit_logs_created_idx on public.admin_audit_logs (created_at desc);
create index if not exists admin_audit_logs_target_idx on public.admin_audit_logs (target_type, target_id);
create index if not exists admin_audit_logs_admin_idx on public.admin_audit_logs (admin_id, created_at desc);
create index if not exists announcements_status_idx on public.platform_announcements (status, published_at desc);
create index if not exists drops_moderation_status_idx on public.drops (moderation_status, created_at desc);
create index if not exists profiles_account_status_idx on public.profiles (account_status);

-- 10. SECURITY DEFINER RBAC HELPERS

-- Get highest admin role of a user
create or replace function public.get_admin_role(p_user_id uuid default auth.uid())
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if p_user_id is null then return null; end if;

  select r.role_id into v_role
  from public.admin_user_roles r
  where r.user_id = p_user_id
  order by case r.role_id
    when 'super_admin' then 1
    when 'admin' then 2
    when 'moderator' then 3
    when 'support' then 4
    when 'analyst' then 5
    else 6
  end asc
  limit 1;

  if v_role is not null then
    return v_role;
  end if;

  -- Fallback check on profiles.is_admin
  if exists (select 1 from public.profiles where id = p_user_id and is_admin = true) then
    return 'super_admin';
  end if;

  return null;
end;
$$;

-- Check if user has a specific permission
create or replace function public.has_admin_permission(p_permission text, p_user_id uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if p_user_id is null then return false; end if;

  v_role := public.get_admin_role(p_user_id);
  if v_role is null then return false; end if;
  if v_role = 'super_admin' then return true; end if;

  return exists (
    select 1
    from public.admin_role_permissions rp
    where rp.role_id = v_role and rp.permission_id = p_permission
  );
end;
$$;

-- Global is_admin check (true for any administrative role)
create or replace function public.is_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_admin_role(p_user_id) is not null;
$$;

-- Check if user is Super Admin
create or replace function public.is_super_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.get_admin_role(p_user_id) = 'super_admin', false);
$$;

-- 11. ENHANCED VIEWER HIDDEN (Enforces banned & suspended accounts and hidden drops)
create or replace function public.viewer_hidden(p_viewer uuid, p_drop uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.drops d
    join public.profiles author on author.id = d.user_id
    where d.id = p_drop and (
      d.is_hidden = true
      or d.moderation_status = 'removed'
      or author.account_status in ('suspended', 'banned')
      or author.is_suspended = true
      or (author.suspended_until is not null and author.suspended_until > now())
    )
  ) or (
    p_viewer is not null and (
      exists (select 1 from public.hides h where h.user_id = p_viewer and h.drop_id = p_drop)
      or exists (select 1 from public.reports r where r.reporter_id = p_viewer and r.drop_id = p_drop)
      or exists (
        select 1 from public.mutes m 
        where m.user_id = p_viewer 
          and m.muted_id = (select d.user_id from public.drops d where d.id = p_drop)
      )
    )
  );
$$;

-- 12. ROW-LEVEL SECURITY (RLS) POLICIES
alter table public.admin_roles enable row level security;
alter table public.admin_permissions enable row level security;
alter table public.admin_role_permissions enable row level security;
alter table public.admin_user_roles enable row level security;
alter table public.user_restrictions enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.platform_announcements enable row level security;
alter table public.platform_feature_flags enable row level security;
alter table public.platform_settings enable row level security;

-- Roles & permissions viewable by authenticated; managed by Super Admin
create policy "admin_roles_select" on public.admin_roles for select using (true);
create policy "admin_permissions_select" on public.admin_permissions for select using (true);
create policy "admin_role_permissions_select" on public.admin_role_permissions for select using (true);

create policy "admin_user_roles_select" on public.admin_user_roles for select to authenticated using (public.is_admin());
create policy "admin_user_roles_write" on public.admin_user_roles for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- User restrictions: viewable and manageable by admins with permission
create policy "user_restrictions_select" on public.user_restrictions for select to authenticated using (public.has_admin_permission('users.view'));
create policy "user_restrictions_write" on public.user_restrictions for all to authenticated
  using (public.has_admin_permission('users.restrict')) with check (public.has_admin_permission('users.restrict'));

-- Audit logs: append-only for admins; no update or delete allowed!
create policy "admin_audit_logs_select" on public.admin_audit_logs for select to authenticated using (public.is_admin());
create policy "admin_audit_logs_insert" on public.admin_audit_logs for insert to authenticated with check (public.is_admin());

-- Announcements: published ones readable by all; management by admins with permission
create policy "announcements_select_public" on public.platform_announcements for select
  using (status = 'published' or public.has_admin_permission('announcements.manage'));
create policy "announcements_write" on public.platform_announcements for all to authenticated
  using (public.has_admin_permission('announcements.manage')) with check (public.has_admin_permission('announcements.manage'));

-- Feature flags & Settings: readable by all (needed for client feature gating); writable by Super Admin / settings permission
create policy "platform_feature_flags_select" on public.platform_feature_flags for select using (true);
create policy "platform_feature_flags_write" on public.platform_feature_flags for all to authenticated
  using (public.has_admin_permission('settings.manage')) with check (public.has_admin_permission('settings.manage'));

create policy "platform_settings_select" on public.platform_settings for select using (true);
create policy "platform_settings_write" on public.platform_settings for all to authenticated
  using (public.has_admin_permission('settings.manage')) with check (public.has_admin_permission('settings.manage'));

-- Backend restriction on creating drops for banned/suspended accounts
drop policy if exists "drops_insert_own" on public.drops;
create policy "drops_insert_own" on public.drops for insert to authenticated with check (
  user_id = auth.uid()
  and not exists (
    select 1 from public.profiles
    where id = auth.uid() and (
      account_status in ('suspended', 'banned')
      or is_suspended = true
      or (suspended_until is not null and suspended_until > now())
    )
  )
);

-- 13. ADMINISTRATIVE ACTION RPC FUNCTIONS

-- A. Restrict User (Warn, Suspend, Ban) with Audit Logging
create or replace function public.admin_restrict_user(
  p_user_id uuid,
  p_type text, -- 'warning', 'suspension', 'ban'
  p_reason text,
  p_notes text default null,
  p_duration_hours integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_prev_status text;
  v_new_status text;
  v_expires timestamptz := null;
begin
  if not public.has_admin_permission('users.restrict', v_admin_id) then
    raise exception 'Unauthorized: Insufficient permissions to restrict user';
  end if;

  select account_status into v_prev_status from public.profiles where id = p_user_id;

  if p_type = 'warning' then
    v_new_status := 'warned';
    update public.profiles set
      account_status = case when account_status = 'active' then 'warned' else account_status end,
      warning_count = warning_count + 1
    where id = p_user_id;

  elsif p_type = 'suspension' then
    v_new_status := 'suspended';
    v_expires := now() + (coalesce(p_duration_hours, 24) || ' hours')::interval;
    update public.profiles set
      account_status = 'suspended',
      is_suspended = true,
      suspended_until = v_expires
    where id = p_user_id;

  elsif p_type = 'ban' then
    v_new_status := 'banned';
    update public.profiles set
      account_status = 'banned',
      is_suspended = true,
      ban_reason = p_reason
    where id = p_user_id;
  end if;

  -- Deactivate previous active restrictions of same type
  update public.user_restrictions
  set is_active = false
  where user_id = p_user_id and type = p_type and is_active = true;

  -- Insert new restriction record
  insert into public.user_restrictions (
    user_id, admin_id, type, reason, internal_notes, expires_at, is_active
  ) values (
    p_user_id, v_admin_id, p_type, p_reason, p_notes, v_expires, true
  );

  -- Log action to immutable audit trail
  insert into public.admin_audit_logs (
    admin_id, action_type, target_type, target_id, previous_state, new_state, reason, metadata
  ) values (
    v_admin_id,
    'user_' || p_type,
    'user',
    p_user_id::text,
    jsonb_build_object('account_status', v_prev_status),
    jsonb_build_object('account_status', v_new_status, 'expires_at', v_expires),
    p_reason,
    jsonb_build_object('notes', p_notes, 'duration_hours', p_duration_hours)
  );
end;
$$;

-- B. Restore User (Revoke Bans & Suspensions) with Audit Logging
create or replace function public.admin_restore_user(
  p_user_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_prev_status text;
begin
  if not public.has_admin_permission('users.restrict', v_admin_id) then
    raise exception 'Unauthorized: Insufficient permissions to restore user';
  end if;

  select account_status into v_prev_status from public.profiles where id = p_user_id;

  update public.profiles set
    account_status = 'active',
    is_suspended = false,
    suspended_until = null,
    ban_reason = null
  where id = p_user_id;

  -- Deactivate any active restrictions
  update public.user_restrictions set
    is_active = false,
    revoked_at = now(),
    revoked_by = v_admin_id,
    revocation_reason = p_reason
  where user_id = p_user_id and is_active = true;

  -- Audit log
  insert into public.admin_audit_logs (
    admin_id, action_type, target_type, target_id, previous_state, new_state, reason
  ) values (
    v_admin_id,
    'user_restore',
    'user',
    p_user_id::text,
    jsonb_build_object('account_status', v_prev_status),
    jsonb_build_object('account_status', 'active'),
    p_reason
  );
end;
$$;

-- C. Moderate Drop (Hide, Remove, Restore, Pin/Unpin) with Audit Logging
create or replace function public.admin_moderate_drop(
  p_drop_id uuid,
  p_action text, -- 'hide', 'unhide', 'remove', 'restore', 'pin', 'unpin'
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_drop public.drops%rowtype;
begin
  if not public.has_admin_permission('drops.moderate', v_admin_id) then
    raise exception 'Unauthorized: Insufficient permissions to moderate drops';
  end if;

  select * into v_drop from public.drops where id = p_drop_id;
  if not found then
    raise exception 'Drop not found';
  end if;

  if p_action = 'hide' then
    update public.drops set
      is_hidden = true,
      moderation_status = 'hidden',
      moderation_reason = p_reason,
      moderated_by = v_admin_id,
      moderated_at = now()
    where id = p_drop_id;

  elsif p_action = 'unhide' or p_action = 'restore' then
    update public.drops set
      is_hidden = false,
      moderation_status = 'approved',
      moderation_reason = null,
      moderated_by = v_admin_id,
      moderated_at = now()
    where id = p_drop_id;

  elsif p_action = 'remove' then
    update public.drops set
      is_hidden = true,
      moderation_status = 'removed',
      moderation_reason = p_reason,
      moderated_by = v_admin_id,
      moderated_at = now()
    where id = p_drop_id;

  elsif p_action = 'pin' then
    update public.drops set is_pinned = true where id = p_drop_id;

  elsif p_action = 'unpin' then
    update public.drops set is_pinned = false where id = p_drop_id;
  end if;

  -- Audit log
  insert into public.admin_audit_logs (
    admin_id, action_type, target_type, target_id, previous_state, new_state, reason
  ) values (
    v_admin_id,
    'drop_' || p_action,
    'drop',
    p_drop_id::text,
    jsonb_build_object('is_hidden', v_drop.is_hidden, 'moderation_status', v_drop.moderation_status, 'is_pinned', v_drop.is_pinned),
    jsonb_build_object('action', p_action),
    p_reason
  );
end;
$$;

-- D. Resolve / Update Moderation Report with Assignment
create or replace function public.admin_manage_report(
  p_report_id uuid,
  p_action text, -- 'assign', 'under_review', 'dismiss', 'resolve', 'delete_content', 'suspend_user'
  p_assigned_to uuid default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_report public.reports%rowtype;
  v_drop_author uuid;
begin
  if not public.has_admin_permission('reports.review', v_admin_id) then
    raise exception 'Unauthorized: Insufficient permissions to manage reports';
  end if;

  select * into v_report from public.reports where id = p_report_id;
  if not found then
    raise exception 'Report not found';
  end if;

  select user_id into v_drop_author from public.drops where id = v_report.drop_id;

  if p_action = 'assign' then
    update public.reports set
      assigned_to = p_assigned_to,
      status = 'under_review',
      internal_notes = coalesce(p_notes, internal_notes)
    where id = p_report_id;

  elsif p_action = 'dismiss' then
    update public.reports set
      status = 'dismissed',
      resolved_by = v_admin_id,
      resolved_at = now(),
      resolution_action = 'dismiss',
      internal_notes = coalesce(p_notes, internal_notes)
    where id = p_report_id;

  elsif p_action = 'resolve' then
    update public.reports set
      status = 'resolved',
      resolved_by = v_admin_id,
      resolved_at = now(),
      resolution_action = 'resolve',
      internal_notes = coalesce(p_notes, internal_notes)
    where id = p_report_id;

  elsif p_action = 'delete_content' then
    perform public.admin_moderate_drop(v_report.drop_id, 'remove', 'Report resolved: Content removed');
    update public.reports set
      status = 'resolved',
      resolved_by = v_admin_id,
      resolved_at = now(),
      resolution_action = 'delete_content',
      internal_notes = coalesce(p_notes, internal_notes)
    where id = p_report_id;

  elsif p_action = 'suspend_user' and v_drop_author is not null then
    perform public.admin_restrict_user(v_drop_author, 'suspension', 'Report resolved: User suspended', p_notes, 72);
    perform public.admin_moderate_drop(v_report.drop_id, 'remove', 'Report resolved: Author suspended');
    update public.reports set
      status = 'resolved',
      resolved_by = v_admin_id,
      resolved_at = now(),
      resolution_action = 'suspend_user',
      internal_notes = coalesce(p_notes, internal_notes)
    where id = p_report_id;
  end if;

  -- Audit log
  insert into public.admin_audit_logs (
    admin_id, action_type, target_type, target_id, reason, metadata
  ) values (
    v_admin_id,
    'report_' || p_action,
    'report',
    p_report_id::text,
    p_notes,
    jsonb_build_object('drop_id', v_report.drop_id, 'action', p_action)
  );
end;
$$;

-- E. Manage Admin Roles (Super Admin Only; Protects Last Active Super Admin)
create or replace function public.admin_manage_role(
  p_target_user_id uuid,
  p_role_id text,
  p_action text -- 'assign', 'revoke'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_super_admin_count integer;
begin
  if not public.is_super_admin(v_admin_id) then
    raise exception 'Unauthorized: Only Super Administrators can manage roles';
  end if;

  if p_action = 'revoke' and p_role_id = 'super_admin' then
    -- Count remaining super admins
    select count(*) into v_super_admin_count
    from public.admin_user_roles
    where role_id = 'super_admin' and user_id <> p_target_user_id;

    if v_super_admin_count = 0 then
      raise exception 'Operation aborted: Cannot remove the last active Super Administrator';
    end if;
  end if;

  if p_action = 'assign' then
    insert into public.admin_user_roles (user_id, role_id, assigned_by)
    values (p_target_user_id, p_role_id, v_admin_id)
    on conflict (user_id, role_id) do nothing;

    update public.profiles set is_admin = true where id = p_target_user_id;

  elsif p_action = 'revoke' then
    delete from public.admin_user_roles
    where user_id = p_target_user_id and role_id = p_role_id;

    -- If no roles remain, set profiles.is_admin = false
    if not exists (select 1 from public.admin_user_roles where user_id = p_target_user_id) then
      update public.profiles set is_admin = false where id = p_target_user_id;
    end if;
  end if;

  -- Audit log
  insert into public.admin_audit_logs (
    admin_id, action_type, target_type, target_id, reason, metadata
  ) values (
    v_admin_id,
    'role_' || p_action,
    'role',
    p_target_user_id::text,
    'Admin role changed',
    jsonb_build_object('role', p_role_id, 'action', p_action)
  );
end;
$$;

-- F. Publish Announcement & Notify Users
create or replace function public.admin_publish_announcement(
  p_announcement_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_announcement public.platform_announcements%rowtype;
begin
  if not public.has_admin_permission('announcements.manage', v_admin_id) then
    raise exception 'Unauthorized: Insufficient permissions to publish announcements';
  end if;

  select * into v_announcement from public.platform_announcements where id = p_announcement_id;
  if not found then
    raise exception 'Announcement not found';
  end if;

  update public.platform_announcements set
    status = 'published',
    published_at = now()
  where id = p_announcement_id;

  -- Broadcast notification to recipients based on audience
  insert into public.notifications (user_id, actor_id, type)
  select p.id, v_admin_id, 'spark' -- system notice type
  from public.profiles p
  where p.id <> v_admin_id
    and (
      v_announcement.audience = 'all'
      or (v_announcement.audience = 'verified' and p.is_verified = true)
      or (v_announcement.audience = 'new_users' and p.created_at > now() - interval '7 days')
    );

  -- Audit log
  insert into public.admin_audit_logs (
    admin_id, action_type, target_type, target_id, reason
  ) values (
    v_admin_id,
    'announcement_publish',
    'announcement',
    p_announcement_id::text,
    'Platform broadcast: ' || v_announcement.title
  );
end;
$$;

-- G. Comprehensive Platform Analytics Aggregator
create or replace function public.admin_get_platform_analytics(p_range text default '30d')
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_interval interval;
  v_result jsonb;
begin
  if not public.has_admin_permission('analytics.view', v_admin_id) then
    raise exception 'Unauthorized: Insufficient permissions to view analytics';
  end if;

  v_interval := case p_range
    when 'today' then interval '24 hours'
    when '7d' then interval '7 days'
    when '90d' then interval '90 days'
    else interval '30 days'
  end;

  select jsonb_build_object(
    'kpis', jsonb_build_object(
      'total_users', (select count(*) from public.profiles),
      'active_today', (select count(distinct user_id) from public.drops where created_at > now() - interval '24 hours'),
      'dau', (select count(distinct user_id) from public.drops where created_at > now() - interval '24 hours'),
      'wau', (select count(distinct user_id) from public.drops where created_at > now() - interval '7 days'),
      'mau', (select count(distinct user_id) from public.drops where created_at > now() - interval '30 days'),
      'total_drops', (select count(*) from public.drops),
      'total_sparks', (select coalesce(sum(spark_count), 0) from public.drops),
      'total_echoes', (select coalesce(sum(echo_count), 0) from public.drops),
      'total_relays', (select coalesce(sum(relay_count), 0) from public.drops),
      'pending_reports', (select count(*) from public.reports where status in ('pending', 'under_review')),
      'suspended_users', (select count(*) from public.profiles where account_status in ('suspended', 'banned'))
    ),
    'daily_registrations', (
      select coalesce(jsonb_agg(sub), '[]'::jsonb)
      from (
        select date_trunc('day', created_at)::date::text as day, count(*) as count
        from public.profiles
        where created_at > now() - v_interval
        group by 1
        order by 1 asc
      ) sub
    ),
    'daily_drops', (
      select coalesce(jsonb_agg(sub), '[]'::jsonb)
      from (
        select date_trunc('day', created_at)::date::text as day, count(*) as count
        from public.drops
        where created_at > now() - v_interval
        group by 1
        order by 1 asc
      ) sub
    ),
    'top_active_users', (
      select coalesce(jsonb_agg(sub), '[]'::jsonb)
      from (
        select p.id, p.username, p.display_name, p.avatar_emoji, p.avatar_color, count(d.id) as drops_count
        from public.profiles p
        join public.drops d on d.user_id = p.id
        where d.created_at > now() - v_interval
        group by p.id, p.username, p.display_name, p.avatar_emoji, p.avatar_color
        order by drops_count desc
        limit 5
      ) sub
    ),
    'top_engaged_drops', (
      select coalesce(jsonb_agg(sub), '[]'::jsonb)
      from (
        select d.id, d.content, p.username, d.spark_count, d.echo_count, d.relay_count, d.created_at
        from public.drops d
        join public.profiles p on p.id = d.user_id
        where d.created_at > now() - v_interval
        order by (d.spark_count * 3 + d.relay_count * 5 + d.echo_count * 2) desc
        limit 5
      ) sub
    )
  ) into v_result;

  return v_result;
end;
$$;

-- 14. EXECUTION GRANTS
grant execute on function public.get_admin_role(uuid) to anon, authenticated;
grant execute on function public.has_admin_permission(text, uuid) to anon, authenticated;
grant execute on function public.is_admin(uuid) to anon, authenticated;
grant execute on function public.is_super_admin(uuid) to anon, authenticated;
grant execute on function public.viewer_hidden(uuid, uuid) to anon, authenticated;
grant execute on function public.admin_restrict_user(uuid, text, text, text, integer) to authenticated;
grant execute on function public.admin_restore_user(uuid, text) to authenticated;
grant execute on function public.admin_moderate_drop(uuid, text, text) to authenticated;
grant execute on function public.admin_manage_report(uuid, text, uuid, text) to authenticated;
grant execute on function public.admin_manage_role(uuid, text, text) to authenticated;
grant execute on function public.admin_publish_announcement(uuid) to authenticated;
grant execute on function public.admin_get_platform_analytics(text) to authenticated;


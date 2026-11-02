-- =============================================================================
-- BLURBBI CONTROL CENTER – PHASE 2: ADVANCED USER INTELLIGENCE & MANAGEMENT
-- Database Migrations, Indexes, and Security Definer RPC Functions
-- =============================================================================

-- 1. INDEXES FOR PERFORMANCE OPTIMIZATION
create index if not exists idx_profiles_username_lower on public.profiles (lower(username));
create index if not exists idx_profiles_display_name_lower on public.profiles (lower(display_name));
create index if not exists idx_profiles_account_status on public.profiles (account_status);
create index if not exists idx_profiles_is_verified on public.profiles (is_verified);
create index if not exists idx_profiles_created_at on public.profiles (created_at desc);

create index if not exists idx_drops_user_created on public.drops (user_id, created_at desc);
create index if not exists idx_echoes_user_created on public.echoes (user_id, created_at desc);
create index if not exists idx_sparks_user_created on public.sparks (user_id, created_at desc);
create index if not exists idx_relays_user_created on public.relays (user_id, created_at desc);
create index if not exists idx_orbits_follower_created on public.orbits (follower_id, created_at desc);
create index if not exists idx_orbits_followed_created on public.orbits (followed_id, created_at desc);

create index if not exists idx_user_restrictions_user on public.user_restrictions (user_id, created_at desc);
create index if not exists idx_admin_audit_logs_target on public.admin_audit_logs (target_id, created_at desc);
create index if not exists idx_reports_drop_user on public.reports (reporter_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 2. ADVANCED USER DIRECTORY QUERY WITH SERVER-SIDE PAGINATION & FILTERING
-- -----------------------------------------------------------------------------
create or replace function public.admin_get_users_advanced(
  p_search text default null,
  p_status text default 'all',
  p_verified text default 'all',
  p_registered_within text default 'all',
  p_sort_by text default 'created_at',
  p_sort_order text default 'desc',
  p_page int default 1,
  p_limit int default 15
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_offset int := greatest((coalesce(p_page, 1) - 1) * coalesce(p_limit, 15), 0);
  v_users jsonb;
  v_total_filtered bigint;
  v_active_count bigint;
  v_restricted_count bigint;
  v_total_overall bigint;
  v_reg_cutoff timestamptz := null;
begin
  -- RBAC Permission Check
  if not public.has_admin_permission('users.view', v_caller_id) then
    raise exception 'Unauthorized: Insufficient permissions to access user directory';
  end if;

  -- Registration cutoff filter
  if p_registered_within = 'today' then
    v_reg_cutoff := now() - interval '24 hours';
  elsif p_registered_within = '7d' then
    v_reg_cutoff := now() - interval '7 days';
  elsif p_registered_within = '30d' then
    v_reg_cutoff := now() - interval '30 days';
  elsif p_registered_within = '90d' then
    v_reg_cutoff := now() - interval '90 days';
  end if;

  -- Overall platform counts
  select count(*) into v_total_overall from public.profiles;
  select count(*) into v_active_count from public.profiles where account_status = 'active';
  select count(*) into v_restricted_count from public.profiles where account_status in ('warned', 'suspended', 'banned');

  -- Count matching current filters
  select count(*) into v_total_filtered
  from public.profiles p
  where
    (p_search is null or p_search = '' or
     p.username ilike '%' || p_search || '%' or
     p.display_name ilike '%' || p_search || '%')
    and (p_status = 'all' or p.account_status = p_status)
    and (p_verified = 'all' or (p_verified = 'verified' and p.is_verified = true) or (p_verified = 'unverified' and (p.is_verified is false or p.is_verified is null)))
    and (v_reg_cutoff is null or p.created_at >= v_reg_cutoff);

  -- Fetch paged rows
  with user_data as (
    select
      p.id,
      p.username,
      p.display_name,
      p.bio,
      p.avatar_emoji,
      p.avatar_color,
      p.account_status,
      coalesce(p.is_verified, false) as is_verified,
      coalesce(p.is_admin, false) as is_admin,
      coalesce(p.warning_count, 0) as warning_count,
      p.suspended_until,
      p.ban_reason,
      coalesce(p.followers_count, 0) as followers_count,
      coalesce(p.following_count, 0) as following_count,
      p.created_at,
      p.updated_at,
      (select count(*) from public.drops d where d.user_id = p.id) as drops_count,
      (select max(created_at) from public.drops d where d.user_id = p.id) as last_drop_at,
      (select ur.role_id from public.admin_user_roles ur where ur.user_id = p.id limit 1) as admin_role
    from public.profiles p
    where
      (p_search is null or p_search = '' or
       p.username ilike '%' || p_search || '%' or
       p.display_name ilike '%' || p_search || '%')
      and (p_status = 'all' or p.account_status = p_status)
      and (p_verified = 'all' or (p_verified = 'verified' and p.is_verified = true) or (p_verified = 'unverified' and (p.is_verified is false or p.is_verified is null)))
      and (v_reg_cutoff is null or p.created_at >= v_reg_cutoff)
    order by
      case when p_sort_by = 'username' and p_sort_order = 'asc' then p.username end asc,
      case when p_sort_by = 'username' and p_sort_order = 'desc' then p.username end desc,
      case when p_sort_by = 'followers_count' and p_sort_order = 'asc' then p.followers_count end asc,
      case when p_sort_by = 'followers_count' and p_sort_order = 'desc' then p.followers_count end desc,
      case when p_sort_by = 'following_count' and p_sort_order = 'asc' then p.following_count end asc,
      case when p_sort_by = 'following_count' and p_sort_order = 'desc' then p.following_count end desc,
      case when p_sort_by = 'created_at' and p_sort_order = 'asc' then p.created_at end asc,
      case when p_sort_by = 'created_at' and p_sort_order = 'desc' then p.created_at end desc,
      p.created_at desc
    offset v_offset
    limit coalesce(p_limit, 15)
  )
  select coalesce(jsonb_agg(row_to_json(user_data)), '[]'::jsonb)
  into v_users
  from user_data;

  return jsonb_build_object(
    'users', v_users,
    'total_count', v_total_filtered,
    'active_count', v_active_count,
    'restricted_count', v_restricted_count,
    'total_overall', v_total_overall,
    'page', coalesce(p_page, 1),
    'limit', coalesce(p_limit, 15)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. USER INTELLIGENCE & COMPREHENSIVE PROFILE INSPECTION
-- -----------------------------------------------------------------------------
create or replace function public.admin_get_user_intelligence(
  p_target_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_profile jsonb;
  v_metrics jsonb;
  v_recent_drops jsonb;
  v_restrictions jsonb;
  v_audit_history jsonb;
  v_reports_summary jsonb;
  v_account_age_days int;
  v_total_drops int;
  v_total_sparks_received bigint := 0;
  v_total_echoes_received bigint := 0;
  v_total_relays_received bigint := 0;
  v_total_sparks_given bigint := 0;
  v_total_echoes_created bigint := 0;
  v_total_relays_created bigint := 0;
  v_reports_against_count bigint := 0;
  v_reports_filed_count bigint := 0;
  v_orbiters_count bigint := 0;
  v_orbiting_count bigint := 0;
  v_created_at timestamptz;
begin
  -- RBAC Permission Check
  if not public.has_admin_permission('users.view', v_caller_id) then
    raise exception 'Unauthorized: Insufficient permissions to inspect user';
  end if;

  -- 1. Fetch Profile
  select
    jsonb_build_object(
      'id', p.id,
      'username', p.username,
      'display_name', p.display_name,
      'bio', p.bio,
      'avatar_emoji', p.avatar_emoji,
      'avatar_color', p.avatar_color,
      'website', p.website,
      'location', p.location,
      'account_status', p.account_status,
      'is_verified', coalesce(p.is_verified, false),
      'is_admin', coalesce(p.is_admin, false),
      'warning_count', coalesce(p.warning_count, 0),
      'suspended_until', p.suspended_until,
      'ban_reason', p.ban_reason,
      'followers_count', coalesce(p.followers_count, 0),
      'following_count', coalesce(p.following_count, 0),
      'created_at', p.created_at,
      'updated_at', p.updated_at,
      'admin_role', (select ur.role_id from public.admin_user_roles ur where ur.user_id = p.id limit 1)
    ),
    p.created_at
  into v_profile, v_created_at
  from public.profiles p
  where p.id = p_target_user_id;

  if v_profile is null then
    return null;
  end if;

  -- 2. Compute Analytics & Authoritative Metrics
  v_account_age_days := greatest(extract(day from (now() - v_created_at))::int, 0);

  select count(*) into v_total_drops from public.drops where user_id = p_target_user_id;

  select
    coalesce(sum(spark_count), 0),
    coalesce(sum(echo_count), 0),
    coalesce(sum(relay_count), 0)
  into v_total_sparks_received, v_total_echoes_received, v_total_relays_received
  from public.drops
  where user_id = p_target_user_id;

  select count(*) into v_total_sparks_given from public.sparks where user_id = p_target_user_id;
  select count(*) into v_total_echoes_created from public.echoes where user_id = p_target_user_id;
  select count(*) into v_total_relays_created from public.relays where user_id = p_target_user_id;

  select count(*) into v_orbiters_count from public.orbits where followed_id = p_target_user_id;
  select count(*) into v_orbiting_count from public.orbits where follower_id = p_target_user_id;

  -- Reports against user's drops or profile
  select count(*) into v_reports_against_count
  from public.reports r
  join public.drops d on d.id = r.drop_id
  where d.user_id = p_target_user_id;

  select count(*) into v_reports_filed_count
  from public.reports
  where reporter_id = p_target_user_id;

  v_metrics := jsonb_build_object(
    'account_age_days', v_account_age_days,
    'total_drops', v_total_drops,
    'total_orbiters', v_orbiters_count,
    'total_orbiting', v_orbiting_count,
    'total_sparks_received', v_total_sparks_received,
    'total_echoes_received', v_total_echoes_received,
    'total_relays_received', v_total_relays_received,
    'total_sparks_given', v_total_sparks_given,
    'total_echoes_created', v_total_echoes_created,
    'total_relays_created', v_total_relays_created,
    'reports_against_count', v_reports_against_count,
    'reports_filed_count', v_reports_filed_count,
    'posting_frequency_weekly', round(case when v_account_age_days > 7 then (v_total_drops::numeric / (v_account_age_days::numeric / 7.0)) else v_total_drops::numeric end, 2)
  );

  -- 3. Recent Drops (up to 10 latest)
  select coalesce(jsonb_agg(d_row order by d_row.created_at desc), '[]'::jsonb)
  into v_recent_drops
  from (
    select
      d.id,
      d.content,
      d.spark_count,
      d.echo_count,
      d.relay_count,
      d.pass_count,
      d.is_pinned,
      d.is_hidden,
      d.moderation_status,
      d.moderation_reason,
      d.created_at
    from public.drops d
    where d.user_id = p_target_user_id
    order by d.created_at desc
    limit 10
  ) d_row;

  -- 4. User Restrictions History
  select coalesce(jsonb_agg(r_row order by r_row.created_at desc), '[]'::jsonb)
  into v_restrictions
  from (
    select
      ur.id,
      ur.type,
      ur.reason,
      ur.internal_notes,
      ur.expires_at,
      ur.is_active,
      ur.created_at,
      ur.revoked_at,
      ur.revocation_reason,
      jsonb_build_object('username', admin_p.username, 'display_name', admin_p.display_name) as admin
    from public.user_restrictions ur
    left join public.profiles admin_p on admin_p.id = ur.admin_id
    where ur.user_id = p_target_user_id
    order by ur.created_at desc
  ) r_row;

  -- 5. Administrative Audit History (Targeting this user)
  select coalesce(jsonb_agg(a_row order by a_row.created_at desc), '[]'::jsonb)
  into v_audit_history
  from (
    select
      al.id,
      al.action_type,
      al.target_type,
      al.previous_state,
      al.new_state,
      al.reason,
      al.metadata,
      al.created_at,
      jsonb_build_object('username', admin_p.username, 'display_name', admin_p.display_name) as admin
    from public.admin_audit_logs al
    left join public.profiles admin_p on admin_p.id = al.admin_id
    where al.target_id = p_target_user_id::text
    order by al.created_at desc
    limit 25
  ) a_row;

  -- 6. Reports Summary
  select jsonb_build_object(
    'reports_against', coalesce(jsonb_agg(ra_row order by ra_row.created_at desc), '[]'::jsonb),
    'reports_submitted', coalesce((
      select jsonb_agg(rs_row order by rs_row.created_at desc)
      from (
        select r.id, r.category, r.reason, r.status, r.created_at, r.resolved_at
        from public.reports r
        where r.reporter_id = p_target_user_id
        order by r.created_at desc
        limit 10
      ) rs_row
    ), '[]'::jsonb)
  )
  into v_reports_summary
  from (
    select
      r.id,
      r.category,
      r.reason,
      r.status,
      r.created_at,
      r.resolved_at,
      r.resolution_action,
      r.drop_id,
      (select content from public.drops where id = r.drop_id) as drop_snippet
    from public.reports r
    join public.drops d on d.id = r.drop_id
    where d.user_id = p_target_user_id
    order by r.created_at desc
    limit 10
  ) ra_row;

  return jsonb_build_object(
    'profile', v_profile,
    'metrics', v_metrics,
    'recent_drops', v_recent_drops,
    'restrictions', v_restrictions,
    'audit_history', v_audit_history,
    'reports', v_reports_summary
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. USER ACTIVITY TIMELINE GENERATOR
-- -----------------------------------------------------------------------------
create or replace function public.admin_get_user_timeline(
  p_target_user_id uuid,
  p_limit int default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_timeline jsonb;
begin
  if not public.has_admin_permission('users.view', v_caller_id) then
    raise exception 'Unauthorized';
  end if;

  with unified_events as (
    -- Account Creation
    select
      'account_created' as event_type,
      'User account registered on Blurbbi' as description,
      p.created_at,
      null::text as entity_id,
      jsonb_build_object('username', p.username, 'display_name', p.display_name) as metadata
    from public.profiles p
    where p.id = p_target_user_id

    union all

    -- Drops Published
    select
      'drop_published' as event_type,
      'Published drop: ' || left(d.content, 45) as description,
      d.created_at,
      d.id::text as entity_id,
      jsonb_build_object('content', d.content, 'sparks', d.spark_count, 'echoes', d.echo_count, 'status', d.moderation_status) as metadata
    from public.drops d
    where d.user_id = p_target_user_id

    union all

    -- Echoes Created
    select
      'echo_created' as event_type,
      'Left echo (comment): ' || left(e.content, 40) as description,
      e.created_at,
      e.drop_id::text as entity_id,
      jsonb_build_object('content', e.content) as metadata
    from public.echoes e
    where e.user_id = p_target_user_id

    union all

    -- Relays Created
    select
      'relay_created' as event_type,
      'Relayed drop into public stream' as description,
      r.created_at,
      r.drop_id::text as entity_id,
      '{}'::jsonb as metadata
    from public.relays r
    where r.user_id = p_target_user_id

    union all

    -- Sparks Given
    select
      'spark_given' as event_type,
      'Sparks engagement given to drop' as description,
      s.created_at,
      s.drop_id::text as entity_id,
      '{}'::jsonb as metadata
    from public.sparks s
    where s.user_id = p_target_user_id

    union all

    -- Orbits Started (Following another user)
    select
      'orbit_started' as event_type,
      'Entered orbit of @' || followed_p.username as description,
      o.created_at,
      o.followed_id::text as entity_id,
      jsonb_build_object('username', followed_p.username, 'display_name', followed_p.display_name) as metadata
    from public.orbits o
    join public.profiles followed_p on followed_p.id = o.followed_id
    where o.follower_id = p_target_user_id

    union all

    -- Restrictions Applied (Warnings, Suspensions, Bans)
    select
      'restriction_' || ur.type as event_type,
      'Administrative ' || ur.type || ' issued: ' || ur.reason as description,
      ur.created_at,
      ur.id::text as entity_id,
      jsonb_build_object('type', ur.type, 'reason', ur.reason, 'expires_at', ur.expires_at, 'is_active', ur.is_active) as metadata
    from public.user_restrictions ur
    where ur.user_id = p_target_user_id
  )
  select coalesce(jsonb_agg(row_to_json(sorted_events)), '[]'::jsonb)
  into v_timeline
  from (
    select * from unified_events
    order by created_at desc
    limit coalesce(p_limit, 50)
  ) sorted_events;

  return v_timeline;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. ORBIT NETWORK EXPLORATION WITH MUTUAL RELATIONSHIP DETECTION
-- -----------------------------------------------------------------------------
create or replace function public.admin_get_user_network(
  p_target_user_id uuid,
  p_type text default 'orbiters', -- 'orbiters' (followers) or 'orbiting' (following)
  p_search text default null,
  p_page int default 1,
  p_limit int default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
  v_offset int := greatest((coalesce(p_page, 1) - 1) * coalesce(p_limit, 20), 0);
  v_results jsonb;
  v_total bigint;
begin
  if not public.has_admin_permission('users.view', v_caller_id) then
    raise exception 'Unauthorized';
  end if;

  if p_type = 'orbiters' then
    -- Orbiters (who follows this target user)
    select count(*) into v_total
    from public.orbits o
    join public.profiles p on p.id = o.follower_id
    where o.followed_id = p_target_user_id
      and (p_search is null or p_search = '' or p.username ilike '%' || p_search || '%' or p.display_name ilike '%' || p_search || '%');

    with net_rows as (
      select
        p.id,
        p.username,
        p.display_name,
        p.avatar_emoji,
        p.avatar_color,
        p.bio,
        p.account_status,
        coalesce(p.is_verified, false) as is_verified,
        coalesce(p.followers_count, 0) as followers_count,
        coalesce(p.following_count, 0) as following_count,
        o.created_at as connected_at,
        exists (
          select 1 from public.orbits rev
          where rev.follower_id = p_target_user_id and rev.followed_id = p.id
        ) as is_mutual
      from public.orbits o
      join public.profiles p on p.id = o.follower_id
      where o.followed_id = p_target_user_id
        and (p_search is null or p_search = '' or p.username ilike '%' || p_search || '%' or p.display_name ilike '%' || p_search || '%')
      order by o.created_at desc
      offset v_offset
      limit coalesce(p_limit, 20)
    )
    select coalesce(jsonb_agg(row_to_json(net_rows)), '[]'::jsonb)
    into v_results
    from net_rows;

  else
    -- Orbiting (who this target user follows)
    select count(*) into v_total
    from public.orbits o
    join public.profiles p on p.id = o.followed_id
    where o.follower_id = p_target_user_id
      and (p_search is null or p_search = '' or p.username ilike '%' || p_search || '%' or p.display_name ilike '%' || p_search || '%');

    with net_rows as (
      select
        p.id,
        p.username,
        p.display_name,
        p.avatar_emoji,
        p.avatar_color,
        p.bio,
        p.account_status,
        coalesce(p.is_verified, false) as is_verified,
        coalesce(p.followers_count, 0) as followers_count,
        coalesce(p.following_count, 0) as following_count,
        o.created_at as connected_at,
        exists (
          select 1 from public.orbits rev
          where rev.follower_id = p.id and rev.followed_id = p_target_user_id
        ) as is_mutual
      from public.orbits o
      join public.profiles p on p.id = o.followed_id
      where o.follower_id = p_target_user_id
        and (p_search is null or p_search = '' or p.username ilike '%' || p_search || '%' or p.display_name ilike '%' || p_search || '%')
      order by o.created_at desc
      offset v_offset
      limit coalesce(p_limit, 20)
    )
    select coalesce(jsonb_agg(row_to_json(net_rows)), '[]'::jsonb)
    into v_results
    from net_rows;
  end if;

  return jsonb_build_object(
    'connections', v_results,
    'total_count', v_total,
    'page', coalesce(p_page, 1),
    'limit', coalesce(p_limit, 20)
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. BULK ACCOUNT RESTRICTION WITH INDIVIDUAL AUDITING
-- -----------------------------------------------------------------------------
create or replace function public.admin_bulk_restrict_users(
  p_user_ids uuid[],
  p_type text,
  p_reason text,
  p_notes text default null,
  p_duration_hours int default 24
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_uid uuid;
  v_processed int := 0;
  v_expires timestamptz := null;
  v_prev_status text;
  v_new_status text := p_type;
begin
  if not public.has_admin_permission('users.restrict', v_admin_id) then
    raise exception 'Unauthorized: Insufficient permissions for bulk user restriction';
  end if;

  if p_type = 'suspension' then
    v_expires := now() + (coalesce(p_duration_hours, 24) || ' hours')::interval;
    v_new_status := 'suspended';
  elsif p_type = 'ban' then
    v_new_status := 'banned';
  elsif p_type = 'warning' then
    v_new_status := 'warned';
  end if;

  foreach v_uid in array p_user_ids loop
    -- Skip if trying to restrict super admin
    if exists (select 1 from public.admin_user_roles where user_id = v_uid and role_id = 'super_admin') then
      continue;
    end if;

    select account_status into v_prev_status from public.profiles where id = v_uid;

    if p_type = 'warning' then
      update public.profiles set
        account_status = case when account_status = 'active' then 'warned' else account_status end,
        warning_count = warning_count + 1
      where id = v_uid;
    elsif p_type = 'suspension' then
      update public.profiles set
        account_status = 'suspended',
        is_suspended = true,
        suspended_until = v_expires
      where id = v_uid;
    elsif p_type = 'ban' then
      update public.profiles set
        account_status = 'banned',
        is_suspended = true,
        ban_reason = p_reason
      where id = v_uid;
    end if;

    -- Deactivate previous restrictions
    update public.user_restrictions set is_active = false
    where user_id = v_uid and type = p_type and is_active = true;

    -- Insert restriction record
    insert into public.user_restrictions (
      user_id, admin_id, type, reason, internal_notes, expires_at, is_active
    ) values (
      v_uid, v_admin_id, p_type, p_reason, p_notes, v_expires, true
    );

    -- Log to audit trail
    insert into public.admin_audit_logs (
      admin_id, action_type, target_type, target_id, previous_state, new_state, reason, metadata
    ) values (
      v_admin_id,
      'bulk_user_' || p_type,
      'user',
      v_uid::text,
      jsonb_build_object('account_status', v_prev_status),
      jsonb_build_object('account_status', v_new_status, 'expires_at', v_expires),
      p_reason,
      jsonb_build_object('bulk_operation', true, 'duration_hours', p_duration_hours, 'notes', p_notes)
    );

    v_processed := v_processed + 1;
  end loop;

  return jsonb_build_object(
    'processed_count', v_processed,
    'total_requested', coalesce(array_length(p_user_ids, 1), 0),
    'status', 'success'
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. AUDIT LOGGING FOR PERMISSION-CONTROLLED CSV EXPORTS
-- -----------------------------------------------------------------------------
create or replace function public.admin_log_user_export(
  p_export_count int,
  p_filters jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
begin
  if not public.has_admin_permission('users.view', v_admin_id) then
    raise exception 'Unauthorized to export user data';
  end if;

  insert into public.admin_audit_logs (
    admin_id, action_type, target_type, target_id, reason, metadata
  ) values (
    v_admin_id,
    'user_export_csv',
    'user',
    'system',
    'Exported user directory dataset to CSV',
    jsonb_build_object(
      'row_count', p_export_count,
      'filters_applied', p_filters,
      'timestamp', now()
    )
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- GRANTS
-- -----------------------------------------------------------------------------
grant execute on function public.admin_get_users_advanced(text, text, text, text, text, text, int, int) to authenticated;
grant execute on function public.admin_get_user_intelligence(uuid) to authenticated;
grant execute on function public.admin_get_user_timeline(uuid, int) to authenticated;
grant execute on function public.admin_get_user_network(uuid, text, text, int, int) to authenticated;
grant execute on function public.admin_bulk_restrict_users(uuid[], text, text, text, int) to authenticated;
grant execute on function public.admin_log_user_export(int, jsonb) to authenticated;


-- =============================================================================
-- Blurbbi Intelligence Engine: Ranking, Admin Controls, Testing & Performance
-- =============================================================================

-- 1. Profiles & Reports Enhancements
alter table public.profiles add column if not exists is_admin boolean default false;
alter table public.profiles add column if not exists is_suspended boolean default false;

alter table public.reports add column if not exists status text not null default 'pending';
-- Ensure status check constraint exists
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reports_status_check'
  ) then
    alter table public.reports add constraint reports_status_check check (status in ('pending', 'resolved', 'dismissed'));
  end if;
end $$;

alter table public.reports add column if not exists resolved_by uuid references public.profiles(id);
alter table public.reports add column if not exists resolved_at timestamptz;
alter table public.reports add column if not exists resolution_action text;

-- Helper to check if current user is an admin
create or replace function public.is_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = p_user_id and is_admin = true
  );
$$;

-- 2. Algorithm Configuration Management Table
create table if not exists public.algorithm_config (
  id text primary key default 'active',
  spark_weight numeric not null default 3.0,
  echo_weight numeric not null default 2.0,
  relay_weight numeric not null default 5.0,
  pass_weight numeric not null default 2.0,
  decay_gravity numeric not null default 1.4,
  time_offset_hours numeric not null default 2.0,
  trending_window_hours int not null default 24,
  for_you_window_hours int not null default 72,
  min_spark_for_viral int not null default 1,
  creator_boost_multiplier numeric not null default 1.2,
  description text default 'Production algorithm default baseline',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

-- Seed default configuration if empty
insert into public.algorithm_config (id, spark_weight, echo_weight, relay_weight, pass_weight, decay_gravity, time_offset_hours, trending_window_hours, for_you_window_hours)
values ('active', 3.0, 2.0, 5.0, 2.0, 1.4, 2.0, 24, 72)
on conflict (id) do nothing;

-- 3. Controlled Experiment Variants (A/B Testing)
create table if not exists public.experiment_variants (
  id text primary key,
  name text not null,
  allocation_pct int not null check (allocation_pct between 0 and 100),
  spark_weight numeric not null default 3.0,
  echo_weight numeric not null default 2.0,
  relay_weight numeric not null default 5.0,
  pass_weight numeric not null default 2.0,
  decay_gravity numeric not null default 1.4,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.experiment_variants (id, name, allocation_pct, spark_weight, echo_weight, relay_weight, pass_weight, decay_gravity, is_active)
values 
  ('control', 'Control (Baseline)', 50, 3.0, 2.0, 5.0, 2.0, 1.4, true),
  ('high_velocity', 'High Velocity (Decay 1.8)', 25, 4.0, 2.5, 6.0, 2.0, 1.8, true),
  ('conversation_first', 'Conversation First (Echo 4.0)', 25, 2.0, 4.0, 4.0, 2.0, 1.2, true)
on conflict (id) do nothing;

-- 4. Feed Performance & Latency Telemetry
create table if not exists public.feed_telemetry (
  id uuid primary key default gen_random_uuid(),
  feed_type text not null,
  latency_ms int not null,
  items_returned int not null,
  viewer_id uuid references public.profiles(id),
  experiment_variant text default 'control',
  created_at timestamptz not null default now()
);

-- 5. Performance Indexes (EXPLAIN ANALYZE Optimization)
create index if not exists drops_created_at_idx on public.drops (created_at desc);
create index if not exists drops_user_created_idx on public.drops (user_id, created_at desc);
create index if not exists drops_spark_heat_idx on public.drops (spark_count desc, created_at desc);
create index if not exists orbits_follower_followed_idx on public.orbits (follower_id, followed_id);
create index if not exists orbits_followed_idx on public.orbits (followed_id);
create index if not exists hides_user_drop_idx on public.hides (user_id, drop_id);
create index if not exists mutes_user_muted_idx on public.mutes (user_id, muted_id);
create index if not exists reports_status_idx on public.reports (status, created_at desc);
create index if not exists reports_drop_idx on public.reports (drop_id);
create index if not exists feed_telemetry_created_idx on public.feed_telemetry (created_at desc);
create index if not exists feed_telemetry_type_idx on public.feed_telemetry (feed_type, created_at desc);

-- 6. RLS Policies for New / Enhanced Tables
alter table public.algorithm_config enable row level security;
alter table public.experiment_variants enable row level security;
alter table public.feed_telemetry enable row level security;

-- algorithm_config: anyone can read active config; only admin can update
create policy "algorithm_config_read" on public.algorithm_config for select using (true);
create policy "algorithm_config_write" on public.algorithm_config for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- experiment_variants: anyone can read active; only admin can write
create policy "experiment_variants_read" on public.experiment_variants for select using (true);
create policy "experiment_variants_write" on public.experiment_variants for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- feed_telemetry: insert allowed for all; select for admin
create policy "feed_telemetry_insert" on public.feed_telemetry for insert to authenticated, anon with check (true);
create policy "feed_telemetry_select" on public.feed_telemetry for select to authenticated using (public.is_admin());

-- reports admin access
create policy "reports_admin_select" on public.reports for select to authenticated using (public.is_admin());
create policy "reports_admin_update" on public.reports for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- 7. Dynamic Heat Score Function
create or replace function public.heat_score_dynamic(
  p_sparks int,
  p_echoes int,
  p_relays int,
  p_passes int,
  p_created timestamptz,
  p_spark_w numeric default null,
  p_echo_w numeric default null,
  p_relay_w numeric default null,
  p_pass_w numeric default null,
  p_gravity numeric default null,
  p_offset numeric default null
)
returns numeric
language plpgsql
stable
as $$
declare
  v_sw numeric := coalesce(p_spark_w, 3.0);
  v_ew numeric := coalesce(p_echo_w, 2.0);
  v_rw numeric := coalesce(p_relay_w, 5.0);
  v_pw numeric := coalesce(p_pass_w, 2.0);
  v_grav numeric := coalesce(p_gravity, 1.4);
  v_off numeric := coalesce(p_offset, 2.0);
  v_age_hours numeric;
  v_numerator numeric;
  v_denominator numeric;
begin
  v_age_hours := greatest(extract(epoch from (now() - p_created)) / 3600.0, 0.0);
  v_numerator := (p_sparks * v_sw) + (p_echoes * v_ew) + (p_relays * v_rw) + (p_passes * v_pw) + 1.0;
  v_denominator := power(v_age_hours + v_off, v_grav);
  return round((v_numerator / greatest(v_denominator, 0.0001))::numeric, 4);
end;
$$;

-- 8. Enhanced Viewer Hidden Check (respects hides, mutes, reports, and suspended accounts)
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
    where d.id = p_drop and author.is_suspended = true
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

-- 9. Optimized For You Feed (Supports cursor pagination & dynamic weights)
create or replace function public.feed_for_you_v2(
  p_viewer uuid default null,
  p_limit integer default 30,
  p_before timestamptz default null,
  p_variant text default 'control'
)
returns table (
  drop_id uuid,
  content text,
  author_id uuid,
  username text,
  display_name text,
  avatar_emoji text,
  avatar_color text,
  spark_count int,
  echo_count int,
  relay_count int,
  pass_count int,
  created_at timestamptz,
  score numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_sw numeric := 3.0;
  v_ew numeric := 2.0;
  v_rw numeric := 5.0;
  v_pw numeric := 2.0;
  v_grav numeric := 1.4;
  v_window_hours int := 72;
begin
  -- Read variant overrides if specified
  if p_variant is not null and p_variant <> 'control' then
    select spark_weight, echo_weight, relay_weight, pass_weight, decay_gravity
    into v_sw, v_ew, v_rw, v_pw, v_grav
    from public.experiment_variants
    where id = p_variant and is_active = true;
  else
    select spark_weight, echo_weight, relay_weight, pass_weight, decay_gravity, for_you_window_hours
    into v_sw, v_ew, v_rw, v_pw, v_grav, v_window_hours
    from public.algorithm_config
    where id = 'active';
  end if;

  return query
  select 
    d.id, d.content, d.user_id, p.username, p.display_name,
    p.avatar_emoji, p.avatar_color, d.spark_count, d.echo_count,
    d.relay_count, d.pass_count, d.created_at,
    public.heat_score_dynamic(d.spark_count, d.echo_count, d.relay_count, d.pass_count, d.created_at, v_sw, v_ew, v_rw, v_pw, v_grav) as score
  from public.drops d
  join public.profiles p on p.id = d.user_id
  where d.created_at > now() - (coalesce(v_window_hours, 72) || ' hours')::interval
    and (p_before is null or d.created_at < p_before)
    and not public.viewer_hidden(p_viewer, d.id)
  order by score desc, d.created_at desc
  limit p_limit;
end;
$$;

-- 10. Optimized Chronological Orbit Feed (Strictly following, cursor paginated)
create or replace function public.feed_orbit_v2(
  p_viewer uuid default null,
  p_limit integer default 30,
  p_before timestamptz default null
)
returns table (
  drop_id uuid,
  content text,
  author_id uuid,
  username text,
  display_name text,
  avatar_emoji text,
  avatar_color text,
  spark_count int,
  echo_count int,
  relay_count int,
  pass_count int,
  created_at timestamptz,
  score numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select 
    d.id, d.content, d.user_id, p.username, p.display_name,
    p.avatar_emoji, p.avatar_color, d.spark_count, d.echo_count,
    d.relay_count, d.pass_count, d.created_at,
    0.0::numeric as score
  from public.drops d
  join public.profiles p on p.id = d.user_id
  where exists (
    select 1 from public.orbits o 
    where o.follower_id = p_viewer and o.followed_id = d.user_id
  )
    and (p_before is null or d.created_at < p_before)
    and not public.viewer_hidden(p_viewer, d.id)
  order by d.created_at desc
  limit p_limit;
$$;

-- 11. Optimized Trending / Viral Function with Configurable Window
create or replace function public.viral_now_v2(
  p_limit integer default 5,
  p_window_hours int default null
)
returns table (
  drop_id uuid,
  content text,
  author_id uuid,
  username text,
  display_name text,
  avatar_emoji text,
  avatar_color text,
  spark_count int,
  echo_count int,
  relay_count int,
  pass_count int,
  created_at timestamptz,
  score numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_window int := coalesce(p_window_hours, 24);
begin
  if p_window_hours is null then
    select trending_window_hours into v_window from public.algorithm_config where id = 'active';
    v_window := coalesce(v_window, 24);
  end if;

  return query
  select 
    d.id, d.content, d.user_id, p.username, p.display_name,
    p.avatar_emoji, p.avatar_color, d.spark_count, d.echo_count,
    d.relay_count, d.pass_count, d.created_at,
    public.heat_score_dynamic(d.spark_count, d.echo_count, d.relay_count, d.pass_count, d.created_at) as score
  from public.drops d
  join public.profiles p on p.id = d.user_id
  where d.created_at > now() - (v_window || ' hours')::interval
    and not coalesce(p.is_suspended, false)
  order by score desc, d.created_at desc
  limit p_limit;
end;
$$;

-- 12. Creator Recommendations Function
create or replace function public.recommend_creators(
  p_viewer uuid default null,
  p_limit integer default 8
)
returns table (
  id uuid,
  username text,
  display_name text,
  bio text,
  avatar_emoji text,
  avatar_color text,
  followers_count integer,
  following_count integer,
  recent_drops_count bigint,
  total_sparks_received bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select 
    p.id,
    p.username,
    p.display_name,
    p.bio,
    p.avatar_emoji,
    p.avatar_color,
    p.followers_count,
    p.following_count,
    count(d.id) as recent_drops_count,
    coalesce(sum(d.spark_count), 0)::bigint as total_sparks_received
  from public.profiles p
  left join public.drops d on d.user_id = p.id and d.created_at > now() - interval '14 days'
  where (p_viewer is null or p.id <> p_viewer)
    and not coalesce(p.is_suspended, false)
    and (p_viewer is null or not exists (
      select 1 from public.orbits o where o.follower_id = p_viewer and o.followed_id = p.id
    ))
    and (p_viewer is null or not exists (
      select 1 from public.mutes m where m.user_id = p_viewer and m.muted_id = p.id
    ))
  group by p.id, p.username, p.display_name, p.bio, p.avatar_emoji, p.avatar_color, p.followers_count, p.following_count
  order by total_sparks_received desc, p.followers_count desc, p.created_at desc
  limit p_limit;
$$;

-- 13. Telemetry Recording Function
create or replace function public.record_feed_telemetry(
  p_feed_type text,
  p_latency_ms int,
  p_items_returned int,
  p_variant text default 'control'
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.feed_telemetry (feed_type, latency_ms, items_returned, viewer_id, experiment_variant)
  values (p_feed_type, p_latency_ms, p_items_returned, auth.uid(), coalesce(p_variant, 'control'));
$$;

-- 14. Admin Aggregated Feed Performance & Moderation RPCs
create or replace function public.admin_get_intelligence_metrics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_is_adm boolean := public.is_admin();
  v_result jsonb;
begin
  if not v_is_adm then
    raise exception 'Unauthorized: Administrator access required';
  end if;

  select jsonb_build_object(
    'telemetry', (
      select coalesce(jsonb_agg(sub), '[]'::jsonb)
      from (
        select 
          feed_type,
          count(*) as request_count,
          round(avg(latency_ms)::numeric, 1) as avg_latency_ms,
          max(latency_ms) as max_latency_ms,
          round(avg(items_returned)::numeric, 1) as avg_items_returned
        from public.feed_telemetry
        where created_at > now() - interval '24 hours'
        group by feed_type
      ) sub
    ),
    'pending_reports_count', (
      select count(*) from public.reports where status = 'pending'
    ),
    'total_drops_24h', (
      select count(*) from public.drops where created_at > now() - interval '24 hours'
    ),
    'total_active_blurbers_7d', (
      select count(distinct user_id) from public.drops where created_at > now() - interval '7 days'
    ),
    'config', (
      select to_jsonb(c) from public.algorithm_config c where id = 'active'
    ),
    'variants', (
      select coalesce(jsonb_agg(v), '[]'::jsonb) from public.experiment_variants v
    )
  ) into v_result;

  return v_result;
end;
$$;

-- 15. Admin Moderation Resolution Function
create or replace function public.admin_resolve_report(
  p_report_id uuid,
  p_action text, -- 'dismiss', 'delete_drop', 'suspend_author'
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_adm boolean := public.is_admin();
  v_drop_id uuid;
  v_author_id uuid;
begin
  if not v_is_adm then
    raise exception 'Unauthorized: Administrator access required';
  end if;

  select drop_id into v_drop_id from public.reports where id = p_report_id;
  if v_drop_id is not null then
    select user_id into v_author_id from public.drops where id = v_drop_id;
  end if;

  if p_action = 'delete_drop' and v_drop_id is not null then
    delete from public.drops where id = v_drop_id;
  elsif p_action = 'suspend_author' and v_author_id is not null then
    update public.profiles set is_suspended = true where id = v_author_id;
    delete from public.drops where id = v_drop_id;
  end if;

  update public.reports
  set status = case when p_action = 'dismiss' then 'dismissed' else 'resolved' end,
      resolved_by = auth.uid(),
      resolved_at = now(),
      resolution_action = p_action,
      note = coalesce(p_notes, note)
  where id = p_report_id;
end;
$$;

-- Execution Grants
grant execute on function public.heat_score_dynamic(int, int, int, int, timestamptz, numeric, numeric, numeric, numeric, numeric, numeric) to anon, authenticated;
grant execute on function public.viewer_hidden(uuid, uuid) to anon, authenticated;
grant execute on function public.feed_for_you_v2(uuid, integer, timestamptz, text) to anon, authenticated;
grant execute on function public.feed_orbit_v2(uuid, integer, timestamptz) to anon, authenticated;
grant execute on function public.viral_now_v2(integer, integer) to anon, authenticated;
grant execute on function public.recommend_creators(uuid, integer) to anon, authenticated;
grant execute on function public.record_feed_telemetry(text, integer, integer, text) to anon, authenticated;
grant execute on function public.admin_get_intelligence_metrics() to authenticated;
grant execute on function public.admin_resolve_report(uuid, text, text) to authenticated;


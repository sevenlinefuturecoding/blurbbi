-- ===== PROFILES =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null default '',
  bio text not null default '',
  avatar_emoji text not null default '🌀',
  avatar_color text not null default 'sky',
  onboarded boolean not null default false,
  followers_count integer not null default 0,
  following_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,20}$'),
  constraint profiles_bio_length check (char_length(bio) <= 200),
  constraint profiles_display_name_length check (char_length(display_name) <= 40)
);
create index profiles_username_lower_idx on public.profiles (lower(username));

-- Auto-create a profile row for every new auth user (placeholder username until onboarding)
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, 'u_' || left(replace(gen_random_uuid()::text, '-', ''), 10));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ===== DROPS =====
create table public.drops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  spark_count integer not null default 0,
  echo_count integer not null default 0,
  relay_count integer not null default 0,
  pass_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint drops_length check (char_length(content) between 1 and 500),
  constraint drops_counts_nonneg check (spark_count >= 0 and echo_count >= 0 and relay_count >= 0 and pass_count >= 0)
);
create index drops_created_idx on public.drops (created_at desc);
create index drops_user_created_idx on public.drops (user_id, created_at desc);

-- ===== ENGAGEMENT =====
create table public.sparks (
  drop_id uuid not null references public.drops(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (drop_id, user_id)
);

create table public.relays (
  drop_id uuid not null references public.drops(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (drop_id, user_id)
);

create table public.passes (
  drop_id uuid not null references public.drops(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (drop_id, user_id)
);

create table public.echoes (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid not null references public.drops(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  constraint echoes_length check (char_length(content) between 1 and 500)
);
create index echoes_drop_idx on public.echoes (drop_id, created_at);

-- One counter trigger for all engagement tables (security definer so it can update any drop)
create function public.bump_drop_counter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta integer := case when tg_op = 'INSERT' then 1 else -1 end;
  v_drop uuid := coalesce(new.drop_id, old.drop_id);
begin
  update public.drops set
    spark_count = spark_count + case when tg_table_name = 'sparks' then v_delta else 0 end,
    echo_count  = echo_count  + case when tg_table_name = 'echoes' then v_delta else 0 end,
    relay_count = relay_count + case when tg_table_name = 'relays' then v_delta else 0 end,
    pass_count  = pass_count  + case when tg_table_name = 'passes' then v_delta else 0 end
  where id = v_drop;
  return null;
end;
$$;

create trigger sparks_counter after insert or delete on public.sparks
for each row execute function public.bump_drop_counter();
create trigger echoes_counter after insert or delete on public.echoes
for each row execute function public.bump_drop_counter();
create trigger relays_counter after insert or delete on public.relays
for each row execute function public.bump_drop_counter();
create trigger passes_counter after insert or delete on public.passes
for each row execute function public.bump_drop_counter();

-- ===== ORBIT (follows) =====
create table public.orbits (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint orbits_no_self check (follower_id <> followed_id)
);
create index orbits_followed_idx on public.orbits (followed_id);

create function public.bump_follow_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta integer := case when tg_op = 'INSERT' then 1 else -1 end;
begin
  update public.profiles set followers_count = greatest(followers_count + v_delta, 0)
  where id = coalesce(new.followed_id, old.followed_id);
  update public.profiles set following_count = greatest(following_count + v_delta, 0)
  where id = coalesce(new.follower_id, old.follower_id);
  return null;
end;
$$;

create trigger orbits_counts after insert or delete on public.orbits
for each row execute function public.bump_follow_counts();

-- ===== SAFETY =====
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid not null references public.drops(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  note text,
  created_at timestamptz not null default now(),
  unique (drop_id, reporter_id)
);

create table public.hides (
  drop_id uuid not null references public.drops(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (drop_id, user_id)
);

create table public.mutes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  muted_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, muted_id),
  constraint mutes_no_self check (user_id <> muted_id)
);

-- ===== GRANTS =====
grant select, update on public.profiles to authenticated;
grant all on public.drops to authenticated;
grant all on public.sparks to authenticated;
grant all on public.relays to authenticated;
grant all on public.passes to authenticated;
grant all on public.echoes to authenticated;
grant select, insert, delete on public.orbits to authenticated;
grant select, insert on public.reports to authenticated;
grant all on public.hides to authenticated;
grant all on public.mutes to authenticated;
grant all on public.profiles to service_role;
grant all on public.drops to service_role;
grant all on public.sparks to service_role;
grant all on public.relays to service_role;
grant all on public.passes to service_role;
grant all on public.echoes to service_role;
grant all on public.orbits to service_role;
grant all on public.reports to service_role;
grant all on public.hides to service_role;
grant all on public.mutes to service_role;

-- ===== RLS =====
alter table public.profiles enable row level security;
alter table public.drops enable row level security;
alter table public.sparks enable row level security;
alter table public.relays enable row level security;
alter table public.passes enable row level security;
alter table public.echoes enable row level security;
alter table public.orbits enable row level security;
alter table public.reports enable row level security;
alter table public.hides enable row level security;
alter table public.mutes enable row level security;

-- profiles: readable by signed-in users; editable only by owner
create policy "profiles_select" on public.profiles for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- drops: readable by signed-in users; writes owned
create policy "drops_select" on public.drops for select to authenticated using (true);
create policy "drops_insert_own" on public.drops for insert to authenticated with check (user_id = auth.uid());
create policy "drops_update_own" on public.drops for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "drops_delete_own" on public.drops for delete to authenticated using (user_id = auth.uid());

-- engagement: insert only on someone else's drop, one row per user per drop via primary key
create policy "sparks_select" on public.sparks for select to authenticated using (true);
create policy "sparks_insert" on public.sparks for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from public.drops d where d.id = drop_id and d.user_id <> auth.uid())
);
create policy "sparks_delete_own" on public.sparks for delete to authenticated using (user_id = auth.uid());

create policy "relays_select" on public.relays for select to authenticated using (true);
create policy "relays_insert" on public.relays for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from public.drops d where d.id = drop_id and d.user_id <> auth.uid())
);
create policy "relays_delete_own" on public.relays for delete to authenticated using (user_id = auth.uid());

create policy "passes_select" on public.passes for select to authenticated using (true);
create policy "passes_insert" on public.passes for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from public.drops d where d.id = drop_id and d.user_id <> auth.uid())
);
create policy "passes_delete_own" on public.passes for delete to authenticated using (user_id = auth.uid());

create policy "echoes_select" on public.echoes for select to authenticated using (true);
create policy "echoes_insert" on public.echoes for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from public.drops d where d.id = drop_id and d.user_id <> auth.uid())
);
create policy "echoes_delete_own" on public.echoes for delete to authenticated using (user_id = auth.uid());

create policy "orbits_select" on public.orbits for select to authenticated using (true);
create policy "orbits_insert" on public.orbits for insert to authenticated with check (follower_id = auth.uid());
create policy "orbits_delete_own" on public.orbits for delete to authenticated using (follower_id = auth.uid());

create policy "reports_insert_own" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "reports_select_own" on public.reports for select to authenticated using (reporter_id = auth.uid());

create policy "hides_select" on public.hides for select to authenticated using (true);
create policy "hides_insert_own" on public.hides for insert to authenticated with check (user_id = auth.uid());
create policy "hides_delete_own" on public.hides for delete to authenticated using (user_id = auth.uid());

create policy "mutes_select" on public.mutes for select to authenticated using (true);
create policy "mutes_insert_own" on public.mutes for insert to authenticated with check (user_id = auth.uid());
create policy "mutes_delete_own" on public.mutes for delete to authenticated using (user_id = auth.uid());

-- ===== FEED / RANKING FUNCTIONS (security definer, apply viewer's mutes/hides/reports) =====
create function public.heat_score(p_sparks int, p_echoes int, p_relays int, p_passes int, p_created timestamptz)
returns numeric
language sql
stable
as $$
  select (p_sparks * 3 + p_echoes * 2 + p_relays * 5 + p_passes * 2 + 1)::numeric
    / power(extract(epoch from (now() - p_created)) / 3600.0 + 2, 1.4);
$$;

create function public.viewer_hidden(p_viewer uuid, p_drop uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_viewer is not null and exists (
    select 1 from public.hides h where h.user_id = p_viewer and h.drop_id = p_drop
  ) or exists (
    select 1 from public.reports r where r.reporter_id = p_viewer and r.drop_id = p_drop
  ) or exists (
    select 1 from public.mutes m where m.user_id = p_viewer and m.muted_id = (select d.user_id from public.drops d where d.id = p_drop)
  );
$$;

-- For You: heat-ranked recent drops, personalized (excludes hidden/muted/reported)
create function public.feed_for_you(p_viewer uuid default null, p_limit integer default 30)
returns table (
  drop_id uuid, content text, author_id uuid, username text, display_name text,
  avatar_emoji text, avatar_color text, spark_count int, echo_count int,
  relay_count int, pass_count int, created_at timestamptz, score numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select d.id, d.content, d.user_id, p.username, p.display_name,
         p.avatar_emoji, p.avatar_color, d.spark_count, d.echo_count,
         d.relay_count, d.pass_count, d.created_at,
         public.heat_score(d.spark_count, d.echo_count, d.relay_count, d.pass_count, d.created_at) as score
  from public.drops d
  join public.profiles p on p.id = d.user_id
  where d.created_at > now() - interval '72 hours'
    and not public.viewer_hidden(p_viewer, d.id)
  order by score desc
  limit p_limit;
$$;

-- Recommendations: drops from accounts the viewer doesn't orbit, popular first
create function public.recommend_drops(p_viewer uuid default null, p_limit integer default 10)
returns table (
  drop_id uuid, content text, author_id uuid, username text, display_name text,
  avatar_emoji text, avatar_color text, spark_count int, echo_count int,
  relay_count int, pass_count int, created_at timestamptz, score numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select d.id, d.content, d.user_id, p.username, p.display_name,
         p.avatar_emoji, p.avatar_color, d.spark_count, d.echo_count,
         d.relay_count, d.pass_count, d.created_at,
         public.heat_score(d.spark_count, d.echo_count, d.relay_count, d.pass_count, d.created_at) as score
  from public.drops d
  join public.profiles p on p.id = d.user_id
  where d.created_at > now() - interval '7 days'
    and (p_viewer is null or d.user_id <> p_viewer)
    and not exists (select 1 from public.orbits o where o.follower_id = p_viewer and o.followed_id = d.user_id)
    and not public.viewer_hidden(p_viewer, d.id)
  order by random()
  limit p_limit;
$$;

-- Orbit feed: newest first from followed accounts
create function public.feed_orbit(p_viewer uuid default null, p_limit integer default 30, p_before timestamptz default null)
returns table (
  drop_id uuid, content text, author_id uuid, username text, display_name text,
  avatar_emoji text, avatar_color text, spark_count int, echo_count int,
  relay_count int, pass_count int, created_at timestamptz, score numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select d.id, d.content, d.user_id, p.username, p.display_name,
         p.avatar_emoji, p.avatar_color, d.spark_count, d.echo_count,
         d.relay_count, d.pass_count, d.created_at,
         public.heat_score(d.spark_count, d.echo_count, d.relay_count, d.pass_count, d.created_at) as score
  from public.drops d
  join public.profiles p on p.id = d.user_id
  where exists (select 1 from public.orbits o where o.follower_id = p_viewer and o.followed_id = d.user_id)
    and (p_before is null or d.created_at < p_before)
    and not public.viewer_hidden(p_viewer, d.id)
  order by d.created_at desc
  limit p_limit;
$$;

-- Blurbing Now: top 5 viral drops of the last 24 hours
create function public.viral_now(p_limit integer default 5)
returns table (
  drop_id uuid, content text, author_id uuid, username text, display_name text,
  avatar_emoji text, avatar_color text, spark_count int, echo_count int,
  relay_count int, pass_count int, created_at timestamptz, score numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select d.id, d.content, d.user_id, p.username, p.display_name,
         p.avatar_emoji, p.avatar_color, d.spark_count, d.echo_count,
         d.relay_count, d.pass_count, d.created_at,
         public.heat_score(d.spark_count, d.echo_count, d.relay_count, d.pass_count, d.created_at) as score
  from public.drops d
  join public.profiles p on p.id = d.user_id
  where d.created_at > now() - interval '24 hours'
  order by score desc
  limit p_limit;
$$;

-- Hall of Blurbs: top 50 drops from the last 7 days by total engagement
create function public.hall_of_blurbs()
returns table (
  drop_id uuid, content text, author_id uuid, username text, display_name text,
  avatar_emoji text, avatar_color text, spark_count int, echo_count int,
  relay_count int, pass_count int, created_at timestamptz, score numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select d.id, d.content, d.user_id, p.username, p.display_name,
         p.avatar_emoji, p.avatar_color, d.spark_count, d.echo_count,
         d.relay_count, d.pass_count, d.created_at,
         (d.spark_count * 3 + d.echo_count * 2 + d.relay_count * 5 + d.pass_count * 2)::numeric as score
  from public.drops d
  join public.profiles p on p.id = d.user_id
  where d.created_at > now() - interval '7 days'
  order by score desc
  limit 50;
$$;

-- Profile drops by username, filtered for the viewer
create function public.profile_drops(p_username text, p_viewer uuid default null, p_limit integer default 50, p_before timestamptz default null)
returns table (
  drop_id uuid, content text, author_id uuid, username text, display_name text,
  avatar_emoji text, avatar_color text, spark_count int, echo_count int,
  relay_count int, pass_count int, created_at timestamptz, score numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select d.id, d.content, d.user_id, p.username, p.display_name,
         p.avatar_emoji, p.avatar_color, d.spark_count, d.echo_count,
         d.relay_count, d.pass_count, d.created_at,
         public.heat_score(d.spark_count, d.echo_count, d.relay_count, d.pass_count, d.created_at) as score
  from public.drops d
  join public.profiles p on p.id = d.user_id
  where lower(p.username) = lower(p_username)
    and (p_before is null or d.created_at < p_before)
    and not public.viewer_hidden(p_viewer, d.id)
  order by d.created_at desc
  limit p_limit;
$$;

-- Single drop lookup (for detail view), filtered for the viewer
create function public.get_drop(p_drop uuid, p_viewer uuid default null)
returns table (
  drop_id uuid, content text, author_id uuid, username text, display_name text,
  avatar_emoji text, avatar_color text, spark_count int, echo_count int,
  relay_count int, pass_count int, created_at timestamptz, score numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select d.id, d.content, d.user_id, p.username, p.display_name,
         p.avatar_emoji, p.avatar_color, d.spark_count, d.echo_count,
         d.relay_count, d.pass_count, d.created_at,
         public.heat_score(d.spark_count, d.echo_count, d.relay_count, d.pass_count, d.created_at) as score
  from public.drops d
  join public.profiles p on p.id = d.user_id
  where d.id = p_drop
    and not public.viewer_hidden(p_viewer, d.id);
$$;

-- Function access: authenticated only
revoke execute on function public.heat_score(integer, integer, integer, integer, timestamptz) from anon, public;
revoke execute on function public.viewer_hidden(uuid, uuid) from anon, public;
revoke execute on function public.feed_for_you(uuid, integer) from anon, public;
revoke execute on function public.recommend_drops(uuid, integer) from anon, public;
revoke execute on function public.feed_orbit(uuid, integer, timestamptz) from anon, public;
revoke execute on function public.viral_now(integer) from anon, public;
revoke execute on function public.hall_of_blurbs() from anon, public;
revoke execute on function public.profile_drops(text, uuid, integer, timestamptz) from anon, public;
revoke execute on function public.get_drop(uuid, uuid) from anon, public;
grant execute on function public.feed_for_you(uuid, integer) to authenticated;
grant execute on function public.recommend_drops(uuid, integer) to authenticated;
grant execute on function public.feed_orbit(uuid, integer, timestamptz) to authenticated;
grant execute on function public.viral_now(integer) to authenticated;
grant execute on function public.hall_of_blurbs() to authenticated;
grant execute on function public.profile_drops(text, uuid, integer, timestamptz) to authenticated;
grant execute on function public.get_drop(uuid, uuid) to authenticated;
grant execute on function public.viewer_hidden(uuid, uuid) to authenticated;
grant execute on all functions in schema public to service_role;

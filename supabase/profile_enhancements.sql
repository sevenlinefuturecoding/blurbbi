-- =============================================================================
-- Blurbbi Profile Enhancements Migration:
-- Website, Location, Pinned Drops, Orbiters/Orbiting queries, Relays & Echoes
-- =============================================================================

-- 1. Add extra profile fields
alter table public.profiles add column if not exists website text;
alter table public.profiles add column if not exists location text;
alter table public.profiles add column if not exists pinned_drop_id uuid references public.drops(id) on delete set null;
alter table public.profiles add column if not exists is_verified boolean default false;

-- 2. Allow guest reads on orbits and relays for public profiles
grant select on public.orbits to anon;
drop policy if exists "orbits_select_anon" on public.orbits;
create policy "orbits_select_anon" on public.orbits for select to anon using (true);

grant select on public.relays to anon;
drop policy if exists "relays_select_anon" on public.relays;
create policy "relays_select_anon" on public.relays for select to anon using (true);

-- 3. Function to get Orbiters (followers of a user)
create or replace function public.get_orbiters(
  p_user_id uuid,
  p_limit integer default 50
)
returns table(
  id uuid,
  username text,
  display_name text,
  bio text,
  avatar_emoji text,
  avatar_color text,
  followers_count integer,
  following_count integer
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select 
    p.id,
    p.username,
    p.display_name,
    p.bio,
    p.avatar_emoji,
    p.avatar_color,
    p.followers_count,
    p.following_count
  from public.orbits o
  join public.profiles p on p.id = o.follower_id
  where o.followed_id = p_user_id
  order by o.created_at desc
  limit p_limit;
$$;

-- 4. Function to get Orbiting (accounts followed by a user)
create or replace function public.get_orbiting(
  p_user_id uuid,
  p_limit integer default 50
)
returns table(
  id uuid,
  username text,
  display_name text,
  bio text,
  avatar_emoji text,
  avatar_color text,
  followers_count integer,
  following_count integer
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select 
    p.id,
    p.username,
    p.display_name,
    p.bio,
    p.avatar_emoji,
    p.avatar_color,
    p.followers_count,
    p.following_count
  from public.orbits o
  join public.profiles p on p.id = o.followed_id
  where o.follower_id = p_user_id
  order by o.created_at desc
  limit p_limit;
$$;

-- 5. Function to get Drops relayed by a user
create or replace function public.get_user_relays(
  p_user_id uuid,
  p_viewer uuid default null,
  p_limit integer default 50
)
returns table(
  drop_id uuid,
  content text,
  author_id uuid,
  username text,
  display_name text,
  avatar_emoji text,
  avatar_color text,
  spark_count integer,
  echo_count integer,
  relay_count integer,
  pass_count integer,
  created_at timestamptz,
  score numeric,
  relayed_at timestamptz
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select 
    d.id as drop_id,
    d.content,
    d.user_id as author_id,
    p.username,
    p.display_name,
    p.avatar_emoji,
    p.avatar_color,
    d.spark_count,
    d.echo_count,
    d.relay_count,
    d.pass_count,
    d.created_at,
    public.heat_score(d.spark_count, d.echo_count, d.relay_count, d.pass_count, d.created_at) as score,
    r.created_at as relayed_at
  from public.relays r
  join public.drops d on d.id = r.drop_id
  join public.profiles p on p.id = d.user_id
  where r.user_id = p_user_id
    and not public.viewer_hidden(p_viewer, d.id)
  order by r.created_at desc
  limit p_limit;
$$;

-- 6. RPC functions for Pin / Unpin Drop
create or replace function public.pin_drop(p_drop_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- ensure caller owns the drop
  if exists (select 1 from public.drops where id = p_drop_id and user_id = auth.uid()) then
    update public.profiles set pinned_drop_id = p_drop_id where id = auth.uid();
  else
    raise exception 'You can only pin your own Drops';
  end if;
end;
$$;

create or replace function public.unpin_drop()
returns void
language sql
security definer
set search_path to 'public'
as $$
  update public.profiles set pinned_drop_id = null where id = auth.uid();
$$;

-- 7. Grant execution
grant execute on function public.get_orbiters(uuid, integer) to anon, authenticated;
grant execute on function public.get_orbiting(uuid, integer) to anon, authenticated;
grant execute on function public.get_user_relays(uuid, uuid, integer) to anon, authenticated;
grant execute on function public.pin_drop(uuid) to authenticated;
grant execute on function public.unpin_drop() to authenticated;


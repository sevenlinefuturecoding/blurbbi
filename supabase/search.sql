-- =============================================================================
-- Blurbi Search & Explore Migration: Full-Text Search and Suggested Profiles
-- =============================================================================

-- 1. Full-text search index on drops content
create index if not exists drops_content_fts_idx 
  on public.drops using gin (to_tsvector('english', content));

-- 2. Drop Search function: uses PostgreSQL full-text search with to_tsvector + fallback
create or replace function public.search_drops(
  p_query text,
  p_limit integer default 40
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
  score numeric
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
    case 
      when length(trim(p_query)) > 0 then
        coalesce(ts_rank(to_tsvector('english', d.content), plainto_tsquery('english', p_query)), 0)::numeric
      else 0::numeric
    end as score
  from public.drops d
  join public.profiles p on p.id = d.user_id
  where (
    (length(trim(p_query)) > 0 and to_tsvector('english', d.content) @@ plainto_tsquery('english', p_query))
    or d.content ilike ('%' || p_query || '%')
    or p.username ilike ('%' || p_query || '%')
    or p.display_name ilike ('%' || p_query || '%')
  )
  order by score desc, d.created_at desc
  limit p_limit;
$$;

-- 3. Profile Search function: searches usernames, display names, and bios
create or replace function public.search_profiles(
  p_query text,
  p_limit integer default 25
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
  from public.profiles p
  where 
    p.username ilike ('%' || p_query || '%')
    or p.display_name ilike ('%' || p_query || '%')
    or p.bio ilike ('%' || p_query || '%')
  order by 
    case when p.username ilike (p_query || '%') then 0 else 1 end,
    p.followers_count desc,
    p.created_at desc
  limit p_limit;
$$;

-- 4. Suggested Profiles function: recommends active blurbers to orbit
create or replace function public.suggested_profiles(
  p_viewer uuid default null,
  p_limit integer default 12
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
  from public.profiles p
  where 
    (p_viewer is null or p.id <> p_viewer)
    and (p_viewer is null or not exists (
      select 1 from public.orbits o 
      where o.follower_id = p_viewer and o.followed_id = p.id
    ))
  order by 
    p.followers_count desc,
    p.created_at desc
  limit p_limit;
$$;

-- 5. Execution permissions for both guest (anon) and authenticated users
grant execute on function public.search_drops(text, integer) to anon, authenticated;
grant execute on function public.search_profiles(text, integer) to anon, authenticated;
grant execute on function public.suggested_profiles(uuid, integer) to anon, authenticated;


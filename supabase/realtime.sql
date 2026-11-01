-- Blurbbi Realtime Replication Setup
-- Adds core tables to the supabase_realtime publication so changes (INSERT, UPDATE, DELETE)
-- are broadcast over WebSockets to connected clients without needing page refreshes.

do $$
begin
  -- public.drops (new drops, spark_count, echo_count, relay_count, pass_count)
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'drops'
  ) then
    alter publication supabase_realtime add table public.drops;
  end if;

  -- public.echoes (thread replies / comments)
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'echoes'
  ) then
    alter publication supabase_realtime add table public.echoes;
  end if;

  -- public.profiles (profile updates, follower_count, following_count)
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;

  -- public.orbits (following / follower relationships)
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orbits'
  ) then
    alter publication supabase_realtime add table public.orbits;
  end if;

  -- public.sparks (likes)
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sparks'
  ) then
    alter publication supabase_realtime add table public.sparks;
  end if;

  -- public.relays (reposts)
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'relays'
  ) then
    alter publication supabase_realtime add table public.relays;
  end if;
end $$;


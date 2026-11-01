create or replace function public.feed_global(p_limit integer default 50, p_before timestamptz default null)
returns table(drop_id uuid, content text, author_id uuid, username text, display_name text, avatar_emoji text, avatar_color text, spark_count integer, echo_count integer, relay_count integer, pass_count integer, created_at timestamptz, score numeric)
language sql
stable
security definer
set search_path to 'public'
as $$
  select d.id, d.content, d.user_id, p.username, p.display_name,
         p.avatar_emoji, p.avatar_color, d.spark_count, d.echo_count,
         d.relay_count, d.pass_count, d.created_at,
         public.heat_score(d.spark_count, d.echo_count, d.relay_count, d.pass_count, d.created_at) as score
  from public.drops d
  join public.profiles p on p.id = d.user_id
  where (p_before is null or d.created_at < p_before)
  order by d.created_at desc
  limit p_limit;
$$;

-- Guests can browse public content read-only.
grant execute on function public.feed_global(integer, timestamptz) to anon, authenticated;
grant execute on function public.viral_now(integer) to anon;
grant execute on function public.hall_of_blurbs() to anon;
grant execute on function public.get_drop(uuid, uuid) to anon;
grant execute on function public.profile_drops(text, uuid, integer, timestamptz) to anon;

create policy "Guests can view profiles"
  on public.profiles for select
  to anon
  using (true);

create policy "Guests can view echoes"
  on public.echoes for select
  to anon
  using (true);

grant select on public.profiles to anon;
grant select on public.echoes to anon;
-- =============================================================================
-- Blurbbi Mentions & Topic Support Migration
-- 1. Updates notifications table check constraint to allow 'mention'
-- 2. Creates automatic mention notification trigger on Drops and Echoes
-- 3. Provides notify_mentions RPC for explicit client invocation
-- =============================================================================

-- 1. Allow 'mention' in notifications type check constraint
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check 
  check (type in ('spark', 'echo', 'relay', 'orbit', 'mention'));

-- Grant insert permission on notifications for authenticated users
grant insert on public.notifications to authenticated;

-- 2. Trigger function to extract @mentions from new Drops and create notifications
create or replace function public.notify_on_drop_mention()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match text[];
  v_username text;
  v_target_id uuid;
begin
  for v_match in select regexp_matches(new.content, '@([a-zA-Z0-9_]{3,20})', 'g') loop
    v_username := lower(v_match[1]);
    select id into v_target_id from public.profiles where lower(username) = v_username;
    if v_target_id is not null and v_target_id <> new.user_id then
      insert into public.notifications (user_id, actor_id, type, drop_id)
      values (v_target_id, new.user_id, 'mention', new.id);
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists trigger_notify_on_drop_mention on public.drops;
create trigger trigger_notify_on_drop_mention
  after insert on public.drops
  for each row
  execute function public.notify_on_drop_mention();

-- 3. Trigger function to extract @mentions from new Echoes
create or replace function public.notify_on_echo_mention()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match text[];
  v_username text;
  v_target_id uuid;
begin
  for v_match in select regexp_matches(new.content, '@([a-zA-Z0-9_]{3,20})', 'g') loop
    v_username := lower(v_match[1]);
    select id into v_target_id from public.profiles where lower(username) = v_username;
    if v_target_id is not null and v_target_id <> new.user_id then
      insert into public.notifications (user_id, actor_id, type, drop_id)
      values (v_target_id, new.user_id, 'mention', new.drop_id);
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists trigger_notify_on_echo_mention on public.echoes;
create trigger trigger_notify_on_echo_mention
  after insert on public.echoes
  for each row
  execute function public.notify_on_echo_mention();

-- 4. Callable RPC fallback for client
create or replace function public.notify_mentions(
  p_drop_id uuid,
  p_content text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match text[];
  v_username text;
  v_target_id uuid;
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null then
    return;
  end if;

  for v_match in select regexp_matches(p_content, '@([a-zA-Z0-9_]{3,20})', 'g') loop
    v_username := lower(v_match[1]);
    select id into v_target_id from public.profiles where lower(username) = v_username;
    if v_target_id is not null and v_target_id <> v_actor_id then
      insert into public.notifications (user_id, actor_id, type, drop_id)
      values (v_target_id, v_actor_id, 'mention', p_drop_id);
    end if;
  end loop;
end;
$$;

grant execute on function public.notify_mentions(uuid, text) to authenticated;


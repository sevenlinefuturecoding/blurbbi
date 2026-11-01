-- ===== NOTIFICATIONS =====
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('spark', 'echo', 'relay', 'orbit')),
  drop_id uuid references public.drops(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint notifications_no_self check (user_id <> actor_id)
);

create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id) where not read;

-- Grants
grant select, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;

-- RLS
alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notifications_delete_own"
  on public.notifications for delete
  to authenticated
  using (user_id = auth.uid());

-- Triggers for automatic notification creation

-- 1. Spark notification
create or replace function public.notify_on_spark()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
begin
  select user_id into v_author from public.drops where id = new.drop_id;
  if v_author is not null and v_author <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, drop_id)
    values (v_author, new.user_id, 'spark', new.drop_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_notify_on_spark on public.sparks;
create trigger trigger_notify_on_spark
after insert on public.sparks
for each row execute function public.notify_on_spark();

-- 2. Relay notification
create or replace function public.notify_on_relay()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
begin
  select user_id into v_author from public.drops where id = new.drop_id;
  if v_author is not null and v_author <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, drop_id)
    values (v_author, new.user_id, 'relay', new.drop_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_notify_on_relay on public.relays;
create trigger trigger_notify_on_relay
after insert on public.relays
for each row execute function public.notify_on_relay();

-- 3. Echo notification
create or replace function public.notify_on_echo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
begin
  select user_id into v_author from public.drops where id = new.drop_id;
  if v_author is not null and v_author <> new.user_id then
    insert into public.notifications (user_id, actor_id, type, drop_id)
    values (v_author, new.user_id, 'echo', new.drop_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_notify_on_echo on public.echoes;
create trigger trigger_notify_on_echo
after insert on public.echoes
for each row execute function public.notify_on_echo();

-- 4. Orbit (follow) notification
create or replace function public.notify_on_orbit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.followed_id <> new.follower_id then
    insert into public.notifications (user_id, actor_id, type)
    values (new.followed_id, new.follower_id, 'orbit');
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_notify_on_orbit on public.orbits;
create trigger trigger_notify_on_orbit
after insert on public.orbits
for each row execute function public.notify_on_orbit();

-- RPC: Mark all notifications read
create or replace function public.mark_all_notifications_read()
returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications
  set read = true
  where user_id = auth.uid() and read = false;
$$;

grant execute on function public.mark_all_notifications_read() to authenticated;

-- Enable Realtime
alter publication supabase_realtime add table public.notifications;


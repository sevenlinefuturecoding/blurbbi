-- =============================================================================
-- Blurbbi Daily Drop Streaks Migration
-- Drives daily active engagement for text-only creators.
-- Tracks daily posting streaks (e.g. 🔥 5-day streak) next to user badges.
-- =============================================================================

-- 1. Add streak columns to public.profiles
alter table public.profiles add column if not exists current_streak integer not null default 0;
alter table public.profiles add column if not exists longest_streak integer not null default 0;
alter table public.profiles add column if not exists last_drop_date date;

-- 2. Indexes for leaderboard and queries
create index if not exists idx_profiles_current_streak on public.profiles (current_streak desc);
create index if not exists idx_profiles_last_drop_date on public.profiles (last_drop_date);

-- 3. Streak helper function to compute active streak taking into account lapsed days
create or replace function public.get_active_streak(
  p_current_streak integer,
  p_last_drop_date date
)
returns integer
language sql
immutable
as $$
  select case
    when p_last_drop_date is null or p_current_streak is null or p_current_streak <= 0 then 0
    -- Active if posted today or yesterday (UTC date)
    when p_last_drop_date >= ((now() at time zone 'UTC')::date - 1) then p_current_streak
    else 0
  end;
$$;

grant execute on function public.get_active_streak(integer, date) to anon, authenticated, service_role;

-- 4. Automatic Drop Streak Trigger Function
create or replace function public.update_user_drop_streak()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last_date date;
  v_current_streak integer;
  v_longest_streak integer;
  v_drop_date date;
  v_new_streak integer;
  v_new_longest integer;
begin
  -- Fetch existing streak data for the author
  select last_drop_date, coalesce(current_streak, 0), coalesce(longest_streak, 0)
  into v_last_date, v_current_streak, v_longest_streak
  from public.profiles
  where id = new.user_id;

  -- Determine drop calendar date in UTC
  v_drop_date := (coalesce(new.created_at, now()) at time zone 'UTC')::date;

  if v_last_date is null then
    -- User's first ever drop
    v_new_streak := 1;
  elsif v_last_date = v_drop_date then
    -- User has already posted today, preserve streak
    v_new_streak := greatest(v_current_streak, 1);
  elsif v_last_date = (v_drop_date - 1) then
    -- Posted on consecutive day, extend streak!
    v_new_streak := v_current_streak + 1;
  else
    -- Missed one or more days, streak resets to 1
    v_new_streak := 1;
  end if;

  v_new_longest := greatest(v_longest_streak, v_new_streak);

  -- Update author profile atomically
  update public.profiles
  set
    current_streak = v_new_streak,
    longest_streak = v_new_longest,
    last_drop_date = v_drop_date
  where id = new.user_id;

  return new;
end;
$$;

-- 5. Attach Trigger to public.drops
drop trigger if exists trigger_update_user_drop_streak on public.drops;
create trigger trigger_update_user_drop_streak
after insert on public.drops
for each row
execute function public.update_user_drop_streak();

-- 6. Recalculation & Backfill Procedure for Historical Drops
create or replace function public.recalculate_all_user_streaks()
returns table (
  users_processed integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  r_user record;
  r_drop record;
  v_prev_date date;
  v_curr_streak integer;
  v_max_streak integer;
  v_last_drop_date date;
  v_count integer := 0;
begin
  for r_user in select distinct user_id from public.drops loop
    v_prev_date := null;
    v_curr_streak := 0;
    v_max_streak := 0;
    v_last_drop_date := null;

    -- Iterate chronological distinct drop dates for this user
    for r_drop in 
      select distinct (created_at at time zone 'UTC')::date as drop_day
      from public.drops
      where user_id = r_user.user_id
      order by drop_day asc
    loop
      if v_prev_date is null then
        v_curr_streak := 1;
      elsif r_drop.drop_day = (v_prev_date + 1) then
        v_curr_streak := v_curr_streak + 1;
      else
        v_curr_streak := 1;
      end if;

      v_max_streak := greatest(v_max_streak, v_curr_streak);
      v_prev_date := r_drop.drop_day;
      v_last_drop_date := r_drop.drop_day;
    end loop;

    -- If streak lapsed (more than 1 day since last drop), reset current streak to 0 for active state
    -- but preserve in DB for trigger calculation
    update public.profiles
    set
      current_streak = coalesce(v_curr_streak, 0),
      longest_streak = coalesce(v_max_streak, 0),
      last_drop_date = v_last_drop_date
    where id = r_user.user_id;

    v_count := v_count + 1;
  end loop;

  return query select v_count;
end;
$$;

-- Run backfill for existing users in database
select public.recalculate_all_user_streaks();


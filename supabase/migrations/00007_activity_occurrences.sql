-- Activities can have multiple occurrences per week (e.g. Wed 17:00-18:00 and Sat 11:00-12:00).
-- activity = logical activity (name, person); activity_occurrences = each (day, start, end).

create table if not exists public.activity_occurrences (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  day_of_week int not null check (day_of_week >= 1 and day_of_week <= 7),
  start_time text not null,
  end_time text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists activity_occurrences_activity_id_idx on public.activity_occurrences (activity_id);
create index if not exists activity_occurrences_day_of_week_idx on public.activity_occurrences (day_of_week);

alter table public.activity_occurrences enable row level security;

create policy "activity_occurrences_all" on public.activity_occurrences
  for all using (
    exists (
      select 1 from public.activities a
      where a.id = activity_occurrences.activity_id and a.household_id = current_household_id()
    )
  );

-- Migrate existing activities: one occurrence per row (keep only day_of_week / start_time / end_time that are set).
insert into public.activity_occurrences (activity_id, day_of_week, start_time, end_time)
select id, coalesce(day_of_week, 1), start_time, end_time
from public.activities
where start_time is not null and end_time is not null;

-- Remove time/day columns from activities (now on occurrences).
alter table public.activities
  drop column if exists day_of_week,
  drop column if exists start_time,
  drop column if exists end_time,
  drop column if exists recurrence_type,
  drop column if exists recurrence_nth,
  drop column if exists recurrence_weekday;

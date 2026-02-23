-- Per-day school run times (drop-off and pick-up can vary by day).
create table if not exists public.school_run_times (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  day_of_week int not null check (day_of_week >= 1 and day_of_week <= 7),
  drop_off_time text not null,
  pick_up_time text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (household_id, day_of_week)
);

alter table public.school_run_times enable row level security;

create policy "school_run_times_all" on public.school_run_times
  for all using (household_id = current_household_id());

-- Optional: make legacy columns nullable so household can use only per-day times.
alter table public.school_runs
  alter column drop_off_time drop not null,
  alter column pick_up_time drop not null;

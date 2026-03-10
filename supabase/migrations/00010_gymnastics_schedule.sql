-- Gymnastics schedule per child (weekdays only).

create table if not exists public.gymnastics_schedule (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  day_of_week int not null check (day_of_week >= 1 and day_of_week <= 5),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (person_id, day_of_week)
);

alter table public.gymnastics_schedule enable row level security;

create policy "gymnastics_schedule_all" on public.gymnastics_schedule
  for all using (
    exists (
      select 1 from public.people p
      where p.id = gymnastics_schedule.person_id and p.household_id = current_household_id()
    )
  );


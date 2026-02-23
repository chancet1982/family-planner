-- Households
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Profiles: link auth.users to household and role
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  household_id uuid references public.households (id) on delete set null,
  role text not null check (role in ('parent', 'child')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- People (family members within a household)
create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  role text not null check (role in ('parent', 'child')),
  display_order int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Chores
create table if not exists public.chores (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  repeat_pattern jsonb not null default '{}', -- e.g. {"mon": true, "tue": false, ...}
  time_of_day text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Chore assignments (many-to-many)
create table if not exists public.chore_assignments (
  chore_id uuid not null references public.chores (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  created_at timestamptz default now(),
  primary key (chore_id, person_id)
);

-- Activities
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  person_id uuid not null references public.people (id) on delete cascade,
  start_time text not null, -- HH:mm
  end_time text not null,
  day_of_week int check (day_of_week is null or (day_of_week >= 1 and day_of_week <= 7)),
  recurrence_type text not null default 'day_of_week' check (recurrence_type in ('day_of_week', 'nth_weekday')),
  recurrence_nth int check (recurrence_nth is null or (recurrence_nth >= 1 and recurrence_nth <= 5)),
  recurrence_weekday int check (recurrence_weekday is null or (recurrence_weekday >= 1 and recurrence_weekday <= 7)),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Work from home
create table if not exists public.work_from_home (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  day_of_week int not null check (day_of_week >= 1 and day_of_week <= 7),
  start_time text,
  end_time text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (person_id, day_of_week)
);

-- School runs config
create table if not exists public.school_runs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  drop_off_time text not null,
  pick_up_time text not null,
  label text not null default 'School',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (household_id)
);

-- RLS
alter table public.households enable row level security;
alter table public.profiles enable row level security;
alter table public.people enable row level security;
alter table public.chores enable row level security;
alter table public.chore_assignments enable row level security;
alter table public.activities enable row level security;
alter table public.work_from_home enable row level security;
alter table public.school_runs enable row level security;

-- Helper: user's household_id from profile
create or replace function public.current_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id from public.profiles where id = auth.uid()
$$;

-- Policies: users can only access data for their household
create policy "households_select" on public.households
  for select using (id = current_household_id());

create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

create policy "people_all" on public.people
  for all using (household_id = current_household_id());

create policy "chores_all" on public.chores
  for all using (household_id = current_household_id());

create policy "chore_assignments_all" on public.chore_assignments
  for all using (
    exists (
      select 1 from public.chores c
      where c.id = chore_assignments.chore_id and c.household_id = current_household_id()
    )
  );

create policy "activities_all" on public.activities
  for all using (household_id = current_household_id());

create policy "work_from_home_all" on public.work_from_home
  for all using (
    exists (
      select 1 from public.people p
      where p.id = work_from_home.person_id and p.household_id = current_household_id()
    )
  );

create policy "school_runs_all" on public.school_runs
  for all using (household_id = current_household_id());

-- Trigger: create profile on signup (optional – or do in app)
-- We'll create profile when user signs up and joins/creates household in app
-- For now allow insert on profiles for authenticated users (e.g. when linking to household)
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

-- Allow new households to be created by authenticated users (creator will set profile later)
create policy "households_insert" on public.households
  for insert with check (auth.uid() is not null);
create policy "households_update" on public.households
  for update using (id = current_household_id());

-- Add email and user_id to people for invites and login linking
alter table public.people
  add column if not exists email text,
  add column if not exists user_id uuid references auth.users (id) on delete set null;

-- One email per household (allow null for existing rows during backfill)
create unique index if not exists people_household_email_key
  on public.people (household_id, lower(email))
  where email is not null;

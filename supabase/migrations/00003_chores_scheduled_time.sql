-- Optional specific time for a chore (HH:mm). Use time picker in admin.
alter table public.chores
  add column if not exists scheduled_time text;

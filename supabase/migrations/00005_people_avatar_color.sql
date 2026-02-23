-- Add avatar color for people (color key used for colorful avatar circles)
alter table public.people
  add column if not exists avatar_color text not null default 'blue';

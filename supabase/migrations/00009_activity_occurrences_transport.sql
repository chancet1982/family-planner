-- Add per-occurrence transport configuration for activities.
-- Each activity_occurrence can specify how the child gets to/from the activity.

alter table public.activity_occurrences
  add column if not exists drop_off_mode text not null default 'parent' check (drop_off_mode in ('parent','grandparents','alone')),
  add column if not exists pick_up_mode text not null default 'parent' check (pick_up_mode in ('parent','grandparents','alone')),
  add column if not exists drop_off_parent_id uuid references public.people (id) on delete set null,
  add column if not exists pick_up_parent_id uuid references public.people (id) on delete set null;


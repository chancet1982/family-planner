-- Per-day assignment of who does drop-off and who does pick-up (when both parents WFH).
alter table public.school_run_times
  add column if not exists drop_off_assigned_person_id uuid references public.people (id) on delete set null,
  add column if not exists pick_up_assigned_person_id uuid references public.people (id) on delete set null;

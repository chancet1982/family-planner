-- Allow users to see a household they just created (before their profile has household_id).
-- Without this, INSERT succeeds but SELECT .single() fails RLS when returning the new row.

alter table public.households
  add column if not exists created_by uuid references auth.users (id) on delete set null;

-- Drop the existing select policy and recreate with "creator can select" clause
drop policy if exists "households_select" on public.households;
create policy "households_select" on public.households
  for select using (
    id = current_household_id()
    or created_by = auth.uid()
  );

-- Restrict insert so created_by must match current user (optional but clearer)
drop policy if exists "households_insert" on public.households;
create policy "households_insert" on public.households
  for insert with check (auth.uid() is not null and (created_by is null or created_by = auth.uid()));

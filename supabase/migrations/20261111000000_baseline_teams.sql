-- Baseline: the `public.teams` table that already exists in the live project
-- (created in the dashboard before any migration file existed). Captured from
-- the live schema on 2026-11-15.
--
-- Safe to run against the live project: every statement is a no-op there.
-- On a fresh database it creates the same table and policy.

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  name text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.teams enable row level security;

-- A signed-in user can read and write their own teams, nothing else.
drop policy if exists "own teams" on public.teams;
create policy "own teams" on public.teams
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

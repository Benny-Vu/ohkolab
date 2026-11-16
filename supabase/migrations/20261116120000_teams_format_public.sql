-- Drift capture: `format` and `is_public` on `public.teams`, plus the
-- public-read policy, were added in the dashboard after the baseline
-- migration was captured. This file records them so a fresh database built
-- from migrations matches the live schema. Safe to run against the live
-- project: every statement is a no-op there.

alter table public.teams
  add column if not exists format text not null default 'doubles';
alter table public.teams
  add column if not exists is_public boolean not null default false;

-- Anyone (even guests) can read public teams; only the owner can write them.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'teams'
      and policyname = 'public teams are readable'
  ) then
    create policy "public teams are readable" on public.teams
      for select
      to public
      using (is_public = true);
  end if;
end;
$$;

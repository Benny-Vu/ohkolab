-- Retention for moderation records: 12 months (owner decision, 2026-11-18).
--
-- The privacy policy promises that moderation records (actions and their
-- reasons, the removed-content snapshot, appeals, suspensions) are kept for
-- 12 months after the decision, or after a suspension ends, and then deleted
-- automatically, whether or not the account still exists. This migration
-- turns that promise into a daily job.
--
-- Appeals and moderation notifications reference moderation_actions with
-- on delete cascade, so deleting an action deletes them too.
--
-- Idempotent: create extension if not exists, create or replace function,
-- and cron.schedule() with a job name updates the existing job.
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create or replace function public.purge_moderation_records(older_than interval)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.moderation_actions
  where created_at < now() - purge_moderation_records.older_than;

  delete from public.user_suspensions
  where "until" < now() - purge_moderation_records.older_than;
end;
$$;

revoke execute on function public.purge_moderation_records(interval)
  from public, anon, authenticated;

-- Every day at 03:17 UTC.
select cron.schedule(
  'purge-moderation-records',
  '17 3 * * *',
  $$select public.purge_moderation_records(interval '12 months')$$
);

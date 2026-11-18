-- Runs the cleanup-images Edge Function every 15 minutes (owner's go-ahead,
-- 2026-11-18, image posts switch-on).
--
-- It moves files of removed posts into quarantine (so removed images stop
-- being served within the Worker's one-hour cache), deletes orphaned files,
-- and purges quarantined files older than 12 months that no moderation record
-- still lists.
--
-- The request carries a service key read from Vault (secret 'service_role_key',
-- stored by the owner in the SQL editor; never in this file). The function
-- accepts any service-level key for the project.
--
-- Idempotent: cron.schedule() with a job name updates the existing job.
-- ---------------------------------------------------------------------------

create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'cleanup-images',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://jzpyoyjnhuokprsdoiqf.supabase.co/functions/v1/cleanup-images',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

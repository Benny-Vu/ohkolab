-- Give the server-side service_role the standard Supabase access to the public
-- schema (owner's go-ahead, 2026-11-18).
--
-- In this project service_role had no privileges on any public table, so the
-- image Edge Functions (screen-image, cleanup-images), which use the service
-- key, failed with "permission denied". service_role bypasses RLS by design
-- and is only ever used server-side (Edge Functions, the scheduler); the
-- website uses the anon and authenticated roles, whose grants are unchanged.
-- Idempotent.
-- ---------------------------------------------------------------------------

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Tables, sequences and functions created later (by postgres, which runs the
-- migrations) get the same access.
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges for role postgres in schema public
  grant usage, select on sequences to service_role;
alter default privileges for role postgres in schema public
  grant execute on functions to service_role;

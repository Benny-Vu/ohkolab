-- Pending image delete (2026-11-19). The screening-retry polish wave: when
-- an image's screening never succeeds (the screen-image function was
-- unreachable, or its automatic retries failed), the author gets a
-- "Remove image" button after 24 hours. This migration opens exactly that
-- one delete: the author may delete their own row while it is `pending`.
--
-- No schema change: `src/lib/database.types.ts` is unaffected. The storage
-- file in post-images-pending is NOT deleted by SQL — the cleanup-images
-- Edge Function (20261119180000_cleanup_images_schedule.sql) removes files
-- whose post_images row is gone, on its existing schedule.
--
-- Idempotent: the grant re-runs harmlessly, and the policy is created inside
-- a do-block that checks for it first (create policy has no if-not-exists
-- form). Nothing is dropped.

-- The delete itself: authenticated only. The policy below is what narrows it;
-- the grant cannot be column-scoped, so the policy is the whole guard.
grant delete on public.post_images to authenticated;

-- Authors may remove their own images, and only while screening never
-- decided: `pending` rows. Everything else (approved, rejected, blocked)
-- stays under the service role's exclusive control, exactly as before.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'post_images'
      and policyname = 'authors delete their own pending images'
  ) then
    create policy "authors delete their own pending images"
      on public.post_images
      for delete
      to authenticated
      using (
        author_id = (select auth.uid())
        and status = 'pending'
      );
  end if;
end;
$$;

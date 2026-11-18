-- Signed-out visitors read the feed through feed_posts and the "visible posts
-- are readable" policy, which both check public.blocks. Without SELECT on
-- blocks, anon got "permission denied" and the signed-out feed failed
-- (found 2026-11-19; applied live the same day with the owner's go-ahead).
-- RLS still applies: the only SELECT policy on blocks is for authenticated
-- users and their own rows, so anon reads zero rows. Idempotent.
grant select on public.blocks to anon;

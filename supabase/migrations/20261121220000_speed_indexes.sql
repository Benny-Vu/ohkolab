-- Speed indexes: the six the live Supabase performance advisor flagged
-- on 2026-11-20. All foreign keys without an index, so the cascade and
-- the join sides were seq-scanning their tables.

-- A participant's conversations (the messages list; the pkey leads with
-- conversation_id, so user_id lookups had no index).
create index if not exists conversation_participants_user_idx
  on public.conversation_participants (user_id);

-- Finding the conversation with one other user, and the creator
-- (audit; account deletion cascades).
create index if not exists conversations_user_b_idx on public.conversations (user_b);
create index if not exists conversations_created_by_idx
  on public.conversations (created_by);

-- The report a message report belongs to, and who filed it (moderation
-- joins and the account-deletion set-null cascade).
create index if not exists message_reports_report_idx
  on public.message_reports (report_id);
create index if not exists message_reports_reporter_idx
  on public.message_reports (reporter_id);

-- The suspension a moderation action enforced (the appeal and notice
-- pages join on it).
create index if not exists moderation_actions_suspension_idx
  on public.moderation_actions (suspension_id);

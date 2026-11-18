-- Feedback: the "Tell us what happened" form and the crash screen write
-- rows here, and moderators triage them at /admin/feedback. Part of the
-- telemetry groundwork (see the Obsidian vault: telemetry-plan.md).
-- `src/lib/database.types.ts` is hand-written from the migrations.
--
-- Idempotent: safe to run again. The table and indexes use `if not
-- exists`, functions use `create or replace`, and policies and triggers
-- are created inside do-blocks that check for them first, because
-- `create policy` and `create trigger` have no `if not exists` form.
-- Nothing is dropped anywhere in this migration.
--
-- NOTE FOR THE OWNER: apply this migration before deploying the feedback
-- client. The client degrades gracefully (the form says the feature is
-- not available) while the table is missing, so the order is safe, but
-- feedback sent before the migration exists is lost.

-- ---------------------------------------------------------------------------
-- feedback: one row per message from the in-app form. Users insert their
-- own rows and read them back (so the form can confirm what was sent);
-- moderators read everything for triage. Only set_feedback_status()
-- changes status, handled_by and handled_at, so there is no update grant:
-- a status of 'done' always corresponds to a moderator action.
-- ---------------------------------------------------------------------------

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  -- Deleted with the account: feedback is personal data, so it must not
  -- survive account deletion.
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null
    constraint feedback_kind_check check (kind in ('bug', 'idea', 'other')),
  message text not null
    constraint feedback_message_length check (char_length(message) between 10 and 2000),
  -- Technical details from the client (page, app version, browser, screen
  -- size, last crash id): a JSON object of at most 2000 bytes serialized.
  context jsonb
    constraint feedback_context_shape check (
      context is null
      or (
        jsonb_typeof(context) in ('object', 'array')
        and octet_length(context::text) <= 2000
      )
    ),
  status text not null default 'new'
    constraint feedback_status_check check (status in ('new', 'seen', 'done')),
  created_at timestamptz not null default now(),
  -- Set by set_feedback_status(). Kept (as null) when the moderator's
  -- account is deleted, so the triage record survives.
  handled_by uuid references public.profiles (id) on delete set null,
  handled_at timestamptz
);

alter table public.feedback enable row level security;

revoke all on public.feedback from anon, authenticated;
grant select on public.feedback to authenticated;
grant insert (user_id, kind, message, context) on public.feedback to authenticated;
-- No update grant: set_feedback_status() is the only writer of status,
-- handled_by and handled_at.

-- Moderators and admins can read every feedback row (triage).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'feedback'
      and policyname = 'moderators read feedback'
  ) then
    create policy "moderators read feedback" on public.feedback
      for select
      to authenticated
      using (public.is_moderator());
  end if;
end;
$$;

-- Users can read their own feedback (the form confirms what was sent).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'feedback'
      and policyname = 'users read their feedback'
  ) then
    create policy "users read their feedback" on public.feedback
      for select
      to authenticated
      using (user_id = (select auth.uid()));
  end if;
end;
$$;

-- Signed-in, not suspended users can send feedback, only as themselves.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'feedback'
      and policyname = 'signed-in users send feedback'
  ) then
    create policy "signed-in users send feedback" on public.feedback
      for insert
      to authenticated
      with check (
        user_id = (select auth.uid())
        and not public.is_suspended((select auth.uid()))
      );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- set_feedback_status: moderators triage feedback. The errcode continues
-- the custom P0A class from the social migrations:
--   P0A06 - too many feedback messages in an hour
-- ---------------------------------------------------------------------------

create or replace function public.set_feedback_status(feedback_id uuid, new_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'Only moderators can handle feedback'
      using errcode = '42501';
  end if;
  if set_feedback_status.new_status not in ('seen', 'done') then
    raise exception 'Invalid feedback status'
      using errcode = '23514';
  end if;
  update public.feedback
  set status = set_feedback_status.new_status,
      handled_by = (select auth.uid()),
      handled_at = now()
  where feedback.id = set_feedback_status.feedback_id;
end;
$$;

revoke execute on function public.set_feedback_status(uuid, text) from public, anon, authenticated;
-- Moderators are signed in, so authenticated is the only role that needs
-- this. The function re-checks the caller's role itself.
grant execute on function public.set_feedback_status(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Feedback rate limit: at most 5 messages per user per hour. The errcode
-- continues the custom P0A class:
--   P0A06 - too many feedback messages in an hour
-- ---------------------------------------------------------------------------

create or replace function public.enforce_feedback_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.feedback
    where feedback.user_id = new.user_id
      and feedback.created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'Too many feedback messages; wait an hour'
      using errcode = 'P0A06';
  end if;
  return new;
end;
$$;

-- Trigger functions are never called directly; revoke keeps clients from
-- calling them through the API.
revoke execute on function public.enforce_feedback_limits() from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.feedback'::regclass
      and tgname = 'feedback_enforce_limits'
  ) then
    create trigger feedback_enforce_limits
      before insert on public.feedback
      for each row execute function public.enforce_feedback_limits();
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Indexes.
-- ---------------------------------------------------------------------------

-- The admin queue, newest first, per status.
create index if not exists feedback_status_created_idx
  on public.feedback (status, created_at desc);
-- A user's own feedback (the form's confirmation) and the rate limit.
create index if not exists feedback_user_idx
  on public.feedback (user_id, created_at desc);
-- The moderator who triaged each row (audit).
create index if not exists feedback_handled_by_idx on public.feedback (handled_by);

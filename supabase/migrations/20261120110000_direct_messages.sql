-- Direct messages, built but not launched (owner decision, 2026-11-19).
--
-- Everything in this migration is inert until the owner applies it and turns
-- the VITE_DIRECT_MESSAGES build flag on. The app must not query these
-- tables while the flag is off.
--
-- House rules this file follows (see 20261117100000_social_foundation.sql):
-- idempotent (if not exists, create or replace, policies and triggers inside
-- guard blocks because they have no "if not exists" form), security definer
-- functions carry `set search_path = ''`, and `src/lib/database.types.ts` is
-- hand-written from the result.
--
-- One deliberate deviation from the brief: the birth date lives in its own
-- table, `profile_birth_dates`, not in a `profiles.birth_date` column.
-- The profiles table is public to every role (`profiles are public` policy),
-- and RLS is row-level only, so a birth date column there would be readable
-- by everyone. A separate table with owner-only policies is the only way to
-- honour "not readable by other users".

-- ---------------------------------------------------------------------------
-- Birth dates. Used only to decide whether a user is an adult (18 or older);
-- users without a birth date are treated as minors (friends-only messaging).
-- ---------------------------------------------------------------------------

create table if not exists public.profile_birth_dates (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  birth_date date not null
    constraint profile_birth_dates_no_future check (birth_date <= current_date),
  updated_at timestamptz not null default now()
);

alter table public.profile_birth_dates enable row level security;

revoke all on public.profile_birth_dates from anon, authenticated;
-- The select policy still limits reads to the owner's own row.
grant select on public.profile_birth_dates to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profile_birth_dates'
      and policyname = 'users read their own birth date'
  ) then
    create policy "users read their own birth date" on public.profile_birth_dates
      for select
      to authenticated
      using (user_id = (select auth.uid()));
  end if;
end;
$$;

-- Sets the caller's own birth date. Rejects future dates and dates that
-- make the user under 13 (the minimum age for an account); being under 18
-- only restricts messaging, which is_adult() decides.
create or replace function public.set_birth_date(new_birth_date date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Not signed in' using errcode = 'PGRST301';
  end if;
  if new_birth_date > current_date then
    raise exception 'Birth date is in the future' using errcode = '23514';
  end if;
  if new_birth_date > current_date - interval '13 years' then
    raise exception 'You must be at least 13 years old' using errcode = '23514';
  end if;
  insert into public.profile_birth_dates (user_id, birth_date)
    values (caller, new_birth_date)
  on conflict (user_id)
    do update set birth_date = excluded.birth_date, updated_at = now();
end;
$$;

revoke execute on function public.set_birth_date(date) from public, anon;
grant execute on function public.set_birth_date(date) to authenticated;

-- True when the user has a birth date and is 18 or older. False when the
-- birth date is missing (treated as a minor) or the user does not exist.
-- Security definer so policies and the messaging RPCs can call it without
-- granting reads on profile_birth_dates; it returns only a boolean, the
-- same deal as is_moderator() and is_suspended().
create or replace function public.is_adult(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profile_birth_dates
    where user_id = is_adult.target_user_id
      and birth_date <= current_date - interval '18 years'
  );
$$;

revoke execute on function public.is_adult(uuid) from public, anon;
grant execute on function public.is_adult(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Message settings: who may start a conversation with this user. "friends"
-- (the default) means both users follow each other; "following" means only
-- users this user follows; "nobody" blocks all conversation starts.
-- ---------------------------------------------------------------------------

create table if not exists public.message_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  who_can_message text not null default 'friends'
    constraint message_settings_who_check check (who_can_message in ('friends', 'following', 'nobody')),
  updated_at timestamptz not null default now()
);

alter table public.message_settings enable row level security;

revoke all on public.message_settings from anon, authenticated;
-- The policies below limit every read and update to the owner's own row.
grant select on public.message_settings to authenticated;
grant update (who_can_message) on public.message_settings to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'message_settings'
      and policyname = 'users read their own message settings'
  ) then
    create policy "users read their own message settings" on public.message_settings
      for select
      to authenticated
      using (user_id = (select auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'message_settings'
      and policyname = 'users change their own message settings'
  ) then
    create policy "users change their own message settings" on public.message_settings
      for update
      to authenticated
      using (user_id = (select auth.uid()))
      with check (user_id = (select auth.uid()));
  end if;
end;
$$;

-- Every profile gets default settings, so lookups never need a fallback.
-- Inserted here and by the client's first update (the grant is update-only,
-- so the default row must exist).
create or replace function public.ensure_message_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.message_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.ensure_message_settings() from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.profiles'::regclass
      and tgname = 'profiles_ensure_message_settings'
  ) then
    create trigger profiles_ensure_message_settings
      after insert on public.profiles
      for each row execute function public.ensure_message_settings();
  end if;
end;
$$;

-- Backfill for profiles that already exist when this migration runs.
insert into public.message_settings (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Conversations: one-to-one only. The two participants are stored sorted
-- (user_a < user_b) with a unique pair, so a pair of users can never have
-- two conversations, regardless of who started it.
-- Rows are created only by start_conversation(); clients get no insert,
-- update or delete grants on this table.
-- ---------------------------------------------------------------------------

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  -- Who created the conversation (for rate limiting starts per sender).
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint conversations_order check (user_a < user_b),
  constraint conversations_pair_unique unique (user_a, user_b)
);

alter table public.conversations enable row level security;

revoke all on public.conversations from anon, authenticated;
-- Participants pass the select policy; nothing else is client-writable.
grant select on public.conversations to authenticated;

-- ---------------------------------------------------------------------------
-- Conversation participants: one row per user per conversation. last_read_at
-- drives the unread markers; closed_at is reserved for a future "close this
-- conversation" action and is null for now (a block closes a conversation
-- only for the blocked user, which is derived from blocks, not stored here).
-- Created only by start_conversation().
-- ---------------------------------------------------------------------------

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint conversation_participants_pkey primary key (conversation_id, user_id)
);

alter table public.conversation_participants enable row level security;

revoke all on public.conversation_participants from anon, authenticated;
-- Participants read their own rows; last_read_at is the only updatable
-- column (marking a conversation read).
grant select on public.conversation_participants to authenticated;
grant update (last_read_at) on public.conversation_participants to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'conversation_participants'
      and policyname = 'participants read their participation'
  ) then
    create policy "participants read their participation"
      on public.conversation_participants
      for select
      to authenticated
      using (user_id = (select auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'conversation_participants'
      and policyname = 'participants mark their conversation read'
  ) then
    create policy "participants mark their conversation read"
      on public.conversation_participants
      for update
      to authenticated
      using (user_id = (select auth.uid()))
      with check (user_id = (select auth.uid()));
  end if;
end;
$$;

-- True when the given user is a participant of the given conversation.
-- Security definer so the conversations and messages policies can read
-- conversation_participants, which clients can only see through these
-- policies anyway. Defined after the table it reads and before the policies
-- that call it.
create or replace function public.user_id_participates(
  participant uuid,
  conversation uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_participants
    where conversation_id = user_id_participates.conversation
      and user_id = user_id_participates.participant
  );
$$;

revoke execute on function public.user_id_participates(uuid, uuid)
  from public, anon, authenticated;
-- The read policies below call it on the reader's behalf, so the API
-- role needs execute. It only returns a boolean.
grant execute on function public.user_id_participates(uuid, uuid)
  to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'conversations'
      and policyname = 'participants read their conversations'
  ) then
    create policy "participants read their conversations" on public.conversations
      for select
      to authenticated
      using (
        public.user_id_participates((select auth.uid()), id)
      );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Messages: text only, 1 to 2000 characters. Deleted messages keep their row
-- with deleted_at set (soft delete by the sender); the body stays in the row
-- but the app hides it. Reported message content survives in
-- message_reports snapshots even after the account is deleted, because
-- message_reports.message_id is deliberately not a foreign key.
-- ---------------------------------------------------------------------------

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null
    constraint messages_body_length check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.messages enable row level security;

revoke all on public.messages from anon, authenticated;
-- Only participants pass the select policy. Moderators do NOT: they see
-- message content only through message_reports snapshots.
grant select on public.messages to authenticated;
grant insert (conversation_id, sender_id, body) on public.messages to authenticated;
-- The sender soft-deletes their own message (deleted_at only).
grant update (deleted_at) on public.messages to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'messages'
      and policyname = 'participants read messages'
  ) then
    create policy "participants read messages" on public.messages
      for select
      to authenticated
      using (public.user_id_participates((select auth.uid()), conversation_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'messages'
      and policyname = 'participants send messages'
  ) then
    create policy "participants send messages" on public.messages
      for insert
      to authenticated
      with check (
        sender_id = (select auth.uid())
          and public.user_id_participates((select auth.uid()), conversation_id)
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'messages'
      and policyname = 'senders delete their own messages'
  ) then
    create policy "senders delete their own messages" on public.messages
      for update
      to authenticated
      using (sender_id = (select auth.uid()))
      with check (sender_id = (select auth.uid()));
  end if;
end;
$$;

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at desc);
create index if not exists messages_sender_created_idx
  on public.messages (sender_id, created_at desc);

-- Every message re-checks the block and minor rules (not just at
-- conversation start) and the per-minute rate limit. The errcode pattern
-- follows enforce_report_limits(): P0A09 means "sending messages too
-- quickly", which the app maps to a friendly rate-limit message.
create or replace function public.enforce_message_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sender uuid := new.sender_id;
  other uuid;
  recipient_setting text;
begin
  if sender is null then
    raise exception 'Not signed in' using errcode = 'PGRST301';
  end if;

  -- The other participant of this conversation.
  select case when c.user_a = sender then c.user_b else c.user_a end
    into other
  from public.conversations c
  where c.id = new.conversation_id;
  if other is null then
    raise exception 'Conversation not found' using errcode = 'PGRST116';
  end if;

  -- A block in either direction stops delivery: the blocked user cannot
  -- send, and the conversation is closed for them.
  if exists (
    select 1 from public.blocks
    where (blocker_id = other and blocked_id = sender)
       or (blocker_id = sender and blocked_id = other)
  ) then
    raise exception 'You cannot message this user'
      using errcode = '42501';
  end if;

  -- Minors (and users without a birth date) message friends only, on both
  -- sides, whatever the settings say.
  if not public.is_adult(sender) or not public.is_adult(other) then
    if not public.are_friends(sender, other) then
      raise exception 'You can only message friends'
        using errcode = '42501';
    end if;
  end if;

  -- At most 20 messages per sender per minute.
  if (
    select count(*) from public.messages
    where sender_id = sender
      and created_at > now() - interval '1 minute'
  ) >= 20 then
    raise exception 'Sending messages too quickly'
      using errcode = 'P0A09';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_message_rules()
  from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.messages'::regclass
      and tgname = 'messages_enforce_rules'
  ) then
    create trigger messages_enforce_rules
      before insert on public.messages
      for each row execute function public.enforce_message_rules();
  end if;
end;
$$;

-- True when both users follow each other ("friends"). Security definer so
-- the messaging RPCs can read follows without granting anything extra.
create or replace function public.are_friends(user_one uuid, user_two uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.follows f1
    join public.follows f2
      on f2.follower_id = f1.followee_id
     and f2.followee_id = f1.follower_id
    where f1.follower_id = are_friends.user_one
      and f1.followee_id = are_friends.user_two
  );
$$;

revoke execute on function public.are_friends(uuid, uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- start_conversation(other uuid): the single entry point for creating a
-- conversation. Every rule is checked server side; the client only renders
-- the errors. Error codes:
--   P0A08 - too many new conversations today
--   42501 - a rule (block, setting, minor) forbids it
--   23514 - the account is too new or the email is not confirmed
-- ---------------------------------------------------------------------------

create or replace function public.start_conversation(other uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  caller_created timestamptz;
  caller_confirmed timestamptz;
  recipient_setting text;
  existing_conversation uuid;
begin
  if caller is null then
    raise exception 'Not signed in' using errcode = 'PGRST301';
  end if;
  if other = caller then
    raise exception 'You cannot message yourself' using errcode = '23514';
  end if;
  if not exists (select 1 from public.profiles where id = other) then
    raise exception 'User not found' using errcode = 'PGRST116';
  end if;

  -- The account must be at least 3 days old with a confirmed email.
  select u.created_at, u.email_confirmed_at
    into caller_created, caller_confirmed
  from auth.users u
  where u.id = caller;
  if caller_created is null
     or caller_created > now() - interval '3 days'
     or caller_confirmed is null then
    raise exception 'Your account is not ready to send messages yet'
      using errcode = '23514';
  end if;

  -- A block in either direction forbids the conversation.
  if exists (
    select 1 from public.blocks
    where (blocker_id = other and blocked_id = caller)
       or (blocker_id = caller and blocked_id = other)
  ) then
    raise exception 'You cannot message this user' using errcode = '42501';
  end if;

  -- The recipient's setting, defaulting to friends-only.
  select coalesce(s.who_can_message, 'friends')
    into recipient_setting
  from public.message_settings s
  where s.user_id = other;

  -- Minors (and users without a birth date) can only talk to friends,
  -- whatever the settings say, on either side.
  if not public.is_adult(caller) or not public.is_adult(other) then
    if not public.are_friends(caller, other) then
      raise exception 'You can only message friends' using errcode = '42501';
    end if;
  elsif recipient_setting = 'nobody' then
    raise exception 'This user does not accept messages'
      using errcode = '42501';
  elsif recipient_setting = 'following'
    and not exists (
      select 1 from public.follows
      where follower_id = other and followee_id = caller
    ) then
    raise exception 'This user does not accept messages from you'
      using errcode = '42501';
  end if;

  -- At most 10 new conversations per sender per 24 hours.
  if (
    select count(*) from public.conversations
    where created_by = caller
      and created_at > now() - interval '24 hours'
  ) >= 10 then
    raise exception 'Too many new conversations today'
      using errcode = 'P0A08';
  end if;

  -- One conversation per pair, regardless of who started it.
  select id into existing_conversation
  from public.conversations
  where (user_a = least(caller, other) and user_b = greatest(caller, other));
  if existing_conversation is not null then
    return existing_conversation;
  end if;

  insert into public.conversations (user_a, user_b, created_by)
    values (least(caller, other), greatest(caller, other), caller)
  returning id into existing_conversation;

  insert into public.conversation_participants (conversation_id, user_id)
    values (existing_conversation, caller), (existing_conversation, other);

  return existing_conversation;
end;
$$;

revoke execute on function public.start_conversation(uuid) from public, anon;
grant execute on function public.start_conversation(uuid) to authenticated;

-- Whether the caller may start a conversation with the user, per the same
-- rules as start_conversation minus the once-per-pair and rate checks, so
-- profile pages can show the Message button without duplicating the rules
-- client side. Does not reveal which rule failed, only the answer.
create or replace function public.can_message(other uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  caller_created timestamptz;
  caller_confirmed timestamptz;
  recipient_setting text;
begin
  if caller is null or other = caller then
    return false;
  end if;
  if not exists (select 1 from public.profiles where id = other) then
    return false;
  end if;

  select u.created_at, u.email_confirmed_at
    into caller_created, caller_confirmed
  from auth.users u
  where u.id = caller;
  if caller_created is null
     or caller_created > now() - interval '3 days'
     or caller_confirmed is null then
    return false;
  end if;

  if exists (
    select 1 from public.blocks
    where (blocker_id = other and blocked_id = caller)
       or (blocker_id = caller and blocked_id = other)
  ) then
    return false;
  end if;

  select coalesce(s.who_can_message, 'friends')
    into recipient_setting
  from public.message_settings s
  where s.user_id = other;

  if not public.is_adult(caller) or not public.is_adult(other) then
    return public.are_friends(caller, other);
  end if;

  if recipient_setting = 'nobody' then
    return false;
  end if;
  if recipient_setting = 'following' then
    return exists (
      select 1 from public.follows
      where follower_id = other and followee_id = caller
    );
  end if;
  -- friends
  return public.are_friends(caller, other);
end;
$$;

revoke execute on function public.can_message(uuid) from public, anon;
grant execute on function public.can_message(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- message_reports: the snapshot of a reported message and the 20 before it.
-- The snapshot is copied text, not a reference, so it survives the account
-- and message being deleted (message_id is deliberately not a foreign key).
-- Reporters cannot be read here: only moderators read this table.
-- ---------------------------------------------------------------------------

create table if not exists public.message_reports (
  id uuid primary key default gen_random_uuid(),
  -- The queue row this snapshot belongs to. Deleting the report deletes
  -- the snapshot with it.
  report_id uuid not null references public.reports (id) on delete cascade,
  -- Set (as null) when the reporter's account is deleted, so the report
  -- itself survives.
  reporter_id uuid references public.profiles (id) on delete set null,
  -- Not a foreign key: the message may be deleted (by its sender or with
  -- the account) while the reported snapshot must survive.
  message_id uuid not null,
  conversation_id uuid not null
    references public.conversations (id) on delete cascade,
  -- The reported message plus the 20 before it, oldest first:
  -- [{id, sender_id, body, created_at}, ...]
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.message_reports enable row level security;

revoke all on public.message_reports from anon, authenticated;
-- Only moderators pass the select policy; nothing is client-writable.
grant select on public.message_reports to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'message_reports'
      and policyname = 'moderators read message reports'
  ) then
    create policy "moderators read message reports" on public.message_reports
      for select
      to authenticated
      using (public.is_moderator());
  end if;
end;
$$;

-- The moderation queue accepts message reports. Idempotent: the constraint
-- is only rebuilt when 'message' is missing from the allowed target types.
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.reports'::regclass
      and conname = 'reports_target_type_check'
      and pg_get_constraintdef(oid) not like '%message%'
  ) then
    alter table public.reports drop constraint reports_target_type_check;
    alter table public.reports
      add constraint reports_target_type_check
      check (target_type in ('post', 'comment', 'profile', 'message'));
  end if;
end;
$$;

-- report_message(message_id, reason): copies the message and the 20 before
-- it into the snapshot, files the report in the existing moderation queue
-- (whose insert fires the existing per-hour report rate limit) and returns
-- the queue row's id.
create or replace function public.report_message(
  message_id uuid,
  reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  reported record;
  queue_id uuid;
begin
  if caller is null then
    raise exception 'Not signed in' using errcode = 'PGRST301';
  end if;
  if reason not in ('spam', 'harassment', 'inappropriate', 'other') then
    raise exception 'Invalid report reason' using errcode = '23514';
  end if;

  select m.conversation_id, m.sender_id, m.body, m.created_at
    into reported
  from public.messages m
  where m.id = report_message.message_id and m.deleted_at is null;
  if reported is null then
    raise exception 'Message not found' using errcode = 'PGRST116';
  end if;

  -- Only participants can report from inside a conversation.
  if not public.user_id_participates(caller, reported.conversation_id) then
    raise exception 'Not your conversation' using errcode = '42501';
  end if;

  insert into public.reports (reporter_id, target_type, target_id, reason)
    values (caller, 'message', report_message.message_id, reason)
  returning id into queue_id;

  -- The reported message plus the 20 before it, oldest first.
  insert into public.message_reports (
    report_id, reporter_id, message_id, conversation_id, snapshot
  )
  select queue_id, caller, report_message.message_id, reported.conversation_id,
    jsonb_agg(msg order by msg.created_at)
  from (
    select m.id, m.sender_id, m.body, m.created_at
    from public.messages m
    where m.conversation_id = reported.conversation_id
      and m.deleted_at is null
      and m.created_at <= reported.created_at
    order by m.created_at desc
    limit 21
  ) msg;

  return queue_id;
end;
$$;

revoke execute on function public.report_message(uuid, text) from public, anon;
grant execute on function public.report_message(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Retention: messages and message reports are kept for one year, then
-- deleted automatically (owner decision). Account deletion cascades a
-- user's messages and conversations; reported content survives only as
-- the snapshot inside message_reports, for its year.
-- ---------------------------------------------------------------------------

create or replace function public.purge_direct_messages()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Old reports go first: deleting the queue row cascades the snapshot.
  delete from public.reports
  where target_type = 'message'
    and created_at < now() - interval '1 year';

  delete from public.messages
  where created_at < now() - interval '1 year';

  -- Conversations with no messages left and no participants are gone with
  -- their participants (on delete cascade); nothing else to clean up.
end;
$$;

revoke execute on function public.purge_direct_messages()
  from public, anon, authenticated;

-- Every day at 03:41 UTC (a different minute from the moderation purge).
select cron.schedule(
  'purge-direct-messages',
  '41 3 * * *',
  $$select public.purge_direct_messages()$$
);

-- ---------------------------------------------------------------------------
-- Realtime: live message delivery uses Supabase Realtime on the messages
-- table. Realtime enforces the RLS policies above for every subscriber, so
-- a participant receives only their own conversations' messages.
-- Guarded so the migration is idempotent.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

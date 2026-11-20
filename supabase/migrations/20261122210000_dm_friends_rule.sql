-- Fixes a gap in start_conversation (20261120110000_direct_messages.sql):
-- the 'friends' setting (the default) was never enforced for two adults.
-- The elsif chain only handled 'nobody' and 'following', so any adult could
-- open a conversation with any adult whose setting is 'friends' by calling
-- the RPC directly, while can_message (the profile Message button) already
-- returned false for the same pair. The Battle request policies check in
-- .github/workflows/db.yml caught this: accepting a battle offer from a
-- non-friend opened a DM thread the messaging rules meant to forbid.
--
-- A new migration, not an edit: the direct-messages migration is already
-- applied to the live project, and applied migrations never change.
-- create or replace makes this idempotent on fresh databases too.

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
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if other = caller then
    raise exception 'You cannot message yourself' using errcode = '23514';
  end if;
  if not exists (select 1 from public.profiles where id = other) then
    raise exception 'User not found' using errcode = '42501';
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
  elsif recipient_setting = 'friends'
    and not public.are_friends(caller, other) then
    -- The missing branch: same rule as can_message, so the RPC cannot
    -- open what the profile button (correctly) hides.
    raise exception 'This user only accepts messages from friends'
      using errcode = '42501';
  end if;

  -- One conversation per pair, regardless of who started it. Reopening an
  -- existing conversation doesn't count against the daily limit below.
  select id into existing_conversation
  from public.conversations
  where (user_a = least(caller, other) and user_b = greatest(caller, other));
  if existing_conversation is not null then
    return existing_conversation;
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

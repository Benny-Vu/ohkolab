-- Rate limits for the client write paths that had none (hardening wave).
-- Today posts, comments, reports, groups, feedback, post images, direct
-- message conversations and messages, battle requests and battle offers
-- are limited; these six are not:
--
--   follows, post likes, group joins and invites, team saves, push token
--   registrations, blocks
--
-- Numbers nobody hits in normal use, so no real person ever sees them
-- (direct messages per minute were already covered: 20/min, P0A09).
--
-- House rules as in the social foundation (20261117100000): idempotent,
-- security definer with `set search_path = ''` so the count sees every row,
-- triggers guarded because they have no "if not exists" form, errcodes
-- P0A12..P0A17 (P0A01..P0A11 are taken). They all map to "rate_limited" in
-- src/lib/social/errors.ts, whose message is already bilingual.

-- ---------------------------------------------------------------------------
-- follows: at most 100 new follows per user per 24 hours. Mass-follow spam
-- is also what fills the targets' notification queues.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_follow_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.follows
    where follows.follower_id = new.follower_id
      and follows.created_at > now() - interval '24 hours'
  ) >= 100 then
    raise exception 'Too many follows; wait a day'
      using errcode = 'P0A12';
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_follow_limits()
  from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.follows'::regclass
      and tgname = 'follows_enforce_limits'
  ) then
    create trigger follows_enforce_limits
      before insert on public.follows
      for each row execute function public.enforce_follow_limits();
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- post_likes: at most 300 likes per user per hour. Like spam fills the
-- authors' notification queues.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_like_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.post_likes
    where post_likes.user_id = new.user_id
      and post_likes.created_at > now() - interval '1 hour'
  ) >= 300 then
    raise exception 'Too many likes; slow down'
      using errcode = 'P0A13';
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_like_limits()
  from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.post_likes'::regclass
      and tgname = 'post_likes_enforce_limits'
  ) then
    create trigger post_likes_enforce_limits
      before insert on public.post_likes
      for each row execute function public.enforce_like_limits();
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- group_members: two separate caps, both 100 per 24 hours with errcode
-- P0A14. Invitations ('invited' rows) are capped per group — an owner
-- cannot mass-invite into one group — but never count against the
-- invitee, so nobody can lock a victim out of joining by inviting them.
-- Self-joins and join requests are capped per user only: one account
-- cannot join everything, but a popular public group keeps accepting
-- members no matter how many different users join it in a day.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_group_member_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Invitations are owner-sent: cap how many one group sends per day.
  -- Counting them toward the invitee would let anyone lock a victim out
  -- of joining by inviting them from a few groups.
  if new.status = 'invited' then
    if (
      select count(*) from public.group_members
      where group_members.group_id = new.group_id
        and group_members.status = 'invited'
        and group_members.created_at > now() - interval '24 hours'
    ) >= 100 then
      raise exception 'Too many group joins and invites; wait a day'
        using errcode = 'P0A14';
    end if;
  else
    -- Self-joins and requests: cap only the user's own rows, and never
    -- the invitations they received. Counting joins per group would stop
    -- a popular public group from accepting members after 100 a day.
    if (
      select count(*) from public.group_members
      where group_members.user_id = new.user_id
        and group_members.status <> 'invited'
        and group_members.created_at > now() - interval '24 hours'
    ) >= 100 then
      raise exception 'Too many group joins and invites; wait a day'
        using errcode = 'P0A14';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_group_member_limits()
  from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.group_members'::regclass
      and tgname = 'group_members_enforce_limits'
  ) then
    create trigger group_members_enforce_limits
      before insert on public.group_members
      for each row execute function public.enforce_group_member_limits();
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- teams: at most 30 new teams per user per 24 hours. Saving an existing
-- team is an update of a row the user already owns, so it grows nothing.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_team_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.teams
    where teams.user_id = new.user_id
      and teams.created_at > now() - interval '24 hours'
  ) >= 30 then
    raise exception 'Too many new teams; wait a day'
      using errcode = 'P0A15';
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_team_limits()
  from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.teams'::regclass
      and tgname = 'teams_enforce_limits'
  ) then
    create trigger teams_enforce_limits
      before insert on public.teams
      for each row execute function public.enforce_team_limits();
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- push_tokens: at most 20 registrations per user per 24 hours. Rows are
-- created by register_push_token(); FCM rotates tokens, but nowhere near
-- this fast.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_push_token_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.push_tokens
    where push_tokens.user_id = new.user_id
      and push_tokens.created_at > now() - interval '24 hours'
  ) >= 20 then
    raise exception 'Too many push token registrations; wait a day'
      using errcode = 'P0A16';
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_push_token_limits()
  from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.push_tokens'::regclass
      and tgname = 'push_tokens_enforce_limits'
  ) then
    create trigger push_tokens_enforce_limits
      before insert on public.push_tokens
      for each row execute function public.enforce_push_token_limits();
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- blocks: at most 100 new blocks per user per 24 hours. Blocking is
-- self-service moderation, not a bulk operation.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_block_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.blocks
    where blocks.blocker_id = new.blocker_id
      and blocks.created_at > now() - interval '24 hours'
  ) >= 100 then
    raise exception 'Too many blocks; wait a day'
      using errcode = 'P0A17';
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_block_limits()
  from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.blocks'::regclass
      and tgname = 'blocks_enforce_limits'
  ) then
    create trigger blocks_enforce_limits
      before insert on public.blocks
      for each row execute function public.enforce_block_limits();
  end if;
end;
$$;

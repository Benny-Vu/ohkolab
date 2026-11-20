-- Battle requests: the "play against each other" feature. A player posts what
-- they want to battle (format, rules, optional time window, optional public
-- team), others offer to battle, the author accepts one offer, and the two
-- players get a notification and a DM thread. In-game, Pokémon Champions
-- arranges friend battles as Private Battles joined via a shareable Room ID
-- (research notes in battles-wave-report.md), so a request can carry an
-- optional in-game code — visible only to the two matched players.
--
-- House rules this file follows (see 20261117100000_social_foundation.sql):
-- idempotent (if not exists, create or replace, policies and triggers inside
-- guard blocks because they have no "if not exists" form), security definer
-- functions carry `set search_path = ''`, and `src/lib/database.types.ts` is
-- hand-written from the result.
--
-- Safety rules, mirroring the direct-messages migration (20261120110000):
-- blocks hide requests and replies both ways; minors (under 18 or no birth
-- date) only see and answer requests from friends, on both sides; the
-- in-game code gets its own table because RLS is row-level and cannot hide a
-- single column of a public row.
--
-- Like the DM migration, no policy subqueries another RLS table directly
-- (that is the "infinite recursion detected in policy" trap): every
-- cross-table predicate lives in a security definer helper below.

-- ---------------------------------------------------------------------------
-- battle_requests: what a player wants to battle. Open requests are public;
-- the author can close them; they expire after the time window or 24 hours.
-- ---------------------------------------------------------------------------

create table if not exists public.battle_requests (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  -- singles or doubles, the app's two battle formats.
  format text not null
    constraint battle_requests_format_check check (format in ('singles', 'doubles')),
  -- A short rules descriptor, e.g. "Reg M-C, best of 3". One line, no prose.
  rules text not null
    constraint battle_requests_rules_length check (char_length(rules) between 1 and 80),
  -- The one free-text field (the existing moderation flow covers it).
  note text
    constraint battle_requests_note_length check (char_length(note) <= 300),
  -- Optional time window, UTC instants; the request expires when it passes.
  starts_at timestamptz,
  ends_at timestamptz
    constraint battle_requests_window_order
      check (ends_at is null or starts_at is null or ends_at > starts_at),
  -- Optional IANA time zone name the window is meant in, e.g. "Europe/Oslo".
  timezone text
    constraint battle_requests_timezone_shape
      check (timezone is null or timezone ~ '^[A-Za-z0-9_+\-./]+$'),
  -- The language the requester plays in.
  language text not null
    constraint battle_requests_language_check check (language in ('en', 'ja')),
  -- Optional attached team (public teams only; enforced by trigger).
  team_id uuid references public.teams (id) on delete set null,
  -- open / matched / closed / expired.
  status text not null default 'open'
    constraint battle_requests_status_check
      check (status in ('open', 'matched', 'closed', 'expired')),
  -- The accepted reply, set by accept_battle_reply(). Deliberately not a
  -- foreign key: it is a derived fact about the reply, and the request is
  -- the row that must survive as the record of the match.
  accepted_reply_id uuid,
  -- Set by either matched player after the battle: "we played". Optional.
  played_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.battle_requests enable row level security;

revoke all on public.battle_requests from anon, authenticated;
-- Reads pass the select policies; writes go through the insert/update
-- grants plus their policies and triggers. played_at is not updatable
-- by clients at all: marking a battle played goes through the
-- mark_battle_played() RPC, which is the only path that sets it.
grant select on public.battle_requests to authenticated;
grant insert (author_id, format, rules, note, starts_at, ends_at, timezone,
              language, team_id)
  on public.battle_requests to authenticated;
grant update (status) on public.battle_requests to authenticated;

create index if not exists battle_requests_status_created_idx
  on public.battle_requests (status, created_at desc);
create index if not exists battle_requests_author_created_idx
  on public.battle_requests (author_id, created_at desc);
create index if not exists battle_requests_window_idx
  on public.battle_requests (ends_at)
  where status = 'open';

-- ---------------------------------------------------------------------------
-- battle_replies: one offer to battle per user per request. Created before
-- the visibility helpers, which read it.
-- ---------------------------------------------------------------------------

create table if not exists public.battle_replies (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.battle_requests (id) on delete cascade,
  responder_id uuid not null references public.profiles (id) on delete cascade,
  -- pending / accepted / declined / withdrawn.
  status text not null default 'pending'
    constraint battle_replies_status_check
      check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at timestamptz not null default now(),
  constraint battle_replies_once_per_request unique (request_id, responder_id)
);

alter table public.battle_replies enable row level security;

revoke all on public.battle_replies from anon, authenticated;
grant select on public.battle_replies to authenticated;
grant insert (request_id, responder_id) on public.battle_replies to authenticated;
grant update (status) on public.battle_replies to authenticated;

create index if not exists battle_replies_request_idx
  on public.battle_replies (request_id, created_at);
create index if not exists battle_replies_responder_created_idx
  on public.battle_replies (responder_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Visibility helpers. All security definer with `set search_path = ''`, so
-- they read blocks, birth dates, follows and replies without extra grants
-- and without applying RLS to their subqueries (no policy recursion).
-- ---------------------------------------------------------------------------

-- True when battle content between the two users is visible: no block in
-- either direction, and if either of them is a minor (or has no birth
-- date), they must be friends.
create or replace function public.battle_visible_between(
  viewer uuid,
  author uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
      select 1 from public.blocks
      where (blocker_id = battle_visible_between.viewer
             and blocked_id = battle_visible_between.author)
         or (blocker_id = battle_visible_between.author
             and blocked_id = battle_visible_between.viewer)
    )
    and (public.is_adult(battle_visible_between.author)
         or public.are_friends(battle_visible_between.viewer,
                               battle_visible_between.author))
    and (public.is_adult(battle_visible_between.viewer)
         or public.are_friends(battle_visible_between.viewer,
                               battle_visible_between.author));
$$;

-- True when the viewer may read the request: it is their own, or it is
-- open and visible between them and the author, or the viewer's offer was
-- accepted for it (matched requests stay readable to the pair).
create or replace function public.battle_request_visible(
  request uuid,
  viewer uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.battle_requests b
    where b.id = battle_request_visible.request
      and (
        b.author_id = battle_request_visible.viewer
        or (
          b.status = 'open'
          and public.battle_visible_between(
            battle_request_visible.viewer, b.author_id
          )
        )
        or exists (
          select 1 from public.battle_replies r
          where r.request_id = b.id
            and r.responder_id = battle_request_visible.viewer
            and r.status = 'accepted'
        )
      )
  );
$$;

-- True when the viewer may offer to battle on the request: it exists, is
-- open, was written by someone else, and is visible between them.
create or replace function public.battle_request_answerable(
  request uuid,
  viewer uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.battle_requests b
    where b.id = battle_request_answerable.request
      and b.status = 'open'
      and b.author_id <> battle_request_answerable.viewer
      and public.battle_visible_between(
        battle_request_answerable.viewer, b.author_id
      )
  );
$$;

-- True when the viewer may read the reply: it is their own, or they are
-- the request's author and the exchange with the responder is visible (a
-- block between the two hides replies both ways, even after matching).
create or replace function public.battle_reply_visible(
  reply uuid,
  viewer uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.battle_replies r
    where r.id = battle_reply_visible.reply
      and (
        r.responder_id = battle_reply_visible.viewer
        or (
          exists (
            select 1 from public.battle_requests b
            where b.id = r.request_id
              and b.author_id = battle_reply_visible.viewer
          )
          and public.battle_visible_between(
            battle_reply_visible.viewer, r.responder_id
          )
        )
      )
  );
$$;

-- True when the viewer is the author of the reply's request and the reply
-- is still pending (the author can decline it).
create or replace function public.battle_reply_declinable_by(
  reply uuid,
  viewer uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.battle_replies r
    join public.battle_requests b on b.id = r.request_id
    where r.id = battle_reply_declinable_by.reply
      and r.status = 'pending'
      and b.author_id = battle_reply_declinable_by.viewer
  );
$$;

-- True when the viewer is one of the matched pair (the author of a matched
-- request, or the accepted responder) and the battle is not marked played
-- yet. Backs the mark_battle_played() RPC: either of them can mark it.
create or replace function public.battle_playable_by(
  request uuid,
  viewer uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.battle_requests b
    where b.id = battle_playable_by.request
      and b.status = 'matched'
      and b.played_at is null
      and (
        b.author_id = battle_playable_by.viewer
        or exists (
          select 1 from public.battle_replies r
          where r.request_id = b.id
            and r.responder_id = battle_playable_by.viewer
            and r.status = 'accepted'
        )
      )
  );
$$;

-- True when the viewer may read the request's code: they are the author, or
-- their offer was accepted. Not moderators — the exchange belongs to the
-- two matched players.
create or replace function public.battle_code_visible(
  request uuid,
  viewer uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.battle_requests b
    where b.id = battle_code_visible.request
      and (
        b.author_id = battle_code_visible.viewer
        or exists (
          select 1 from public.battle_replies r
          where r.request_id = b.id
            and r.responder_id = battle_code_visible.viewer
            and r.status = 'accepted'
        )
      )
  );
$$;

revoke execute on function public.battle_visible_between(uuid, uuid)
  from public, anon, authenticated;
revoke execute on function public.battle_request_visible(uuid, uuid)
  from public, anon, authenticated;
revoke execute on function public.battle_request_answerable(uuid, uuid)
  from public, anon, authenticated;
revoke execute on function public.battle_reply_visible(uuid, uuid)
  from public, anon, authenticated;
revoke execute on function public.battle_reply_declinable_by(uuid, uuid)
  from public, anon, authenticated;
revoke execute on function public.battle_playable_by(uuid, uuid)
  from public, anon, authenticated;
revoke execute on function public.battle_code_visible(uuid, uuid)
  from public, anon, authenticated;

-- The policies call the helpers on the reader's behalf; they only return
-- booleans about rows the caller is asking about anyway.
grant execute on function public.battle_visible_between(uuid, uuid)
  to authenticated;
grant execute on function public.battle_request_visible(uuid, uuid)
  to authenticated;
grant execute on function public.battle_request_answerable(uuid, uuid)
  to authenticated;
grant execute on function public.battle_reply_visible(uuid, uuid)
  to authenticated;
grant execute on function public.battle_reply_declinable_by(uuid, uuid)
  to authenticated;
grant execute on function public.battle_playable_by(uuid, uuid)
  to authenticated;
grant execute on function public.battle_code_visible(uuid, uuid)
  to authenticated;

do $$
begin
  -- The author always sees their own requests; moderators see everything
  -- (for the report flow); everyone else goes through battle_request_visible.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'battle_requests'
      and policyname = 'battle requests are readable'
  ) then
    create policy "battle requests are readable" on public.battle_requests
      for select
      to authenticated
      using (
        author_id = (select auth.uid())
        or public.is_moderator()
        or public.battle_request_visible(id, (select auth.uid()))
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'battle_requests'
      and policyname = 'authors create battle requests'
  ) then
    create policy "authors create battle requests" on public.battle_requests
      for insert
      to authenticated
      with check (author_id = (select auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'battle_requests'
      and policyname = 'authors close their battle requests'
  ) then
    -- The only client UPDATE path: authors move their own request between
    -- 'open' and 'closed' (never to 'matched' — that belongs to
    -- accept_battle_reply — nor 'expired', which belongs to the cron).
    -- Marking played has no policy on purpose: Postgres ORs the USING
    -- clauses of permissive update policies, so a second policy would let
    -- the accepted responder (or the author) also flip a matched request's
    -- status. played_at is RPC-only instead (mark_battle_played).
    create policy "authors close their battle requests" on public.battle_requests
      for update
      to authenticated
      using (author_id = (select auth.uid()) and status in ('open', 'closed'))
      with check (
        author_id = (select auth.uid())
        and status in ('open', 'closed')
      );
  end if;
end;
$$;

-- Every new request re-checks the rate limit (at most 5 open requests per
-- author per 24 hours) and the attached team (public and owned by the
-- author). Block and minor rules apply on read: a viewer who may not see
-- the author never sees the request to answer.
create or replace function public.enforce_battle_request_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.battle_requests
    where author_id = new.author_id
      and status = 'open'
      and created_at > now() - interval '24 hours'
  ) >= 5 then
    raise exception 'Too many open battle requests'
      using errcode = 'P0A10';
  end if;

  if new.team_id is not null and not exists (
    select 1 from public.teams t
    where t.id = new.team_id
      and t.user_id = new.author_id
      and t.is_public
  ) then
    raise exception 'The attached team must be your own public team'
      using errcode = '23514';
  end if;

  if new.ends_at is not null and new.ends_at <= now() then
    raise exception 'The time window has already passed'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_battle_request_rules()
  from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.battle_requests'::regclass
      and tgname = 'battle_requests_enforce_rules'
  ) then
    create trigger battle_requests_enforce_rules
      before insert on public.battle_requests
      for each row execute function public.enforce_battle_request_rules();
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- battle_replies policies and triggers (the table itself is created above,
-- before the visibility helpers).
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'battle_replies'
      and policyname = 'authors and responders read replies'
  ) then
    create policy "authors and responders read replies" on public.battle_replies
      for select
      to authenticated
      using (
        responder_id = (select auth.uid())
        or public.is_moderator()
        or public.battle_reply_visible(id, (select auth.uid()))
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'battle_replies'
      and policyname = 'responders offer to battle'
  ) then
    create policy "responders offer to battle" on public.battle_replies
      for insert
      to authenticated
      with check (
        responder_id = (select auth.uid())
        and public.battle_request_answerable(request_id, (select auth.uid()))
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'battle_replies'
      and policyname = 'authors decline pending replies'
  ) then
    create policy "authors decline pending replies" on public.battle_replies
      for update
      to authenticated
      using (public.battle_reply_declinable_by(id, (select auth.uid())))
      with check (status = 'declined');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'battle_replies'
      and policyname = 'responders withdraw pending replies'
  ) then
    create policy "responders withdraw pending replies" on public.battle_replies
      for update
      to authenticated
      using (responder_id = (select auth.uid()) and status = 'pending')
      with check (status = 'withdrawn');
  end if;
end;
$$;

-- A reply re-checks the block and minor rules (they can change between the
-- request becoming visible and the reply insert) and limits replies to 30
-- per responder per 24 hours. A withdrawn offer can be made again: the
-- trigger reactivates the original row (one row per pair stays true) and
-- notifies the author again; any other existing offer — pending, accepted
-- or declined — is final, with the unique constraint as the backstop.
create or replace function public.enforce_battle_reply_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing record;
  request_author uuid;
begin
  if not public.battle_request_answerable(new.request_id, new.responder_id) then
    raise exception 'You cannot answer this battle request'
      using errcode = '42501';
  end if;

  if (
    select count(*) from public.battle_replies
    where responder_id = new.responder_id
      and created_at > now() - interval '24 hours'
  ) >= 30 then
    raise exception 'Too many battle offers today'
      using errcode = 'P0A11';
  end if;

  select * into existing from public.battle_replies
  where request_id = new.request_id
    and responder_id = new.responder_id;
  if found then
    if existing.status <> 'withdrawn' then
      raise exception 'You already offered on this battle request'
        using errcode = '23505';
    end if;
    -- Reactivation: the offer counts against the daily limit again
    -- (created_at moves to now, which the rate-limit window reads).
    update public.battle_replies
    set status = 'pending', created_at = now()
    where id = existing.id;
    select author_id into request_author from public.battle_requests
    where id = new.request_id;
    insert into public.notifications (recipient_id, actor_id, type, battle_request_id)
    values (request_author, new.responder_id, 'battle', new.request_id);
    return null;
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_battle_reply_rules()
  from public, anon, authenticated;

-- The notification to the author (type 'battle', actor = the responder).
create or replace function public.notify_request_author_of_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_author uuid;
begin
  select author_id into request_author
  from public.battle_requests
  where id = new.request_id;

  insert into public.notifications (
    recipient_id, actor_id, type, battle_request_id
  )
  values (request_author, new.responder_id, 'battle', new.request_id);

  return new;
end;
$$;

revoke execute on function public.notify_request_author_of_reply()
  from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.battle_replies'::regclass
      and tgname = 'battle_replies_enforce_rules'
  ) then
    create trigger battle_replies_enforce_rules
      before insert on public.battle_replies
      for each row execute function public.enforce_battle_reply_rules();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.battle_replies'::regclass
      and tgname = 'battle_replies_notify_author'
  ) then
    create trigger battle_replies_notify_author
      after insert on public.battle_replies
      for each row execute function public.notify_request_author_of_reply();
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- battle_request_codes: the optional in-game code (a Private Battle Room ID
-- or Trainer ID). A separate table because RLS is row-level: the request
-- row is public, the code is visible only to the two matched players.
-- ---------------------------------------------------------------------------

create table if not exists public.battle_request_codes (
  request_id uuid primary key references public.battle_requests (id) on delete cascade,
  code text not null
    constraint battle_request_codes_length check (char_length(code) between 1 and 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.battle_request_codes enable row level security;

revoke all on public.battle_request_codes from anon, authenticated;
grant select on public.battle_request_codes to authenticated;
grant insert (request_id, code) on public.battle_request_codes to authenticated;
grant update (code) on public.battle_request_codes to authenticated;
grant delete on public.battle_request_codes to authenticated;

do $$
begin
  -- Only the request's author and the accepted responder read the code.
  -- Not even moderators: the exchange is between the two matched players.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'battle_request_codes'
      and policyname = 'matched players read the code'
  ) then
    create policy "matched players read the code" on public.battle_request_codes
      for select
      to authenticated
      using (public.battle_code_visible(request_id, (select auth.uid())));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'battle_request_codes'
      and policyname = 'matched players manage the code'
  ) then
    -- Either matched player can host the Private Battle room, so either
    -- may set or replace the code.
    create policy "matched players manage the code" on public.battle_request_codes
      for all
      to authenticated
      using (public.battle_code_visible(request_id, (select auth.uid())))
      with check (public.battle_code_visible(request_id, (select auth.uid())));
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- accept_battle_reply(reply_id): the single way a request becomes matched.
-- The caller must be the request's author; the reply must be pending and
-- the request open. Marks the reply accepted, declines the author's other
-- pending replies, sets the request matched, tries to open a DM thread via
-- start_conversation (respecting all its rules — when the messaging rules
-- forbid the DM, the clients fall back to exchanging the code inside the
-- request) and notifies the responder. Returns the conversation id, or
-- null when no DM thread could be opened.
--
-- Error codes:
--   42501 - not the author, or the reply/request state does not allow it
-- ---------------------------------------------------------------------------

create or replace function public.accept_battle_reply(reply_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  the_request record;
  the_reply record;
  conversation uuid := null;
begin
  if caller is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  -- Both rows are locked for update: without the locks, two concurrent
  -- accepts (a double tap, two tabs) can both pass the open/pending
  -- checks and match two responders to one request.
  select * into the_reply from public.battle_replies
  where id = accept_battle_reply.reply_id
  for update;
  if not found or the_reply.status <> 'pending' then
    raise exception 'This offer is no longer available' using errcode = '42501';
  end if;

  select * into the_request from public.battle_requests
  where id = the_reply.request_id
  for update;
  if not found then
    raise exception 'Battle request not found' using errcode = '42501';
  end if;
  if the_request.author_id <> caller then
    raise exception 'Only the author can accept offers' using errcode = '42501';
  end if;
  if the_request.status <> 'open' then
    raise exception 'This battle request is no longer open'
      using errcode = '42501';
  end if;
  -- A block that arose after the offer hides the reply from the author;
  -- accepting it anyway would match the pair against the messaging rules.
  if not public.battle_visible_between(caller, the_reply.responder_id) then
    raise exception 'You cannot accept this offer' using errcode = '42501';
  end if;

  update public.battle_replies set status = 'accepted'
  where id = the_reply.id;

  update public.battle_replies set status = 'declined'
  where request_id = the_request.id
    and status = 'pending'
    and id <> the_reply.id;

  update public.battle_requests
  set status = 'matched', accepted_reply_id = the_reply.id, updated_at = now()
  where id = the_request.id;

  -- Open the DM thread if the messaging rules allow it; a failure here is
  -- expected (friend-only settings for adults, blocks that arose after the
  -- reply), not an error for the match itself.
  begin
    conversation := public.start_conversation(the_reply.responder_id);
  exception when others then
    conversation := null;
  end;

  insert into public.notifications (recipient_id, actor_id, type, battle_request_id)
  values (the_reply.responder_id, caller, 'battle', the_request.id);

  return conversation;
end;
$$;

revoke execute on function public.accept_battle_reply(uuid) from public, anon;
grant execute on function public.accept_battle_reply(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- mark_battle_played(request_id): either matched player marks the battle
-- played. This is the only path that sets played_at — the update grant on
-- battle_requests covers the status column only, because a second update
-- policy would OR with the author's close policy and let the matched pair
-- reopen or close the request themselves.
-- ---------------------------------------------------------------------------

create or replace function public.mark_battle_played(request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if not public.battle_playable_by(request_id, caller) then
    raise exception 'You cannot mark this battle played'
      using errcode = '42501';
  end if;

  update public.battle_requests
  set played_at = now(), updated_at = now()
  where id = request_id;
end;
$$;

revoke execute on function public.mark_battle_played(uuid) from public, anon;
grant execute on function public.mark_battle_played(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- remove_battle_request_with_reason(request_id, reason, source_report):
-- the moderation queue's "Remove" for battle requests. Moderators only.
-- Removing means closing the request (open or matched): it leaves the
-- board, and a matched pair can no longer read its code. The action is
-- recorded in moderation_actions with the author as the target user, and
-- the author gets a moderation notification they can appeal.
-- ---------------------------------------------------------------------------

create or replace function public.remove_battle_request_with_reason(
  target_request_id uuid,
  removal_reason text,
  source_report_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author_id uuid;
  v_rules text;
  v_note text;
  v_action_id uuid;
begin
  if not public.is_moderator() then
    raise exception 'Only moderators can remove battle requests'
      using errcode = '42501';
  end if;
  if char_length(remove_battle_request_with_reason.removal_reason)
       not between 1 and 500 then
    raise exception 'Invalid removal reason'
      using errcode = '23514';
  end if;

  select author_id, rules, note into v_author_id, v_rules, v_note
  from public.battle_requests
  where public.battle_requests.id =
        remove_battle_request_with_reason.target_request_id;
  if not found then
    return;
  end if;

  update public.battle_requests
  set status = 'closed', updated_at = now()
  where public.battle_requests.id =
          remove_battle_request_with_reason.target_request_id
    and status in ('open', 'matched');
  if not found then
    return;
  end if;

  insert into public.moderation_actions
    (target_type, target_id, target_user_id, action, reason, report_id,
     moderator_id, content_snapshot, content_kind)
  values
    ('battle_request', remove_battle_request_with_reason.target_request_id,
     v_author_id, 'remove', remove_battle_request_with_reason.removal_reason,
     remove_battle_request_with_reason.source_report_id, (select auth.uid()),
     coalesce(v_rules || ' — ' || v_note, v_rules), 'battle_request')
  returning id into v_action_id;

  if v_author_id <> (select auth.uid())
     and not public.has_unread_notification(
       v_author_id, (select auth.uid()), 'moderation', null, null, null,
       v_action_id)
  then
    insert into public.notifications (recipient_id, actor_id, type,
                                      moderation_action_id)
    values (v_author_id, (select auth.uid()), 'moderation', v_action_id);
  end if;
end;
$$;

revoke execute on function public.remove_battle_request_with_reason(uuid, text, uuid)
  from public, anon;
grant execute on function public.remove_battle_request_with_reason(uuid, text, uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Expiry: open requests expire when their time window passes, or after 24
-- hours when they set none.
-- ---------------------------------------------------------------------------

create or replace function public.expire_battle_requests()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.battle_requests
  set status = 'expired', updated_at = now()
  where status = 'open'
    and coalesce(ends_at, created_at + interval '24 hours') < now();
end;
$$;

revoke execute on function public.expire_battle_requests()
  from public, anon, authenticated;

-- Every hour at :52 (a different minute from the other cron jobs).
select cron.schedule(
  'expire-battle-requests',
  '52 * * * *',
  $$select public.expire_battle_requests()$$
);

-- ---------------------------------------------------------------------------
-- The notifications table learns about battle requests: a nullable link
-- column and a 'battle' type. Both changes are guarded and idempotent.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'battle_request_id'
  ) then
    alter table public.notifications
      add column battle_request_id uuid references public.battle_requests (id) on delete cascade;
  end if;

  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.notifications'::regclass
      and conname = 'notifications_type_check'
      and pg_get_constraintdef(oid) not like '%battle%'
  ) then
    alter table public.notifications drop constraint notifications_type_check;
    alter table public.notifications
      add constraint notifications_type_check
      check (type in ('like', 'comment', 'follow', 'moderation', 'appeal', 'group_invite', 'battle'));
  end if;
end;
$$;

-- The moderation queue accepts reports on battle requests (the existing
-- report flow, rate limits and moderation UI; requests are public content,
-- so no snapshot is needed). Idempotent constraint rebuilds.
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.reports'::regclass
      and conname = 'reports_target_type_check'
      and pg_get_constraintdef(oid) not like '%battle_request%'
  ) then
    alter table public.reports drop constraint reports_target_type_check;
    alter table public.reports
      add constraint reports_target_type_check
      check (target_type in ('post', 'comment', 'profile', 'message', 'battle_request'));
  end if;

  -- Closing a reported request records a moderation action, so the
  -- actions constraint learns 'battle_request' too.
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.moderation_actions'::regclass
      and conname = 'moderation_actions_target_type_check'
      and pg_get_constraintdef(oid) not like '%battle_request%'
  ) then
    alter table public.moderation_actions
      drop constraint moderation_actions_target_type_check;
    alter table public.moderation_actions
      add constraint moderation_actions_target_type_check
      check (target_type in ('post', 'comment', 'profile', 'battle_request'));
  end if;
end;
$$;

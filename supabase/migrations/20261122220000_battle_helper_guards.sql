-- Guards the battle visibility helpers (20261122200000_battle_requests.sql,
-- now applied live): they take an arbitrary `viewer` argument, and any
-- EXECUTE-granted function over /rest/v1/rpc answers for any viewer the
-- caller names. battle_visible_between(other_adult, X) returning false with
-- no block in place revealed that X is a minor — the exact minor status
-- is_adult deliberately hides — and the helpers also leaked blocks and
-- matched pairs between two other users.
--
-- A new migration, not an edit: the battle tables migration is applied
-- to the live project.
--
-- Two layers:
--   1. battle_visible_between and battle_playable_by lose the EXECUTE
--      grant for authenticated entirely — only security definer code calls
--      them (as the function owner, which needs no grant), and the client
--      goes through the policy helpers instead.
--   2. the five policy helpers stay callable but answer false for any
--      viewer other than the caller, so they can only ever describe the
--      caller's own access. Internal calls from the accept RPC and the
--      reply trigger pass the caller's own id, so nothing changes there.

revoke execute on function public.battle_visible_between(uuid, uuid)
  from authenticated;
revoke execute on function public.battle_playable_by(uuid, uuid)
  from authenticated;

-- True when the viewer may read the request: the call is about the
-- caller's own access, or it is refused without answering.
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
  select battle_request_visible.viewer = (select auth.uid())
    and exists (
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

-- True when the viewer may offer to battle on the request, for the
-- caller's own access only.
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
  select battle_request_answerable.viewer = (select auth.uid())
    and exists (
      select 1 from public.battle_requests b
      where b.id = battle_request_answerable.request
        and b.status = 'open'
        and b.author_id <> battle_request_answerable.viewer
        and public.battle_visible_between(
          battle_request_answerable.viewer, b.author_id
        )
    );
$$;

-- True when the viewer may read the reply, for the caller's own access
-- only.
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
  select battle_reply_visible.viewer = (select auth.uid())
    and exists (
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

-- True when the viewer (the request's author) may decline the pending
-- reply, for the caller's own access only.
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
  select battle_reply_declinable_by.viewer = (select auth.uid())
    and exists (
      select 1 from public.battle_replies r
      join public.battle_requests b on b.id = r.request_id
      where r.id = battle_reply_declinable_by.reply
        and r.status = 'pending'
        and b.author_id = battle_reply_declinable_by.viewer
    );
$$;

-- True when the viewer may read the request's code, for the caller's
-- own access only.
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
  select battle_code_visible.viewer = (select auth.uid())
    and exists (
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

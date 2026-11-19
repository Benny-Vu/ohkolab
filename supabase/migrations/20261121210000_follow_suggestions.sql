-- Follow suggestions: the security-definer RPC behind "People to follow".
--
-- The ranking runs server side so the client never learns anything private:
--   - candidates score 3 points per mutual-follow connection (people the
--     caller's followees follow), 2 points per public group shared with the
--     caller, and 1 point for the same main format;
--   - a candidate needs at least one signal to appear at all;
--   - the caller themself, everyone the caller already follows, blocked
--     users (either direction) and suspended users are never suggested;
--   - only public profile fields are returned (id, username, display_name,
--     avatar_species, main_format) plus the score.
--
-- Idempotent like the rest of supabase/migrations: `create or replace` for
-- functions, explicit revoke and grant, no drops.

create or replace function public.suggest_users(p_limit integer default 10)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_species text,
  main_format text,
  score integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with caller as (
    select (select auth.uid()) as user_id
  ),
  caller_profile as (
    select profiles.main_format
    from public.profiles, caller
    where profiles.id = caller.user_id
  ),
  -- Everyone the caller already follows: excluded, but also the bridge to
  -- their own followees (the mutual-follow connections).
  followed as (
    select follows.followee_id
    from public.follows, caller
    where follows.follower_id = caller.user_id
  ),
  connections as (
    select follows.followee_id as candidate_id,
      count(*)::integer as connection_count
    from public.follows, caller
    where follows.follower_id in (select followed.followee_id from followed)
      and follows.followee_id <> caller.user_id
    group by follows.followee_id
  ),
  my_groups as (
    select group_members.group_id
    from public.group_members, caller
    where group_members.user_id = caller.user_id
      and group_members.status = 'active'
  ),
  shared_groups as (
    select group_members.user_id as candidate_id,
      count(*)::integer as group_count
    from public.group_members
    join public.groups on groups.id = group_members.group_id
    where group_members.group_id in (select my_groups.group_id from my_groups)
      and group_members.status = 'active'
      and group_members.user_id <> (select caller.user_id from caller)
      and groups.visibility = 'public'
    group by group_members.user_id
  ),
  ranked as (
    select
      profiles.id,
      profiles.username,
      profiles.display_name,
      profiles.avatar_species,
      profiles.main_format,
      (
        3 * coalesce(connections.connection_count, 0)
        + 2 * coalesce(shared_groups.group_count, 0)
        + case
            when profiles.main_format is not null
              and caller_profile.main_format is not null
              and (
                profiles.main_format = caller_profile.main_format
                or profiles.main_format = 'both'
                or caller_profile.main_format = 'both'
              )
            then 1
            else 0
          end
      )::integer as score,
      connections.candidate_id as by_connection,
      shared_groups.candidate_id as by_group
    from public.profiles
    cross join caller_profile
    left join connections on connections.candidate_id = profiles.id
    left join shared_groups on shared_groups.candidate_id = profiles.id
    where (select caller.user_id from caller) is not null
      and profiles.id <> (select caller.user_id from caller)
      -- Never suggest someone the caller already follows.
      and not exists (
        select 1 from public.follows
        where follows.follower_id = (select caller.user_id from caller)
          and follows.followee_id = profiles.id
      )
      -- Never suggest a blocked user, in either direction.
      and not public.has_blocked(
        (select caller.user_id from caller), profiles.id
      )
      and not public.has_blocked(
        profiles.id, (select caller.user_id from caller)
      )
      -- Never suggest a suspended user.
      and not public.is_suspended(profiles.id)
      -- At least one signal: a connection, a shared public group, or the
      -- same main format (with 'both' matching either side — the same
      -- condition the score uses, so no score-0 candidates slip through).
      and (
        connections.candidate_id is not null
        or shared_groups.candidate_id is not null
        or (
          profiles.main_format is not null
          and caller_profile.main_format is not null
          and (
            profiles.main_format = caller_profile.main_format
            or profiles.main_format = 'both'
            or caller_profile.main_format = 'both'
          )
        )
      )
  )
  select
    ranked.id,
    ranked.username,
    ranked.display_name,
    ranked.avatar_species,
    ranked.main_format,
    ranked.score
  from ranked
  order by ranked.score desc, ranked.username asc
  limit least(greatest(coalesce(p_limit, 10), 0), 25);
$$;

revoke execute on function public.suggest_users(integer)
  from public, anon, authenticated;
grant execute on function public.suggest_users(integer)
  to authenticated;

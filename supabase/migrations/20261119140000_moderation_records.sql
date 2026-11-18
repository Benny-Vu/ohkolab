-- ---------------------------------------------------------------------------
-- Moderation records, clean-up wave (2026-11-19).
--
-- Four changes, all serving one goal: moderation records survive account
-- deletion and still explain themselves.
--
-- 1. moderation_actions keeps a copy of the removed text (content_snapshot,
--    content_kind). Row-level security hides removed posts and comments
--    from everyone, including the affected user, so without a copy the
--    notice page cannot show what was removed.
-- 2. appeals.appellant_id and user_suspensions.user_id become nullable
--    with on delete set null, so appeal decisions and suspension records
--    survive their user's account being deleted. user_suspensions gets an
--    id primary key, because (user_id, created_at) cannot hold the null a
--    deleted account leaves behind.
-- 3. moderation_actions.suspension_id links a suspension action to its
--    suspension row, so a reversed appeal ends only that suspension.
-- 4. Notification inserts skip unread duplicates: like, unlike and like
--    again (or invite, uninvite, invite again) no longer stack a second
--    unread notification on top of the first.
--
-- Plus: pending group invitations stop being visible in public groups'
-- member lists, and a commented-out purge_moderation_records() waits for
-- the owner to pick a retention period.
--
-- Idempotent like the earlier migrations, with one exception forced by
-- the schema changes: three constraints are dropped and re-created
-- (user_suspensions_pkey, user_suspensions_user_id_fkey,
-- appeals_appellant_id_fkey). Statement order matters: the
-- suspension_id foreign key needs user_suspensions.id to exist first.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- user_suspensions: an id primary key and a nullable user_id.
--
-- A deleted account used to cascade its suspension rows away. Now the
-- rows survive with user_id null. is_suspended() compares user_id to the
-- target and never matches a null, so orphaned rows suspend nobody, and
-- the "users read their own suspensions" policy hides them from every
-- signed-in reader. The unique (user_id, created_at) becomes a partial
-- unique index: a plain unique constraint would allow only one orphan.
-- ---------------------------------------------------------------------------

alter table public.user_suspensions
  add column if not exists id uuid default gen_random_uuid();

alter table public.user_suspensions
  alter column id set not null;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.user_suspensions'::regclass
      and conname = 'user_suspensions_pkey'
      and pg_get_constraintdef(oid) <> 'PRIMARY KEY (id)'
  ) then
    alter table public.user_suspensions
      drop constraint user_suspensions_pkey;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.user_suspensions'::regclass
      and conname = 'user_suspensions_pkey'
  ) then
    alter table public.user_suspensions
      add constraint user_suspensions_pkey primary key (id);
  end if;
end;
$$;

create unique index if not exists user_suspensions_user_created_key
  on public.user_suspensions (user_id, created_at)
  where user_id is not null;

alter table public.user_suspensions
  alter column user_id drop not null;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.user_suspensions'::regclass
      and conname = 'user_suspensions_user_id_fkey'
      and pg_get_constraintdef(oid) not like '%ON DELETE SET NULL%'
  ) then
    alter table public.user_suspensions
      drop constraint user_suspensions_user_id_fkey;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.user_suspensions'::regclass
      and conname = 'user_suspensions_user_id_fkey'
  ) then
    alter table public.user_suspensions
      add constraint user_suspensions_user_id_fkey
        foreign key (user_id) references public.profiles (id)
        on delete set null;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- moderation_actions: the removed text, what kind of content it was, and
-- the suspension a reversed appeal ends.
--
-- content_snapshot is capped at 2000 characters, the posts body cap; group
-- posts are posts, and comments cap at 1000, so 2000 covers every kind.
-- content_kind tells feed removals and group removals apart; both have
-- target_type 'post'. suspension_id is set null when the suspension row
-- is deleted (by the purge below, once scheduled), and handle_appeal then
-- falls back to ending every active suspension of the user, the old
-- behaviour for action rows written before this migration.
-- ---------------------------------------------------------------------------

alter table public.moderation_actions
  add column if not exists content_snapshot text
    constraint moderation_actions_snapshot_length
      check (char_length(content_snapshot) <= 2000);

alter table public.moderation_actions
  add column if not exists content_kind text
    constraint moderation_actions_content_kind_check
      check (content_kind in ('post', 'comment', 'group_post'));

alter table public.moderation_actions
  add column if not exists suspension_id uuid
    constraint moderation_actions_suspension_id_fkey
      foreign key (suspension_id) references public.user_suspensions (id)
      on delete set null;

-- ---------------------------------------------------------------------------
-- appeals: the appellant can be gone.
--
-- Appeal decisions must survive the appellant's account being deleted,
-- so appellant_id becomes nullable with on delete set null. The insert
-- policy still forces appellant_id to the signed-in user, and the admin
-- appeals page already shows "profile no longer available" for a null
-- appellant. The constraint keeps its name so the client's embedded
-- relationship (profiles!appeals_appellant_id_fkey) keeps resolving.
-- ---------------------------------------------------------------------------

alter table public.appeals
  alter column appellant_id drop not null;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.appeals'::regclass
      and conname = 'appeals_appellant_id_fkey'
      and pg_get_constraintdef(oid) not like '%ON DELETE SET NULL%'
  ) then
    alter table public.appeals
      drop constraint appeals_appellant_id_fkey;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.appeals'::regclass
      and conname = 'appeals_appellant_id_fkey'
  ) then
    alter table public.appeals
      add constraint appeals_appellant_id_fkey
        foreign key (appellant_id) references public.profiles (id)
        on delete set null;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Notification dedupe. True when the recipient already has an unread
-- notification of the same type from the same actor about the same
-- target. Every notification insert below skips itself when this returns
-- true, so repeating an interaction (like, unlike, like again) does not
-- stack a second unread notification on top of the first. A notification
-- the recipient has already read does not block a new one: they have seen
-- the earlier event, so the repeat is news again.
--
-- Moderation, appeal and comment notifications carry a fresh target each
-- time (a new action id, a new comment id), so the check never suppresses
-- them; they are distinct events and each must be seen.
-- ---------------------------------------------------------------------------

create or replace function public.has_unread_notification(
  p_recipient uuid,
  p_actor uuid,
  p_type text,
  p_post uuid,
  p_comment uuid,
  p_group uuid,
  p_action uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.notifications
    where notifications.recipient_id = has_unread_notification.p_recipient
      and notifications.actor_id is not distinct from has_unread_notification.p_actor
      and notifications.type = has_unread_notification.p_type
      and notifications.post_id is not distinct from has_unread_notification.p_post
      and notifications.comment_id is not distinct from has_unread_notification.p_comment
      and notifications.group_id is not distinct from has_unread_notification.p_group
      and notifications.moderation_action_id is not distinct from has_unread_notification.p_action
      and notifications.read_at is null
  );
$$;

-- Only the security-definer triggers and moderation functions below call
-- this; they run with their owner's privileges, so no API role needs it.
revoke execute on function public.has_unread_notification(uuid, uuid, text, uuid, uuid, uuid, uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Moderation functions, re-recorded with the snapshot. Same behaviour as
-- wave 4 otherwise: idempotent removals, one action row per removal, a
-- notification to the affected user unless the moderator acted on
-- themselves.
-- ---------------------------------------------------------------------------

-- Removes a post and records why, keeping a copy of the body.
create or replace function public.remove_post_with_reason(
  target_post_id uuid,
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
  v_body text;
  v_action_id uuid;
begin
  if not public.is_moderator() then
    raise exception 'Only moderators can remove posts'
      using errcode = '42501';
  end if;
  if char_length(remove_post_with_reason.removal_reason) not between 1 and 500 then
    raise exception 'Invalid removal reason'
      using errcode = '23514';
  end if;
  select posts.author_id, posts.body into v_author_id, v_body
  from public.posts
  where posts.id = remove_post_with_reason.target_post_id;
  if v_author_id is null then
    return;
  end if;
  update public.posts
  set removed_at = now(),
      removed_by = (select auth.uid())
  where posts.id = remove_post_with_reason.target_post_id
    and posts.removed_at is null;
  if not found then
    return;
  end if;
  insert into public.moderation_actions
    (target_type, target_id, target_user_id, action, reason, report_id, moderator_id,
     content_snapshot, content_kind)
  values
    ('post', remove_post_with_reason.target_post_id, v_author_id, 'remove',
     remove_post_with_reason.removal_reason, remove_post_with_reason.source_report_id,
     (select auth.uid()), v_body, 'post')
  returning id into v_action_id;
  if v_author_id <> (select auth.uid())
    and not public.has_unread_notification(
      v_author_id, (select auth.uid()), 'moderation',
      remove_post_with_reason.target_post_id, null, null, v_action_id)
  then
    insert into public.notifications (recipient_id, actor_id, type, post_id, moderation_action_id)
    values (v_author_id, (select auth.uid()), 'moderation',
            remove_post_with_reason.target_post_id, v_action_id);
  end if;
end;
$$;

-- Removes a comment and records why, keeping a copy of the body.
create or replace function public.remove_comment_with_reason(
  target_comment_id uuid,
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
  v_body text;
  v_action_id uuid;
begin
  if not public.is_moderator() then
    raise exception 'Only moderators can remove comments'
      using errcode = '42501';
  end if;
  if char_length(remove_comment_with_reason.removal_reason) not between 1 and 500 then
    raise exception 'Invalid removal reason'
      using errcode = '23514';
  end if;
  select comments.author_id, comments.body into v_author_id, v_body
  from public.comments
  where comments.id = remove_comment_with_reason.target_comment_id;
  if v_author_id is null then
    return;
  end if;
  update public.comments
  set removed_at = now(),
      removed_by = (select auth.uid())
  where comments.id = remove_comment_with_reason.target_comment_id
    and comments.removed_at is null;
  if not found then
    return;
  end if;
  insert into public.moderation_actions
    (target_type, target_id, target_user_id, action, reason, report_id, moderator_id,
     content_snapshot, content_kind)
  values
    ('comment', remove_comment_with_reason.target_comment_id, v_author_id, 'remove',
     remove_comment_with_reason.removal_reason, remove_comment_with_reason.source_report_id,
     (select auth.uid()), v_body, 'comment')
  returning id into v_action_id;
  if v_author_id <> (select auth.uid())
    and not public.has_unread_notification(
      v_author_id, (select auth.uid()), 'moderation',
      null, remove_comment_with_reason.target_comment_id, null, v_action_id)
  then
    insert into public.notifications (recipient_id, actor_id, type, comment_id, moderation_action_id)
    values (v_author_id, (select auth.uid()), 'moderation',
            remove_comment_with_reason.target_comment_id, v_action_id);
  end if;
end;
$$;

-- Removes a group post and records why, keeping a copy of the body.
-- Group owners and moderators call this; site moderators use
-- remove_post_with_reason instead.
create or replace function public.remove_group_post(target_post_id uuid, removal_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author_id uuid;
  v_group_id uuid;
  v_body text;
  v_action_id uuid;
begin
  select posts.author_id, posts.group_id, posts.body into v_author_id, v_group_id, v_body
  from public.posts
  where posts.id = remove_group_post.target_post_id;
  if v_group_id is null then
    raise exception 'Post is not in a group'
      using errcode = '23514';
  end if;
  if coalesce(public.group_role(v_group_id), 'member') not in ('owner', 'moderator') then
    raise exception 'Only group owners or moderators can remove group posts'
      using errcode = '42501';
  end if;
  if char_length(remove_group_post.removal_reason) not between 1 and 500 then
    raise exception 'Invalid removal reason'
      using errcode = '23514';
  end if;
  update public.posts
  set removed_at = now(),
      removed_by = (select auth.uid())
  where posts.id = remove_group_post.target_post_id
    and posts.removed_at is null;
  if not found then
    return;
  end if;
  insert into public.moderation_actions
    (target_type, target_id, target_user_id, action, reason, moderator_id,
     content_snapshot, content_kind)
  values
    ('post', remove_group_post.target_post_id, v_author_id, 'remove',
     remove_group_post.removal_reason, (select auth.uid()), v_body, 'group_post')
  returning id into v_action_id;
  if v_author_id <> (select auth.uid())
    and not public.has_unread_notification(
      v_author_id, (select auth.uid()), 'moderation',
      remove_group_post.target_post_id, null, null, v_action_id)
  then
    insert into public.notifications (recipient_id, actor_id, type, post_id, moderation_action_id)
    values (v_author_id, (select auth.uid()), 'moderation',
            remove_group_post.target_post_id, v_action_id);
  end if;
end;
$$;

-- Suspends a user until a given time and records why, linking the action
-- to the suspension row so a reversed appeal ends only that suspension.
create or replace function public.suspend_user_with_reason(
  target_user_id uuid,
  suspend_until timestamptz,
  suspension_reason text,
  source_report_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_suspension_id uuid;
  v_action_id uuid;
begin
  if not public.is_moderator() then
    raise exception 'Only moderators can suspend users'
      using errcode = '42501';
  end if;
  if char_length(suspend_user_with_reason.suspension_reason) not between 1 and 500 then
    raise exception 'Invalid suspension reason'
      using errcode = '23514';
  end if;
  insert into public.user_suspensions (user_id, "until", reason, created_by)
  values (
    suspend_user_with_reason.target_user_id,
    suspend_user_with_reason.suspend_until,
    suspend_user_with_reason.suspension_reason,
    (select auth.uid())
  )
  returning id into v_suspension_id;
  insert into public.moderation_actions
    (target_type, target_id, target_user_id, action, reason, report_id, moderator_id,
     suspension_id)
  values
    ('profile', suspend_user_with_reason.target_user_id, suspend_user_with_reason.target_user_id,
     'suspend', suspend_user_with_reason.suspension_reason,
     suspend_user_with_reason.source_report_id, (select auth.uid()), v_suspension_id)
  returning id into v_action_id;
  if suspend_user_with_reason.target_user_id <> (select auth.uid())
    and not public.has_unread_notification(
      suspend_user_with_reason.target_user_id, (select auth.uid()), 'moderation',
      null, null, null, v_action_id)
  then
    insert into public.notifications (recipient_id, actor_id, type, moderation_action_id)
    values (suspend_user_with_reason.target_user_id, (select auth.uid()), 'moderation',
            v_action_id);
  end if;
end;
$$;

-- Handles an appeal: 'upheld' keeps the action in place, 'reversed' undoes
-- it. A reversed removal restores the post or comment; a reversed
-- suspension ends the suspension the action recorded (every active one
-- for action rows written before this migration, which have no
-- suspension_id). The appellant is notified unless they handled the
-- appeal themselves or their account is gone.
create or replace function public.handle_appeal(target_appeal_id uuid, decision text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appeal public.appeals%rowtype;
  v_action public.moderation_actions%rowtype;
begin
  if not public.is_moderator() then
    raise exception 'Only moderators can handle appeals'
      using errcode = '42501';
  end if;
  if handle_appeal.decision not in ('upheld', 'reversed') then
    raise exception 'Invalid appeal decision'
      using errcode = '23514';
  end if;
  select * into v_appeal
  from public.appeals
  where appeals.id = handle_appeal.target_appeal_id
  for update;
  if not found then
    return;
  end if;
  if v_appeal.status <> 'open' then
    raise exception 'Appeal has already been handled'
      using errcode = '23514';
  end if;
  update public.appeals
  set status = handle_appeal.decision,
      handled_by = (select auth.uid()),
      handled_at = now()
  where appeals.id = handle_appeal.target_appeal_id;
  if handle_appeal.decision = 'reversed' then
    select * into v_action
    from public.moderation_actions
    where moderation_actions.id = v_appeal.moderation_action_id;
    if v_action.action = 'remove' and v_action.target_type = 'post' then
      update public.posts
      set removed_at = null,
          removed_by = null
      where posts.id = v_action.target_id;
    elsif v_action.action = 'remove' and v_action.target_type = 'comment' then
      update public.comments
      set removed_at = null,
          removed_by = null
      where comments.id = v_action.target_id;
    elsif v_action.action = 'suspend' then
      if v_action.suspension_id is not null then
        update public.user_suspensions
        set "until" = now()
        where user_suspensions.id = v_action.suspension_id;
      else
        update public.user_suspensions
        set "until" = now()
        where user_suspensions.user_id = v_action.target_user_id
          and user_suspensions."until" > now();
      end if;
    end if;
  end if;
  if v_appeal.appellant_id is not null
    and v_appeal.appellant_id <> (select auth.uid())
    and not public.has_unread_notification(
      v_appeal.appellant_id, (select auth.uid()), 'appeal',
      null, null, null, v_appeal.moderation_action_id)
  then
    insert into public.notifications (recipient_id, actor_id, type, moderation_action_id)
    values (v_appeal.appellant_id, (select auth.uid()), 'appeal',
            v_appeal.moderation_action_id);
  end if;
end;
$$;

revoke execute on function public.remove_post_with_reason(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.remove_comment_with_reason(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.remove_group_post(uuid, text) from public, anon, authenticated;
revoke execute on function public.suspend_user_with_reason(uuid, timestamptz, text, uuid) from public, anon, authenticated;
revoke execute on function public.handle_appeal(uuid, text) from public, anon, authenticated;
grant execute on function public.remove_post_with_reason(uuid, text, uuid) to authenticated;
grant execute on function public.remove_comment_with_reason(uuid, text, uuid) to authenticated;
-- Group owners and moderators are signed in, so authenticated is the only
-- role that needs this. The function re-checks the caller's group role
-- itself.
grant execute on function public.remove_group_post(uuid, text) to authenticated;
grant execute on function public.suspend_user_with_reason(uuid, timestamptz, text, uuid) to authenticated;
grant execute on function public.handle_appeal(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Notification triggers, re-recorded with the dedupe check. Same
-- behaviour as wave 4 otherwise: self-actions are skipped, and so are
-- actions by someone the recipient has blocked.
-- ---------------------------------------------------------------------------

-- Notifies the post author when someone likes their post, unless an
-- unread like notification about that post from that user already exists.
create or replace function public.notify_post_author_of_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author_id uuid;
begin
  select posts.author_id into v_author_id
  from public.posts
  where posts.id = new.post_id;
  if v_author_id is null or v_author_id = new.user_id then
    return new;
  end if;
  if public.has_blocked(v_author_id, new.user_id) then
    return new;
  end if;
  if public.has_unread_notification(v_author_id, new.user_id, 'like', new.post_id, null, null, null) then
    return new;
  end if;
  insert into public.notifications (recipient_id, actor_id, type, post_id)
  values (v_author_id, new.user_id, 'like', new.post_id);
  return new;
end;
$$;

-- Notifies the post author when someone comments on their post. Each
-- comment is its own target, so the dedupe check never suppresses one.
create or replace function public.notify_post_author_of_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author_id uuid;
begin
  select posts.author_id into v_author_id
  from public.posts
  where posts.id = new.post_id;
  if v_author_id is null or v_author_id = new.author_id then
    return new;
  end if;
  if public.has_blocked(v_author_id, new.author_id) then
    return new;
  end if;
  if public.has_unread_notification(v_author_id, new.author_id, 'comment', new.post_id, new.id, null, null) then
    return new;
  end if;
  insert into public.notifications (recipient_id, actor_id, type, post_id, comment_id)
  values (v_author_id, new.author_id, 'comment', new.post_id, new.id);
  return new;
end;
$$;

-- Notifies the followee when someone follows them, unless an unread
-- follow notification from that user already exists.
create or replace function public.notify_followee_of_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.followee_id = new.follower_id then
    return new;
  end if;
  if public.has_blocked(new.followee_id, new.follower_id) then
    return new;
  end if;
  if public.has_unread_notification(new.followee_id, new.follower_id, 'follow', null, null, null, null) then
    return new;
  end if;
  insert into public.notifications (recipient_id, actor_id, type)
  values (new.followee_id, new.follower_id, 'follow');
  return new;
end;
$$;

-- Notifies the invitee when an owner or group moderator invites them,
-- unless an unread invitation notification for that group already exists.
create or replace function public.notify_group_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'invited' then
    return new;
  end if;
  if new.user_id = (select auth.uid()) then
    return new;
  end if;
  if public.has_blocked(new.user_id, (select auth.uid())) then
    return new;
  end if;
  if public.has_unread_notification(new.user_id, (select auth.uid()), 'group_invite', null, null, new.group_id, null) then
    return new;
  end if;
  insert into public.notifications (recipient_id, actor_id, type, group_id)
  values (new.user_id, (select auth.uid()), 'group_invite', new.group_id);
  return new;
end;
$$;

-- Trigger functions are never called directly; revoke keeps clients from
-- calling them through the API.
revoke execute on function public.notify_post_author_of_like() from public, anon, authenticated;
revoke execute on function public.notify_post_author_of_comment() from public, anon, authenticated;
revoke execute on function public.notify_followee_of_follow() from public, anon, authenticated;
revoke execute on function public.notify_group_invite() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Group member lists: pending invitations stop being public.
--
-- The wave 4 policy showed every row of a public group to everyone,
-- including other people's pending invitations. Now active rows keep
-- their visibility (public groups to everyone, invite-only groups to
-- their active members), and pending rows (invited, and the requested
-- status reserved for the join-request flow) are readable only by the
-- person they are about and by the group's owner and moderators.
-- ---------------------------------------------------------------------------

alter policy "members and invitations are readable" on public.group_members
  to anon, authenticated
  using (
    user_id = (select auth.uid())
    or (
      status = 'active'
      and (
        exists (
          select 1 from public.groups g
          where g.id = group_id
            and g.visibility = 'public'
        )
        or public.is_group_member(group_id)
      )
    )
  );

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'group_members'
      and policyname = 'group staff read pending members'
  ) then
    create policy "group staff read pending members" on public.group_members
      for select
      to authenticated
      using (
        status <> 'active'
        and public.group_role(group_id) in ('owner', 'moderator')
      );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Retention. Nothing is deleted automatically yet; the owner picks the
-- period before this is scheduled. Once picked (12 months suggested),
-- uncomment the function below and call it from a daily pg_cron job:
--   select public.purge_moderation_records(interval '12 months');
--
-- Appeals and moderation notifications cascade away with their
-- moderation_actions rows, so purging the actions purges them too.
-- Suspensions are kept until they have been over for the same period.
--
-- create or replace function public.purge_moderation_records(older_than interval)
-- returns void
-- language plpgsql
-- security definer
-- set search_path = ''
-- as $$
-- begin
--   delete from public.moderation_actions
--   where created_at < now() - purge_moderation_records.older_than;
--   delete from public.user_suspensions
--   where "until" < now() - purge_moderation_records.older_than;
-- end;
-- $$;
--
-- revoke execute on function public.purge_moderation_records(interval)
--   from public, anon, authenticated;
-- ---------------------------------------------------------------------------

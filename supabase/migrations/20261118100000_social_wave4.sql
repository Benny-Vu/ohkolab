-- Social wave 4: moderation with reasons and appeals, notifications, and
-- groups. Builds on the social foundation migration. The limits here mirror
-- the client validation helpers; change them together.
-- `src/lib/database.types.ts` is hand-written from the migrations.
--
-- Idempotent: safe to run again. Tables and indexes use `if not exists`,
-- functions and the view use `create or replace`, and policies and triggers
-- are created inside do-blocks that check for them first, because
-- `create policy` and `create trigger` have no `if not exists` form.
-- Existing policies are changed with `alter policy`, never dropped, and no
-- table, column, function or view is dropped anywhere in this migration.
--
-- NOTE FOR THE OWNER: apply this migration and deploy the wave 4 client
-- together. The client switches to the *_with_reason moderation functions
-- and this migration revokes the old reason-less ones, so applying only one
-- side breaks moderation until the other lands.

-- ---------------------------------------------------------------------------
-- moderation_actions: one row per moderator removal or suspension, with the
-- reason. The affected user can read the rows about them (that is how the
-- /moderation/:actionId notice page works) and appeal them; moderators can
-- read everything. Rows are written only by the security-definer functions
-- below, never directly by clients.
--
-- NOTE: target_id is deliberately not a foreign key, like
-- reports.target_id, so the record survives its target being deleted.
-- Deleting an account still cascades their posts and comments away
-- entirely, removed or not, so a moderation_actions row can point at content
-- that no longer exists. Since the clean-up wave
-- (20261119140000_moderation_records.sql) the row also keeps a copy of the
-- removed text in content_snapshot, so the removal notice can still show
-- what was taken down.
-- ---------------------------------------------------------------------------

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  target_type text not null
    constraint moderation_actions_target_type_check check (target_type in ('post', 'comment', 'profile')),
  -- The id of the removed post or comment, or of the suspended profile.
  -- Not a foreign key: the record must survive its target being deleted.
  target_id uuid not null,
  -- The user the action was taken against. Kept (as null) when their
  -- account is deleted, so the record survives.
  target_user_id uuid references public.profiles (id) on delete set null,
  action text not null
    constraint moderation_actions_action_check check (action in ('remove', 'suspend')),
  reason text not null
    constraint moderation_actions_reason_length check (char_length(reason) between 1 and 500),
  -- The report that led to this action, when there was one. Kept (as null)
  -- when the report is deleted.
  report_id uuid references public.reports (id) on delete set null,
  -- The moderator who acted. Kept (as null) when their account is deleted,
  -- so the record survives.
  moderator_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.moderation_actions enable row level security;

-- No insert/update/delete grants: only the security-definer moderation
-- functions write moderation_actions.
revoke all on public.moderation_actions from anon, authenticated;
-- The select policies below still limit reads to moderators and the
-- affected user.
grant select on public.moderation_actions to authenticated;

-- Moderators and admins can read every moderation action.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'moderation_actions'
      and policyname = 'moderators read moderation actions'
  ) then
    create policy "moderators read moderation actions" on public.moderation_actions
      for select
      to authenticated
      using (public.is_moderator());
  end if;
end;
$$;

-- The affected user can read the actions taken against them (the removal
-- notice and appeal flow).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'moderation_actions'
      and policyname = 'affected users read their moderation actions'
  ) then
    create policy "affected users read their moderation actions" on public.moderation_actions
      for select
      to authenticated
      using (target_user_id = (select auth.uid()));
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- appeals: one appeal per moderation action, filed by the affected user.
-- The unique constraint makes "one appeal per action" a database guarantee.
-- Appellants insert their own rows (like reports); only handle_appeal()
-- changes the status, so there is no update grant: a status of 'reversed'
-- must always correspond to an actual reversal.
-- ---------------------------------------------------------------------------

create table if not exists public.appeals (
  id uuid primary key default gen_random_uuid(),
  moderation_action_id uuid not null references public.moderation_actions (id) on delete cascade,
  appellant_id uuid not null references public.profiles (id) on delete cascade,
  message text not null
    constraint appeals_message_length check (char_length(message) between 1 and 1000),
  status text not null default 'open'
    constraint appeals_status_check check (status in ('open', 'upheld', 'reversed')),
  created_at timestamptz not null default now(),
  -- Set by handle_appeal(). Kept (as null) when the moderator's account is
  -- deleted, so the decision record survives.
  handled_by uuid references public.profiles (id) on delete set null,
  handled_at timestamptz,
  constraint appeals_one_per_action unique (moderation_action_id)
);

alter table public.appeals enable row level security;

revoke all on public.appeals from anon, authenticated;
grant select on public.appeals to authenticated;
grant insert (moderation_action_id, appellant_id, message) on public.appeals to authenticated;
-- No update grant: handle_appeal() is the only writer of status, handled_by
-- and handled_at, so a 'reversed' status always matches a real reversal.

-- Moderators and admins can read every appeal.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'appeals'
      and policyname = 'moderators read appeals'
  ) then
    create policy "moderators read appeals" on public.appeals
      for select
      to authenticated
      using (public.is_moderator());
  end if;
end;
$$;

-- Appellants can read their own appeals (to see the outcome).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'appeals'
      and policyname = 'appellants read their appeals'
  ) then
    create policy "appellants read their appeals" on public.appeals
      for select
      to authenticated
      using (appellant_id = (select auth.uid()));
  end if;
end;
$$;

-- The affected user of a moderation action can appeal it, once (the unique
-- constraint above rejects a second appeal of the same action).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'appeals'
      and policyname = 'affected users appeal moderation actions'
  ) then
    create policy "affected users appeal moderation actions" on public.appeals
      for insert
      to authenticated
      with check (
        appellant_id = (select auth.uid())
        and exists (
          select 1 from public.moderation_actions ma
          where ma.id = moderation_action_id
            and ma.target_user_id = (select auth.uid())
        )
      );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- groups: member-run spaces with their own feed. Public groups are open to
-- everyone; invite-only groups are findable by slug (the name and
-- description stay visible so an invited user can see what they would be
-- joining) but their posts and member list are for active members only.
-- Discovery listings are a client concern: the client only lists public
-- groups.
-- ---------------------------------------------------------------------------

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null
    constraint groups_slug_shape check (slug ~ '^[a-z0-9-]+$')
    constraint groups_slug_length check (char_length(slug) between 3 and 40),
  name text not null
    constraint groups_name_length check (char_length(name) between 1 and 60),
  description text
    constraint groups_description_length check (char_length(description) <= 500),
  visibility text not null default 'public'
    constraint groups_visibility_check check (visibility in ('public', 'invite_only')),
  -- Deleting the owner's account deletes the group, its members and its
  -- posts. Ownership transfer is out of scope for this wave.
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint groups_slug_key unique (slug)
);

alter table public.groups enable row level security;

revoke all on public.groups from anon, authenticated;
grant select on public.groups to anon, authenticated;
grant insert (slug, name, description, visibility, owner_id) on public.groups to authenticated;
-- The slug is the group's identity; only name, description and visibility
-- can change.
grant update (name, description, visibility) on public.groups to authenticated;
grant delete on public.groups to authenticated;

-- Anyone can read any group row: public groups for discovery, invite-only
-- groups so a member can share a link that shows the name and description.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'groups'
      and policyname = 'groups are readable'
  ) then
    create policy "groups are readable" on public.groups
      for select
      to anon, authenticated
      using (true);
  end if;
end;
$$;

-- Signed-in, not suspended users can create groups, only as themselves.
-- The owner membership row is added by the add_group_owner() trigger.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'groups'
      and policyname = 'signed-in users create groups'
  ) then
    create policy "signed-in users create groups" on public.groups
      for insert
      to authenticated
      with check (
        owner_id = (select auth.uid())
        and not public.is_suspended((select auth.uid()))
      );
  end if;
end;
$$;

-- Owners can edit their groups.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'groups'
      and policyname = 'owners update groups'
  ) then
    create policy "owners update groups" on public.groups
      for update
      to authenticated
      using (owner_id = (select auth.uid()))
      with check (owner_id = (select auth.uid()));
  end if;
end;
$$;

-- Owners can delete their groups (which deletes the members and posts with
-- them).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'groups'
      and policyname = 'owners delete groups'
  ) then
    create policy "owners delete groups" on public.groups
      for delete
      to authenticated
      using (owner_id = (select auth.uid()));
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- group_members: one row per membership or outstanding invitation. The
-- owner row (role 'owner', status 'active') is created by trigger when the
-- group is created. Invitations are 'invited' rows that the invitee accepts
-- (update to 'active') or declines (delete). 'requested' is reserved for a
-- future join-request flow; nothing writes it yet.
-- ---------------------------------------------------------------------------

create table if not exists public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member'
    constraint group_members_role_check check (role in ('owner', 'moderator', 'member')),
  status text not null default 'active'
    constraint group_members_status_check check (status in ('active', 'invited', 'requested')),
  created_at timestamptz not null default now(),
  constraint group_members_pkey primary key (group_id, user_id)
);

alter table public.group_members enable row level security;

revoke all on public.group_members from anon, authenticated;
grant select on public.group_members to anon, authenticated;
grant insert (group_id, user_id, role, status) on public.group_members to authenticated;
-- Invitees accept by updating status; owners set roles.
grant update (status) on public.group_members to authenticated;
grant update (role) on public.group_members to authenticated;
grant delete on public.group_members to authenticated;

-- ---------------------------------------------------------------------------
-- Group helpers. Security definer so row-level policies can read
-- group_members, which the policies below already limit per reader.
-- ---------------------------------------------------------------------------

-- True when the calling user is an active member of the group.
create or replace function public.is_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.group_members
    where group_members.group_id = is_group_member.target_group_id
      and group_members.user_id = (select auth.uid())
      and group_members.status = 'active'
  );
$$;

-- The caller's role in the group ('owner', 'moderator' or 'member'), or
-- null when they are not an active member.
create or replace function public.group_role(target_group_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select group_members.role
  from public.group_members
  where group_members.group_id = group_role.target_group_id
    and group_members.user_id = (select auth.uid())
    and group_members.status = 'active'
$$;

revoke execute on function public.is_group_member(uuid) from public, anon, authenticated;
revoke execute on function public.group_role(uuid) from public, anon, authenticated;
-- The posts and group_members policies call these on the reader's behalf.
-- is_group_member is also used by the anon-readable posts select policy.
grant execute on function public.is_group_member(uuid) to anon, authenticated;
grant execute on function public.group_role(uuid) to authenticated;

-- Anyone can read the members of a public group; active members can read
-- the member list of an invite-only group; everyone can read their own rows
-- (their memberships, and invitations they have not answered yet).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'group_members'
      and policyname = 'members and invitations are readable'
  ) then
    create policy "members and invitations are readable" on public.group_members
      for select
      to anon, authenticated
      using (
        user_id = (select auth.uid())
        or exists (
          select 1 from public.groups g
          where g.id = group_id
            and g.visibility = 'public'
        )
        or public.is_group_member(group_id)
      );
  end if;
end;
$$;

-- Users join public groups themselves, as plain active members.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'group_members'
      and policyname = 'users join public groups'
  ) then
    create policy "users join public groups" on public.group_members
      for insert
      to authenticated
      with check (
        user_id = (select auth.uid())
        and role = 'member'
        and status = 'active'
        and exists (
          select 1 from public.groups g
          where g.id = group_id
            and g.visibility = 'public'
        )
      );
  end if;
end;
$$;

-- Group owners and moderators invite members: an 'invited' row the invitee
-- can accept or decline.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'group_members'
      and policyname = 'group owners and moderators invite members'
  ) then
    create policy "group owners and moderators invite members" on public.group_members
      for insert
      to authenticated
      with check (
        public.group_role(group_id) in ('owner', 'moderator')
        and role = 'member'
        and status = 'invited'
      );
  end if;
end;
$$;

-- Invitees accept their invitation (invited -> active, their own row only,
-- and the role grant keeps them a plain member).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'group_members'
      and policyname = 'invitees accept their invitations'
  ) then
    create policy "invitees accept their invitations" on public.group_members
      for update
      to authenticated
      using (
        user_id = (select auth.uid())
        and status = 'invited'
      )
      with check (
        user_id = (select auth.uid())
        and status = 'active'
        and role = 'member'
      );
  end if;
end;
$$;

-- Owners promote members to group moderators and back. Never the owner's
-- own row (a group must keep its owner) and never to role 'owner'.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'group_members'
      and policyname = 'owners set member roles'
  ) then
    create policy "owners set member roles" on public.group_members
      for update
      to authenticated
      using (
        public.group_role(group_id) = 'owner'
        and user_id <> (select auth.uid())
        and status = 'active'
      )
      with check (
        public.group_role(group_id) = 'owner'
        and user_id <> (select auth.uid())
        and status = 'active'
        and role in ('member', 'moderator')
      );
  end if;
end;
$$;

-- Members leave (except owners: a group must keep its owner), invitees
-- decline by deleting their invitation, and owners or group moderators
-- remove members. Group moderators can only remove plain members.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'group_members'
      and policyname = 'members leave or are removed'
  ) then
    create policy "members leave or are removed" on public.group_members
      for delete
      to authenticated
      using (
        (user_id = (select auth.uid()) and role <> 'owner')
        or (public.group_role(group_id) = 'owner' and role <> 'owner')
        or (public.group_role(group_id) = 'moderator' and role = 'member')
      );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- notifications: what happened while you were away. Recipients can read,
-- mark read and delete their own rows. Rows are created only by the
-- security-definer triggers and moderation functions below; there is no
-- insert grant, so no client can fabricate a notification.
-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  -- Who did it, when that is knowable. Kept (as null) when the actor's
  -- account is deleted, so moderation notices survive their moderator.
  actor_id uuid references public.profiles (id) on delete set null,
  type text not null
    constraint notifications_type_check check (type in ('like', 'comment', 'follow', 'moderation', 'appeal', 'group_invite')),
  post_id uuid references public.posts (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  group_id uuid references public.groups (id) on delete cascade,
  moderation_action_id uuid references public.moderation_actions (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
-- Only read_at can change: marking read is the one client-side update.
grant update (read_at) on public.notifications to authenticated;
grant delete on public.notifications to authenticated;

-- Recipients read their own notifications.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications'
      and policyname = 'recipients read their notifications'
  ) then
    create policy "recipients read their notifications" on public.notifications
      for select
      to authenticated
      using (recipient_id = (select auth.uid()));
  end if;
end;
$$;

-- Recipients mark their own notifications read (read_at only; the grant
-- above blocks every other column).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications'
      and policyname = 'recipients mark their notifications read'
  ) then
    create policy "recipients mark their notifications read" on public.notifications
      for update
      to authenticated
      using (recipient_id = (select auth.uid()))
      with check (recipient_id = (select auth.uid()));
  end if;
end;
$$;

-- Recipients delete their own notifications.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications'
      and policyname = 'recipients delete their notifications'
  ) then
    create policy "recipients delete their notifications" on public.notifications
      for delete
      to authenticated
      using (recipient_id = (select auth.uid()));
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Moderation functions, wave 4: the same actions as the foundation's
-- remove_post/remove_comment/suspend_user, but every call records a
-- moderation_actions row with the reason and notifies the affected user.
-- The old functions stay (their SQL is untouched) but execute is revoked
-- below, so clients must use these.
-- ---------------------------------------------------------------------------

-- Removes a post and records why. Idempotent: an already-removed post is
-- left untouched and no second action row is written.
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
  select posts.author_id into v_author_id
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
    (target_type, target_id, target_user_id, action, reason, report_id, moderator_id)
  values
    ('post', remove_post_with_reason.target_post_id, v_author_id, 'remove',
     remove_post_with_reason.removal_reason, remove_post_with_reason.source_report_id,
     (select auth.uid()))
  returning id into v_action_id;
  if v_author_id <> (select auth.uid()) then
    insert into public.notifications (recipient_id, actor_id, type, post_id, moderation_action_id)
    values (v_author_id, (select auth.uid()), 'moderation',
            remove_post_with_reason.target_post_id, v_action_id);
  end if;
end;
$$;

-- Removes a comment and records why. Idempotent.
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
  select comments.author_id into v_author_id
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
    (target_type, target_id, target_user_id, action, reason, report_id, moderator_id)
  values
    ('comment', remove_comment_with_reason.target_comment_id, v_author_id, 'remove',
     remove_comment_with_reason.removal_reason, remove_comment_with_reason.source_report_id,
     (select auth.uid()))
  returning id into v_action_id;
  if v_author_id <> (select auth.uid()) then
    insert into public.notifications (recipient_id, actor_id, type, comment_id, moderation_action_id)
    values (v_author_id, (select auth.uid()), 'moderation',
            remove_comment_with_reason.target_comment_id, v_action_id);
  end if;
end;
$$;

-- Suspends a user until a given time and records why. is_suspended() treats
-- the user as suspended while any row has "until" in the future, so
-- re-suspending just adds another row.
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
  );
  insert into public.moderation_actions
    (target_type, target_id, target_user_id, action, reason, report_id, moderator_id)
  values
    ('profile', suspend_user_with_reason.target_user_id, suspend_user_with_reason.target_user_id,
     'suspend', suspend_user_with_reason.suspension_reason,
     suspend_user_with_reason.source_report_id, (select auth.uid()))
  returning id into v_action_id;
  if suspend_user_with_reason.target_user_id <> (select auth.uid()) then
    insert into public.notifications (recipient_id, actor_id, type, moderation_action_id)
    values (suspend_user_with_reason.target_user_id, (select auth.uid()), 'moderation',
            v_action_id);
  end if;
end;
$$;

-- Handles an appeal: 'upheld' keeps the action in place, 'reversed' undoes
-- it (a removed post or comment becomes visible again; an active suspension
-- ends immediately). Either way the appellant is notified. Only open
-- appeals can be handled.
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
      update public.user_suspensions
      set "until" = now()
      where user_suspensions.user_id = v_action.target_user_id
        and user_suspensions."until" > now();
    end if;
  end if;
  if v_appeal.appellant_id <> (select auth.uid()) then
    insert into public.notifications (recipient_id, actor_id, type, moderation_action_id)
    values (v_appeal.appellant_id, (select auth.uid()), 'appeal',
            v_appeal.moderation_action_id);
  end if;
end;
$$;

revoke execute on function public.remove_post_with_reason(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.remove_comment_with_reason(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.suspend_user_with_reason(uuid, timestamptz, text, uuid) from public, anon, authenticated;
revoke execute on function public.handle_appeal(uuid, text) from public, anon, authenticated;
-- Moderators are signed in, so authenticated is the only role that needs
-- these. Each function re-checks is_moderator() itself.
grant execute on function public.remove_post_with_reason(uuid, text, uuid) to authenticated;
grant execute on function public.remove_comment_with_reason(uuid, text, uuid) to authenticated;
grant execute on function public.suspend_user_with_reason(uuid, timestamptz, text, uuid) to authenticated;
grant execute on function public.handle_appeal(uuid, text) to authenticated;

-- The foundation's reason-less functions stay for the audit trail but are
-- closed to clients: every removal and suspension now goes through the
-- *_with_reason functions, so nothing is ever removed without a recorded
-- reason and a notification to the affected user.
revoke execute on function public.remove_post(uuid) from authenticated;
revoke execute on function public.remove_comment(uuid) from authenticated;
revoke execute on function public.suspend_user(uuid, timestamptz, text) from authenticated;

-- ---------------------------------------------------------------------------
-- Notification triggers: likes, comments and follows notify the post author
-- or followee. Self-actions are skipped (you already know), and so are
-- actions by someone the recipient has blocked.
-- ---------------------------------------------------------------------------

-- Notifies the post author when someone likes their post.
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
  insert into public.notifications (recipient_id, actor_id, type, post_id)
  values (v_author_id, new.user_id, 'like', new.post_id);
  return new;
end;
$$;

-- Notifies the post author when someone comments on their post.
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
  insert into public.notifications (recipient_id, actor_id, type, post_id, comment_id)
  values (v_author_id, new.author_id, 'comment', new.post_id, new.id);
  return new;
end;
$$;

-- Notifies the followee when someone follows them.
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
  insert into public.notifications (recipient_id, actor_id, type)
  values (new.followee_id, new.follower_id, 'follow');
  return new;
end;
$$;

-- Trigger functions are never called directly; revoke keeps clients from
-- calling them through the API.
revoke execute on function public.notify_post_author_of_like() from public, anon, authenticated;
revoke execute on function public.notify_post_author_of_comment() from public, anon, authenticated;
revoke execute on function public.notify_followee_of_follow() from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.post_likes'::regclass
      and tgname = 'post_likes_notify_author'
  ) then
    create trigger post_likes_notify_author
      after insert on public.post_likes
      for each row execute function public.notify_post_author_of_like();
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.comments'::regclass
      and tgname = 'comments_notify_author'
  ) then
    create trigger comments_notify_author
      after insert on public.comments
      for each row execute function public.notify_post_author_of_comment();
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.follows'::regclass
      and tgname = 'follows_notify_followee'
  ) then
    create trigger follows_notify_followee
      after insert on public.follows
      for each row execute function public.notify_followee_of_follow();
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Group triggers: the owner membership row on creation, the group creation
-- rate limit, and invitations notifying the invitee. The errcode continues
-- the custom P0A class from the foundation migration:
--   P0A05 - creating too many groups (more than 3 per day)
-- ---------------------------------------------------------------------------

-- Adds the creator as the group's owner.
create or replace function public.add_group_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.group_members (group_id, user_id, role, status)
  values (new.id, new.owner_id, 'owner', 'active');
  return new;
end;
$$;

create or replace function public.enforce_group_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.groups
    where groups.owner_id = new.owner_id
      and groups.created_at > now() - interval '1 day'
  ) >= 3 then
    raise exception 'Too many new groups; wait a day'
      using errcode = 'P0A05';
  end if;
  return new;
end;
$$;

-- Notifies the invitee when an owner or group moderator invites them.
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
  insert into public.notifications (recipient_id, actor_id, type, group_id)
  values (new.user_id, (select auth.uid()), 'group_invite', new.group_id);
  return new;
end;
$$;

-- Trigger functions are never called directly; revoke keeps clients from
-- calling them through the API.
revoke execute on function public.add_group_owner() from public, anon, authenticated;
revoke execute on function public.enforce_group_limits() from public, anon, authenticated;
revoke execute on function public.notify_group_invite() from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.groups'::regclass
      and tgname = 'groups_enforce_limits'
  ) then
    create trigger groups_enforce_limits
      before insert on public.groups
      for each row execute function public.enforce_group_limits();
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.groups'::regclass
      and tgname = 'groups_add_owner'
  ) then
    create trigger groups_add_owner
      after insert on public.groups
      for each row execute function public.add_group_owner();
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.group_members'::regclass
      and tgname = 'group_members_notify_invite'
  ) then
    create trigger group_members_notify_invite
      after insert on public.group_members
      for each row execute function public.notify_group_invite();
  end if;
end;
$$;

-- Keep groups.updated_at current, reusing the function from the accounts
-- migration.
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.groups'::regclass
      and tgname = 'groups_set_updated_at'
  ) then
    create trigger groups_set_updated_at
      before update on public.groups
      for each row execute function public.set_updated_at();
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Group posts. posts.group_id is null for feed posts. Group posts are
-- readable like feed posts, plus: anyone when the group is public, active
-- members when it is invite-only. Posting into a group requires active
-- membership.
-- ---------------------------------------------------------------------------

alter table public.posts
  add column if not exists group_id uuid references public.groups (id) on delete cascade;

-- Authors can set the group when posting (the insert policy checks active
-- membership).
grant insert (group_id) on public.posts to authenticated;

-- Group posts join the readable posts: public groups to everyone,
-- invite-only groups to their active members.
alter policy "visible posts are readable" on public.posts
  to anon, authenticated
  using (
    removed_at is null
    and not public.is_suspended(author_id)
    and not exists (
      select 1 from public.blocks b
      where b.blocker_id = (select auth.uid())
        and b.blocked_id = posts.author_id
    )
    and (
      group_id is null
      or exists (
        select 1 from public.groups g
        where g.id = group_id
          and g.visibility = 'public'
      )
      or public.is_group_member(group_id)
    )
  );

-- Posting into a group requires active membership in that group.
alter policy "signed-in users write their own posts" on public.posts
  to authenticated
  with check (
    author_id = (select auth.uid())
    and not public.is_suspended((select auth.uid()))
    and (
      group_id is null
      or public.is_group_member(group_id)
    )
  );

-- ---------------------------------------------------------------------------
-- remove_group_post: group owners and group moderators remove a post in
-- their group, with a reason, recorded like any other moderation action.
-- Site moderators use remove_post_with_reason instead.
-- ---------------------------------------------------------------------------

create or replace function public.remove_group_post(target_post_id uuid, removal_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author_id uuid;
  v_group_id uuid;
  v_action_id uuid;
begin
  select posts.author_id, posts.group_id into v_author_id, v_group_id
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
    (target_type, target_id, target_user_id, action, reason, moderator_id)
  values
    ('post', remove_group_post.target_post_id, v_author_id, 'remove',
     remove_group_post.removal_reason, (select auth.uid()))
  returning id into v_action_id;
  if v_author_id <> (select auth.uid()) then
    insert into public.notifications (recipient_id, actor_id, type, post_id, moderation_action_id)
    values (v_author_id, (select auth.uid()), 'moderation',
            remove_group_post.target_post_id, v_action_id);
  end if;
end;
$$;

revoke execute on function public.remove_group_post(uuid, text) from public, anon, authenticated;
-- Group owners and moderators are signed in, so authenticated is the only
-- role that needs this. The function re-checks the caller's group role
-- itself.
grant execute on function public.remove_group_post(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- feed_posts: the feed read model, unchanged from the foundation except
-- that group_id is exposed as the last column. The main feed shows only
-- posts with group_id null; group feeds filter by group_id. The posts
-- policies above already hide invite-only group posts from non-members.
-- ---------------------------------------------------------------------------

create or replace view public.feed_posts
with (security_invoker = true)
as
select
  posts.id,
  posts.author_id,
  posts.body,
  posts.attachment,
  posts.created_at,
  posts.updated_at,
  profiles.username as author_username,
  profiles.display_name as author_display_name,
  profiles.avatar_species as author_avatar_species,
  (
    select count(*) from public.post_likes
    where post_likes.post_id = posts.id
  ) as like_count,
  (
    select count(*) from public.comments
    where comments.post_id = posts.id
  ) as comment_count,
  exists (
    select 1 from public.post_likes
    where post_likes.post_id = posts.id
      and post_likes.user_id = (select auth.uid())
  ) as liked_by_me,
  posts.group_id
from public.posts
join public.profiles on profiles.id = posts.author_id
where posts.removed_at is null
  and not public.is_suspended(posts.author_id)
  and not exists (
    select 1 from public.blocks
    where blocks.blocker_id = (select auth.uid())
      and blocks.blocked_id = posts.author_id
  );

revoke all on public.feed_posts from anon, authenticated;
grant select on public.feed_posts to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Indexes.
-- ---------------------------------------------------------------------------

-- Group feeds, newest first.
create index if not exists posts_group_idx on public.posts (group_id, created_at desc);
-- A recipient's notifications, newest first, and the unread ones.
create index if not exists notifications_recipient_idx
  on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (recipient_id, created_at desc)
  where read_at is null;
-- One author's comments (profile history).
create index if not exists comments_author_idx on public.comments (author_id, created_at desc);
-- A user's likes.
create index if not exists post_likes_user_idx on public.post_likes (user_id, created_at desc);
-- A reporter's reports, and the reports a moderator handled.
create index if not exists reports_reporter_idx on public.reports (reporter_id, created_at desc);
create index if not exists reports_handled_idx on public.reports (handled_by);
-- Who removed what (moderation audit).
create index if not exists posts_removed_by_idx on public.posts (removed_by);
create index if not exists comments_removed_by_idx on public.comments (removed_by);
create index if not exists user_suspensions_created_by_idx on public.user_suspensions (created_by);
-- A user's groups and invitations (the primary key leads with group_id).
create index if not exists group_members_user_idx on public.group_members (user_id);
-- The group creation limit counts an owner's recent groups.
create index if not exists groups_owner_idx on public.groups (owner_id, created_at desc);
-- The actions against a user (notice page, appeals), and the audit columns.
create index if not exists moderation_actions_target_user_idx
  on public.moderation_actions (target_user_id, created_at desc);
create index if not exists moderation_actions_moderator_idx on public.moderation_actions (moderator_id);
create index if not exists moderation_actions_report_idx on public.moderation_actions (report_id);
create index if not exists appeals_appellant_idx on public.appeals (appellant_id);
create index if not exists appeals_handled_by_idx on public.appeals (handled_by);
-- Foreign keys on notifications, so deleting a post, comment, group, action
-- or actor does not scan every notification.
create index if not exists notifications_actor_idx on public.notifications (actor_id);
create index if not exists notifications_post_idx on public.notifications (post_id);
create index if not exists notifications_comment_idx on public.notifications (comment_id);
create index if not exists notifications_group_idx on public.notifications (group_id);
create index if not exists notifications_moderation_action_idx
  on public.notifications (moderation_action_id);

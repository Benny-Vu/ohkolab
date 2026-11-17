-- Social foundation: posts, comments, likes, follows, blocks, reports and
-- moderation. The limits here mirror `src/lib/social/validation.ts`; change
-- both together. `src/lib/database.types.ts` is hand-written from the
-- migrations.
--
-- Idempotent: safe to run again. Tables and indexes use `if not exists`,
-- functions and the view use `create or replace`, and policies and triggers
-- are created inside do-blocks that check for them first, because
-- `create policy` and `create trigger` have no `if not exists` form.

-- ---------------------------------------------------------------------------
-- user_roles: admins and moderators. Rows are managed in the Supabase
-- dashboard, never through the API.
-- ---------------------------------------------------------------------------

create table if not exists public.user_roles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  role text not null
    constraint user_roles_role_check check (role in ('admin', 'moderator'))
);

alter table public.user_roles enable row level security;

-- No insert/update/delete grants: no client can write roles.
revoke all on public.user_roles from anon, authenticated;
-- The select policy below still hides everyone else's row.
grant select on public.user_roles to authenticated;

-- A user can see their own role row (e.g. to show moderation tools).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_roles'
      and policyname = 'users read their own role'
  ) then
    create policy "users read their own role" on public.user_roles
      for select
      to authenticated
      using (user_id = (select auth.uid()));
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- user_suspensions: one row per suspension. is_suspended() below treats a
-- user as suspended while any row has "until" in the future. Rows are
-- created only by the suspend_user() function.
-- ---------------------------------------------------------------------------

create table if not exists public.user_suspensions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  "until" timestamptz not null,
  reason text not null
    constraint user_suspensions_reason_length check (char_length(reason) between 1 and 500),
  -- The moderator who created the suspension. Kept (as null) when their
  -- account is deleted, so the suspension itself survives.
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint user_suspensions_pkey primary key (user_id, created_at)
);

alter table public.user_suspensions enable row level security;

-- No write grants: suspensions are created by suspend_user().
revoke all on public.user_suspensions from anon, authenticated;
-- The select policy below still limits reads to the user's own rows.
grant select on public.user_suspensions to authenticated;

-- A user can see their own suspensions (e.g. to explain why they cannot
-- post).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_suspensions'
      and policyname = 'users read their own suspensions'
  ) then
    create policy "users read their own suspensions" on public.user_suspensions
      for select
      to authenticated
      using (user_id = (select auth.uid()));
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Moderation helpers. Security definer so row-level policies can read
-- user_roles and user_suspensions, which clients cannot read directly.
-- ---------------------------------------------------------------------------

-- True when the calling user is an admin or moderator.
create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_roles.user_id = (select auth.uid())
      and user_roles.role in ('admin', 'moderator')
  );
$$;

-- True while the given user has a suspension that has not expired.
create or replace function public.is_suspended(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_suspensions
    where user_suspensions.user_id = is_suspended.target_user_id
      and user_suspensions."until" > now()
  );
$$;

revoke execute on function public.is_moderator() from public, anon, authenticated;
revoke execute on function public.is_suspended(uuid) from public, anon, authenticated;
-- The read policies below call these on the reader's behalf, so the API
-- roles need execute. Both only return a boolean.
grant execute on function public.is_moderator() to authenticated;
grant execute on function public.is_suspended(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- blocks: one user hiding another. Only the blocker can see or change their
-- blocks. Blocked authors disappear from the reader's feed and comments.
-- ---------------------------------------------------------------------------

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint blocks_pkey primary key (blocker_id, blocked_id),
  constraint blocks_no_self check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

revoke all on public.blocks from anon, authenticated;
-- The policies below still limit every action to the blocker.
grant select on public.blocks to authenticated;
grant insert (blocker_id, blocked_id) on public.blocks to authenticated;
grant delete on public.blocks to authenticated;

-- Only the blocker can see their blocks.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'blocks'
      and policyname = 'blockers read their blocks'
  ) then
    create policy "blockers read their blocks" on public.blocks
      for select
      to authenticated
      using (blocker_id = (select auth.uid()));
  end if;
end;
$$;

-- A user blocks as themselves.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'blocks'
      and policyname = 'users block'
  ) then
    create policy "users block" on public.blocks
      for insert
      to authenticated
      with check (blocker_id = (select auth.uid()));
  end if;
end;
$$;

-- A user unblocks as themselves.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'blocks'
      and policyname = 'users unblock'
  ) then
    create policy "users unblock" on public.blocks
      for delete
      to authenticated
      using (blocker_id = (select auth.uid()));
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- follows: public follow lists. Anyone can read them; only the follower can
-- start or end a follow.
-- ---------------------------------------------------------------------------

create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint follows_pkey primary key (follower_id, followee_id),
  constraint follows_no_self check (follower_id <> followee_id)
);

alter table public.follows enable row level security;

revoke all on public.follows from anon, authenticated;
-- Follow lists are public: anyone can see who follows whom.
grant select on public.follows to anon, authenticated;
grant insert (follower_id, followee_id) on public.follows to authenticated;
grant delete on public.follows to authenticated;

-- Anyone can read follows.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'follows'
      and policyname = 'follows are readable'
  ) then
    create policy "follows are readable" on public.follows
      for select
      to anon, authenticated
      using (true);
  end if;
end;
$$;

-- A user follows as themselves.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'follows'
      and policyname = 'users start follows'
  ) then
    create policy "users start follows" on public.follows
      for insert
      to authenticated
      with check (follower_id = (select auth.uid()));
  end if;
end;
$$;

-- A user unfollows as themselves.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'follows'
      and policyname = 'users end follows'
  ) then
    create policy "users end follows" on public.follows
      for delete
      to authenticated
      using (follower_id = (select auth.uid()));
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- posts: the feed. Anyone can read visible posts; signed-in users write
-- their own; authors edit the body; the author or a moderator can delete.
-- Moderators hide posts through remove_post(), which is the only writer of
-- removed_at/removed_by.
-- ---------------------------------------------------------------------------

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null
    constraint posts_body_length check (char_length(body) between 1 and 2000),
  -- Null, or a team/calculation snapshot: a JSON object or array of at most
  -- 8 KiB serialized.
  attachment jsonb
    constraint posts_attachment_shape check (
      attachment is null
      or (
        jsonb_typeof(attachment) in ('object', 'array')
        and octet_length(attachment::text) <= 8192
      )
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Set when a moderator removes the post. removed_by is kept (as null)
  -- when the moderator's account is deleted, so the removal survives.
  removed_at timestamptz,
  removed_by uuid references public.profiles (id) on delete set null
);

alter table public.posts enable row level security;

revoke all on public.posts from anon, authenticated;
-- Anyone can read what the select policy below still allows.
grant select on public.posts to anon, authenticated;
-- Authors write themselves, their body and their attachment; the insert
-- policy checks author_id against the signed-in user.
grant insert (author_id, body, attachment) on public.posts to authenticated;
-- Only the body can be edited; removed_at and removed_by are reserved for
-- remove_post().
grant update (body) on public.posts to authenticated;
-- The author (or a moderator, via the delete policy) can delete a post.
grant delete on public.posts to authenticated;

-- post_likes: who liked which post. Anyone can read them; only the user can
-- like or unlike as themselves.

create table if not exists public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint post_likes_pkey primary key (post_id, user_id)
);

alter table public.post_likes enable row level security;

revoke all on public.post_likes from anon, authenticated;
-- Like counts are public.
grant select on public.post_likes to anon, authenticated;
grant insert (post_id, user_id) on public.post_likes to authenticated;
grant delete on public.post_likes to authenticated;

-- Anyone can read likes.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'post_likes'
      and policyname = 'likes are readable'
  ) then
    create policy "likes are readable" on public.post_likes
      for select
      to anon, authenticated
      using (true);
  end if;
end;
$$;

-- A user likes as themselves.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'post_likes'
      and policyname = 'users like posts'
  ) then
    create policy "users like posts" on public.post_likes
      for insert
      to authenticated
      with check (user_id = (select auth.uid()));
  end if;
end;
$$;

-- A user unlikes as themselves.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'post_likes'
      and policyname = 'users unlike posts'
  ) then
    create policy "users unlike posts" on public.post_likes
      for delete
      to authenticated
      using (user_id = (select auth.uid()));
  end if;
end;
$$;

-- Anyone can read posts that are not removed, whose author is not
-- suspended, and whose author the reader has not blocked.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'posts'
      and policyname = 'visible posts are readable'
  ) then
    create policy "visible posts are readable" on public.posts
      for select
      to anon, authenticated
      using (
        removed_at is null
        and not public.is_suspended(author_id)
        and not exists (
          select 1 from public.blocks b
          where b.blocker_id = (select auth.uid())
            and b.blocked_id = posts.author_id
        )
      );
  end if;
end;
$$;

-- Signed-in, not suspended users can post, only as themselves.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'posts'
      and policyname = 'signed-in users write their own posts'
  ) then
    create policy "signed-in users write their own posts" on public.posts
      for insert
      to authenticated
      with check (
        author_id = (select auth.uid())
        and not public.is_suspended((select auth.uid()))
      );
  end if;
end;
$$;

-- Authors can edit the body of their own visible posts.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'posts'
      and policyname = 'authors edit their own post body'
  ) then
    create policy "authors edit their own post body" on public.posts
      for update
      to authenticated
      using (
        author_id = (select auth.uid())
        and removed_at is null
        and not public.is_suspended((select auth.uid()))
      )
      with check (
        author_id = (select auth.uid())
        and not public.is_suspended((select auth.uid()))
      );
  end if;
end;
$$;

-- The author or a moderator can delete a post entirely.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'posts'
      and policyname = 'authors or moderators delete posts'
  ) then
    create policy "authors or moderators delete posts" on public.posts
      for delete
      to authenticated
      using (
        author_id = (select auth.uid())
        or public.is_moderator()
      );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- comments: replies to posts, with the same visibility rules as posts plus
-- "the parent post must be visible".
-- ---------------------------------------------------------------------------

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null
    constraint comments_body_length check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  -- Set when a moderator removes the comment. removed_by is kept (as null)
  -- when the moderator's account is deleted, so the removal survives.
  removed_at timestamptz,
  removed_by uuid references public.profiles (id) on delete set null
);

alter table public.comments enable row level security;

revoke all on public.comments from anon, authenticated;
grant select on public.comments to anon, authenticated;
grant insert (post_id, author_id, body) on public.comments to authenticated;
grant update (body) on public.comments to authenticated;
grant delete on public.comments to authenticated;

-- Anyone can read comments that are not removed, whose author is not
-- suspended and not blocked by the reader, and whose parent post is visible
-- (the exists() subquery respects the posts policies above).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'comments'
      and policyname = 'visible comments are readable'
  ) then
    create policy "visible comments are readable" on public.comments
      for select
      to anon, authenticated
      using (
        removed_at is null
        and not public.is_suspended(author_id)
        and not exists (
          select 1 from public.blocks b
          where b.blocker_id = (select auth.uid())
            and b.blocked_id = comments.author_id
        )
        and exists (
          select 1 from public.posts p
          where p.id = comments.post_id
        )
      );
  end if;
end;
$$;

-- Signed-in, not suspended users can comment on visible posts, only as
-- themselves.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'comments'
      and policyname = 'signed-in users write their own comments'
  ) then
    create policy "signed-in users write their own comments" on public.comments
      for insert
      to authenticated
      with check (
        author_id = (select auth.uid())
        and not public.is_suspended((select auth.uid()))
        and exists (
          select 1 from public.posts p
          where p.id = post_id
        )
      );
  end if;
end;
$$;

-- Authors can edit the body of their own visible comments.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'comments'
      and policyname = 'authors edit their own comment body'
  ) then
    create policy "authors edit their own comment body" on public.comments
      for update
      to authenticated
      using (
        author_id = (select auth.uid())
        and removed_at is null
        and not public.is_suspended((select auth.uid()))
      )
      with check (
        author_id = (select auth.uid())
        and not public.is_suspended((select auth.uid()))
      );
  end if;
end;
$$;

-- The author or a moderator can delete a comment entirely.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'comments'
      and policyname = 'authors or moderators delete comments'
  ) then
    create policy "authors or moderators delete comments" on public.comments
      for delete
      to authenticated
      using (
        author_id = (select auth.uid())
        or public.is_moderator()
      );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- reports: the moderation queue. Any signed-in user can report content as
-- themselves; only moderators and admins can read or update reports.
-- ---------------------------------------------------------------------------

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null
    constraint reports_target_type_check check (target_type in ('post', 'comment', 'profile')),
  -- The id of the reported post, comment or profile. Deliberately not a
  -- foreign key: a report must survive its target being deleted.
  target_id uuid not null,
  reason text not null
    constraint reports_reason_check check (reason in ('spam', 'harassment', 'inappropriate', 'other')),
  details text
    constraint reports_details_length check (char_length(details) <= 500),
  status text not null default 'open'
    constraint reports_status_check check (status in ('open', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  -- Set by handle_report(). Kept (as null) when the moderator's account is
  -- deleted, so the handling record survives.
  handled_by uuid references public.profiles (id) on delete set null,
  handled_at timestamptz
);

alter table public.reports enable row level security;

revoke all on public.reports from anon, authenticated;
-- Only moderators pass the select policy below, but the grant is role-wide.
grant select on public.reports to authenticated;
grant insert (reporter_id, target_type, target_id, reason, details)
  on public.reports to authenticated;
-- Only moderators pass the update policy below. handled_by and handled_at
-- are set by handle_report(), not by clients.
grant update (status) on public.reports to authenticated;

-- Any signed-in user can report content, only as themselves.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'reports'
      and policyname = 'signed-in users report content'
  ) then
    create policy "signed-in users report content" on public.reports
      for insert
      to authenticated
      with check (reporter_id = (select auth.uid()));
  end if;
end;
$$;

-- Only moderators and admins can read the report queue.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'reports'
      and policyname = 'moderators read reports'
  ) then
    create policy "moderators read reports" on public.reports
      for select
      to authenticated
      using (public.is_moderator());
  end if;
end;
$$;

-- Only moderators and admins can change a report's status.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'reports'
      and policyname = 'moderators update reports'
  ) then
    create policy "moderators update reports" on public.reports
      for update
      to authenticated
      using (public.is_moderator())
      with check (public.is_moderator());
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Rate limits and the suspension check, enforced by before-insert triggers.
-- The errcodes are custom class P0A (chosen to avoid every reserved class)
-- so the client can tell these apart from other failures:
--   P0A01 - posting too fast (more than 5 posts per 10 minutes)
--   P0A02 - commenting too fast (more than 30 comments per 10 minutes)
--   P0A03 - the account is suspended
-- Security definer so the count sees every row, not just the rows the
-- inserting user can read.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_post_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_suspended(new.author_id) then
    raise exception 'This account is suspended'
      using errcode = 'P0A03';
  end if;
  if (
    select count(*) from public.posts
    where posts.author_id = new.author_id
      and posts.created_at > now() - interval '10 minutes'
  ) >= 5 then
    raise exception 'Too many posts; wait a few minutes'
      using errcode = 'P0A01';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_comment_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_suspended(new.author_id) then
    raise exception 'This account is suspended'
      using errcode = 'P0A03';
  end if;
  if (
    select count(*) from public.comments
    where comments.author_id = new.author_id
      and comments.created_at > now() - interval '10 minutes'
  ) >= 30 then
    raise exception 'Too many comments; wait a few minutes'
      using errcode = 'P0A02';
  end if;
  return new;
end;
$$;

-- Trigger functions are never called directly; revoke keeps clients from
-- calling them through the API.
revoke execute on function public.enforce_post_limits() from public, anon, authenticated;
revoke execute on function public.enforce_comment_limits() from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.posts'::regclass
      and tgname = 'posts_enforce_limits'
  ) then
    create trigger posts_enforce_limits
      before insert on public.posts
      for each row execute function public.enforce_post_limits();
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.comments'::regclass
      and tgname = 'comments_enforce_limits'
  ) then
    create trigger comments_enforce_limits
      before insert on public.comments
      for each row execute function public.enforce_comment_limits();
  end if;
end;
$$;

-- Keep posts.updated_at current, reusing the function from the accounts
-- migration.
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.posts'::regclass
      and tgname = 'posts_set_updated_at'
  ) then
    create trigger posts_set_updated_at
      before update on public.posts
      for each row execute function public.set_updated_at();
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Moderation functions. Security definer so they can write removed_at,
-- removed_by, handled_by, handled_at and user_suspensions, which no client
-- role can write. Each checks is_moderator() first and refuses otherwise.
-- ---------------------------------------------------------------------------

-- Marks a post removed (removed_at/removed_by). Idempotent: already-removed
-- posts are left untouched.
create or replace function public.remove_post(target_post_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'Only moderators can remove posts'
      using errcode = '42501';
  end if;
  update public.posts
  set removed_at = now(),
      removed_by = (select auth.uid())
  where posts.id = remove_post.target_post_id
    and posts.removed_at is null;
end;
$$;

-- Marks a comment removed (removed_at/removed_by). Idempotent.
create or replace function public.remove_comment(target_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'Only moderators can remove comments'
      using errcode = '42501';
  end if;
  update public.comments
  set removed_at = now(),
      removed_by = (select auth.uid())
  where comments.id = remove_comment.target_comment_id
    and comments.removed_at is null;
end;
$$;

-- Sets a report's status and records who handled it and when.
create or replace function public.handle_report(target_report_id uuid, new_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'Only moderators can handle reports'
      using errcode = '42501';
  end if;
  if handle_report.new_status not in ('actioned', 'dismissed') then
    raise exception 'Invalid report status'
      using errcode = '23514';
  end if;
  update public.reports
  set status = handle_report.new_status,
      handled_by = (select auth.uid()),
      handled_at = now()
  where reports.id = handle_report.target_report_id;
end;
$$;

-- Suspends a user until a given time. is_suspended() treats the user as
-- suspended while any row has "until" in the future, so re-suspending just
-- adds another row.
create or replace function public.suspend_user(
  target_user_id uuid,
  suspend_until timestamptz,
  suspension_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'Only moderators can suspend users'
      using errcode = '42501';
  end if;
  if char_length(suspend_user.suspension_reason) not between 1 and 500 then
    raise exception 'Invalid suspension reason'
      using errcode = '23514';
  end if;
  insert into public.user_suspensions (user_id, "until", reason, created_by)
  values (
    suspend_user.target_user_id,
    suspend_user.suspend_until,
    suspend_user.suspension_reason,
    (select auth.uid())
  );
end;
$$;

revoke execute on function public.remove_post(uuid) from public, anon, authenticated;
revoke execute on function public.remove_comment(uuid) from public, anon, authenticated;
revoke execute on function public.handle_report(uuid, text) from public, anon, authenticated;
revoke execute on function public.suspend_user(uuid, timestamptz, text) from public, anon, authenticated;
-- Moderators are signed in, so authenticated is the only role that needs
-- these. Each function re-checks is_moderator() itself.
grant execute on function public.remove_post(uuid) to authenticated;
grant execute on function public.remove_comment(uuid) to authenticated;
grant execute on function public.handle_report(uuid, text) to authenticated;
grant execute on function public.suspend_user(uuid, timestamptz, text) to authenticated;

-- ---------------------------------------------------------------------------
-- feed_posts: the feed read model. One row per visible post with the author's
-- profile, the like and comment counts, and whether the current user liked
-- it. security_invoker = true makes the view run as the reader, so the same
-- row-level rules apply as on the underlying tables.
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
  ) as liked_by_me
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

-- The latest feed pages by (created_at desc, id desc).
create index if not exists posts_feed_idx on public.posts (created_at desc, id desc);
-- One author's posts, and the posts of everyone a user follows (both filter
-- by author_id and order by created_at).
create index if not exists posts_author_idx on public.posts (author_id, created_at desc);
-- Comments of one post, oldest first.
create index if not exists comments_post_idx on public.comments (post_id, created_at);
-- Like counts per post.
create index if not exists post_likes_post_idx on public.post_likes (post_id);
-- Follower and following lists, newest first.
create index if not exists follows_followee_idx on public.follows (followee_id, created_at desc);
create index if not exists follows_follower_idx on public.follows (follower_id, created_at desc);
-- "Has this reader blocked the author?" in the posts and comments policies.
create index if not exists blocks_blocked_idx on public.blocks (blocked_id);
-- The moderation queue, grouped by status.
create index if not exists reports_status_idx on public.reports (status);

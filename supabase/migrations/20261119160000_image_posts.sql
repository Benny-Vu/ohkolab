-- Image posts (2026-11-19). Posts get up to 4 images, each screened before
-- anyone but the author sees it. `src/lib/database.types.ts` is hand-written
-- from the migrations; this one adds post_images and
-- moderation_actions.media_paths there.
--
-- The storage layout is fixed by the client (Part D) and the Edge Functions
-- (Part B):
--   post-images-pending/{uid}/{post_id}/{image_id}.webp   author upload
--   post-images/{uid}/{post_id}/{image_id}.webp           approved, public
--   post-images-quarantine/{pending_path}                 rejected / removed
--
-- NOTE FOR THE OWNER: apply this migration before switching VITE_IMAGE_POSTS
-- on. The client hides the image feature while the table is missing, so the
-- order is safe. The Edge Function and the img.ohkolab.com Worker are
-- deployed separately (supabase/functions/, workers/img/); images stay
-- "pending" (invisible to others) until the screening function runs.
--
-- ACCOUNT DELETION: deleting an account cascades its post_images rows away
-- (post_id and author_id both reference with on delete cascade). The
-- storage files themselves cannot be deleted by SQL: the cleanup-images
-- Edge Function (Part B) deletes files whose post_images row is gone.
-- Files already moved to quarantine are kept there until the 12-month purge,
-- because a moderation_actions.media_paths entry can still point at them.
--
-- Idempotent: safe to run again. The table and indexes use `if not exists`,
-- functions use `create or replace`, and policies and triggers are created
-- inside do-blocks that check for them first, because `create policy` and
-- `create trigger` have no `if not exists` form. Nothing is dropped anywhere
-- in this migration. The two moderation functions re-recorded below keep
-- their signatures, so existing client calls are unaffected.

-- ---------------------------------------------------------------------------
-- post_images: one row per image attached to a post. The author inserts
-- pending rows for their own post right after uploading to the pending
-- bucket; the screening Edge Function is the only writer of status,
-- public_path, screen_result and screened_at (service role, which bypasses
-- these policies). No client can update or delete: reordering or removing
-- images after the post exists is out of scope for this wave.
--
-- At most 4 per post: the unique (post_id, position) plus the position check
-- (0 to 3) together cap it.
-- ---------------------------------------------------------------------------

create table if not exists public.post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  position int not null
    constraint post_images_position_check check (position between 0 and 3),
  -- Path inside the post-images-pending bucket:
  -- {uid}/{post_id}/{image_id}.webp
  pending_path text not null,
  -- Path inside the public post-images bucket; null until approved.
  public_path text,
  width int not null
    constraint post_images_width_check check (width between 1 and 10000),
  height int not null
    constraint post_images_height_check check (height between 1 and 10000),
  bytes int not null
    constraint post_images_bytes_check check (bytes between 1 and 1048576),
  status text not null default 'pending'
    constraint post_images_status_check
    check (status in ('pending', 'approved', 'rejected', 'blocked')),
  -- What the screening found (the moderation API response). Null while
  -- pending. A JSON object of at most 8 KiB serialized.
  screen_result jsonb
    constraint post_images_screen_result_shape check (
      screen_result is null
      or (
        jsonb_typeof(screen_result) in ('object', 'array')
        and octet_length(screen_result::text) <= 8192
      )
    ),
  screened_at timestamptz,
  -- Optional description, 0 to 300 characters.
  alt text
    constraint post_images_alt_length check (char_length(alt) <= 300),
  created_at timestamptz not null default now(),
  constraint post_images_post_position_key unique (post_id, position)
);

alter table public.post_images enable row level security;

revoke all on public.post_images from anon, authenticated;
-- Anyone can read what the select policies below still allow.
grant select on public.post_images to anon, authenticated;
-- Authors attach their own images; status/public_path/screen_result/
-- screened_at are not granted, so a client cannot approve its own image.
grant insert (post_id, author_id, position, pending_path, width, height, bytes, alt)
  on public.post_images to authenticated;
-- No update or delete grant: status changes happen only through the
-- screening Edge Function's service role.

-- Everyone who can read the post sees its approved images. The exists()
-- subquery respects the posts policies, so an image of a removed post, a
-- suspended author's post or a blocked (by the reader) author's post
-- disappears with the post itself.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'post_images'
      and policyname = 'approved images are readable with their post'
  ) then
    create policy "approved images are readable with their post"
      on public.post_images
      for select
      to anon, authenticated
      using (
        status = 'approved'
        and exists (
          select 1 from public.posts p
          where p.id = post_images.post_id
        )
      );
  end if;
end;
$$;

-- The author sees their own pending and rejected rows ("Checking image…",
-- "Image removed by automatic screening"). Blocked rows (a known-abuse
-- match) are deliberately hidden from the author; moderators see everything.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'post_images'
      and policyname = 'authors read their own pending and rejected images'
  ) then
    create policy "authors read their own pending and rejected images"
      on public.post_images
      for select
      to authenticated
      using (
        author_id = (select auth.uid())
        and status in ('pending', 'rejected')
      );
  end if;
end;
$$;

-- Moderators and admins see every image row, whatever its status.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'post_images'
      and policyname = 'moderators read all post images'
  ) then
    create policy "moderators read all post images"
      on public.post_images
      for select
      to authenticated
      using (public.is_moderator());
  end if;
end;
$$;

-- Authors attach pending images to their own visible posts, only as
-- themselves, and only into their own folder of the pending bucket. The
-- status column is not granted, so it always defaults to 'pending'.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'post_images'
      and policyname = 'authors attach pending images to their own posts'
  ) then
    create policy "authors attach pending images to their own posts"
      on public.post_images
      for insert
      to authenticated
      with check (
        author_id = (select auth.uid())
        and status = 'pending'
        and not public.is_suspended((select auth.uid()))
        and pending_path like ((select auth.uid())::text || '/%')
        and exists (
          select 1 from public.posts p
          where p.id = post_id
            and p.author_id = (select auth.uid())
            and p.removed_at is null
        )
      );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Storage buckets. Created here so the app and the Edge Functions share one
-- definition. Clients reach them through the storage API, which enforces the
-- policies below; the service role (Edge Functions) bypasses them.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('post-images-pending', 'post-images-pending', false, 1048576, array['image/webp']),
  ('post-images', 'post-images', true, 1048576, array['image/webp']),
  ('post-images-quarantine', 'post-images-quarantine', false, 1048576, array['image/webp'])
on conflict (id) do nothing;

-- Pending bucket: the author uploads to and reads their own
-- {auth.uid()}/... folder; moderators read everything. No update or delete
-- policies: only the service role moves files out of here.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'authors upload pending post images'
  ) then
    create policy "authors upload pending post images"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'post-images-pending'
        and (storage.foldername(name))[1] = (select auth.uid())::text
      );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'authors read their pending post images'
  ) then
    create policy "authors read their pending post images"
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'post-images-pending'
        and (storage.foldername(name))[1] = (select auth.uid())::text
      );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'moderators read pending post images'
  ) then
    create policy "moderators read pending post images"
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'post-images-pending'
        and public.is_moderator()
      );
  end if;
end;
$$;

-- Public bucket: approved images, served through img.ohkolab.com (the
-- Cloudflare Worker) and readable by anyone. Written only by the service
-- role (the screening Edge Function copies approved files here), so there
-- is no insert, update or delete policy for clients.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'approved post images are public'
  ) then
    create policy "approved post images are public"
      on storage.objects
      for select
      to anon, authenticated
      using (bucket_id = 'post-images');
  end if;
end;
$$;

-- Quarantine bucket: rejected images and images of removed posts, moved
-- here by the Edge Function. Readable only by moderators; written only by
-- the service role.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'moderators read quarantined post images'
  ) then
    create policy "moderators read quarantined post images"
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'post-images-quarantine'
        and public.is_moderator()
      );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Image rate limit: at most 30 image rows per author per 24 hours. The
-- errcode continues the custom P0A class from the social migrations:
--   P0A07 - too many post images in 24 hours
-- Security definer so the count sees every row, not just the rows the
-- inserting user can read.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_post_image_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.post_images
    where post_images.author_id = new.author_id
      and post_images.created_at > now() - interval '24 hours'
  ) >= 30 then
    raise exception 'Too many post images; wait a day'
      using errcode = 'P0A07';
  end if;
  return new;
end;
$$;

-- Trigger functions are never called directly; revoke keeps clients from
-- calling them through the API.
revoke execute on function public.enforce_post_image_limits() from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.post_images'::regclass
      and tgname = 'post_images_enforce_limits'
  ) then
    create trigger post_images_enforce_limits
      before insert on public.post_images
      for each row execute function public.enforce_post_image_limits();
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Moderation records: media_paths. remove_post_with_reason and
-- remove_group_post record the post's image paths in
-- moderation_actions.media_paths and mark its post_images rows 'blocked'.
-- SQL cannot move storage objects, so the Edge Function (Part B) moves the
-- listed files to quarantine; until it does, the blocked status already
-- hides the images from everyone but moderators (the public bucket copy is
-- also gone from the feed through the blocked status, and the Edge Function
-- deletes it when it moves the file).
-- ---------------------------------------------------------------------------

alter table public.moderation_actions
  add column if not exists media_paths text[]
    constraint moderation_actions_media_paths_size
    check (media_paths is null or cardinality(media_paths) <= 16);

-- Removes a post and records why, keeping a copy of the body and the paths
-- of its images, and marking those images blocked. Otherwise the same as
-- the clean-up wave version: idempotent, one action row per removal, a
-- notification to the author unless the moderator acted on themselves.
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
  v_media_paths text[];
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
  -- The post's image paths (pending copies and, where they exist, public
  -- copies) so the Edge Function can move the files to quarantine, and the
  -- images stop being shown.
  select array_agg(distinct path) into v_media_paths
  from (
    select pending_path as path
    from public.post_images
    where post_images.post_id = remove_post_with_reason.target_post_id
    union
    select public_path as path
    from public.post_images
    where post_images.post_id = remove_post_with_reason.target_post_id
      and post_images.public_path is not null
  ) as paths;
  update public.post_images
  set status = 'blocked'
  where post_images.post_id = remove_post_with_reason.target_post_id
    and post_images.status in ('pending', 'approved');
  insert into public.moderation_actions
    (target_type, target_id, target_user_id, action, reason, report_id, moderator_id,
     content_snapshot, content_kind, media_paths)
  values
    ('post', remove_post_with_reason.target_post_id, v_author_id, 'remove',
     remove_post_with_reason.removal_reason, remove_post_with_reason.source_report_id,
     (select auth.uid()), v_body, 'post', v_media_paths)
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

-- Removes a group post and records why, keeping a copy of the body and the
-- paths of its images, and marking those images blocked. Group owners and
-- moderators call this; site moderators use remove_post_with_reason instead.
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
  v_media_paths text[];
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
  select array_agg(distinct path) into v_media_paths
  from (
    select pending_path as path
    from public.post_images
    where post_images.post_id = remove_group_post.target_post_id
    union
    select public_path as path
    from public.post_images
    where post_images.post_id = remove_group_post.target_post_id
      and post_images.public_path is not null
  ) as paths;
  update public.post_images
  set status = 'blocked'
  where post_images.post_id = remove_group_post.target_post_id
    and post_images.status in ('pending', 'approved');
  insert into public.moderation_actions
    (target_type, target_id, target_user_id, action, reason, moderator_id,
     content_snapshot, content_kind, media_paths)
  values
    ('post', remove_group_post.target_post_id, v_author_id, 'remove',
     remove_group_post.removal_reason, (select auth.uid()), v_body, 'group_post',
     v_media_paths)
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

revoke execute on function public.remove_post_with_reason(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.remove_group_post(uuid, text) from public, anon, authenticated;
-- Moderators, group owners and group moderators are signed in, so
-- authenticated is the only role that needs these. Each function re-checks
-- the caller's role itself.
grant execute on function public.remove_post_with_reason(uuid, text, uuid) to authenticated;
grant execute on function public.remove_group_post(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Indexes.
-- ---------------------------------------------------------------------------

-- The image rate limit counts an author's recent images. (post_id,
-- position) already has the unique constraint's index.
create index if not exists post_images_author_idx
  on public.post_images (author_id, created_at desc);

-- Community wave: richer public profiles, and language tags on posts and
-- groups so the EN and JA communities can find their own content.
--
-- All new columns are nullable and optional: an existing profile keeps
-- rendering exactly as before, and a null post language or group
-- category means "not tagged" (the client filters treat it as
-- language-neutral).
--
-- Idempotent like the rest of supabase/migrations.

-- ---------------------------------------------------------------------------
-- profiles: the community fields. All of them are public by nature — they
-- ride the existing "profiles are public" select policy and the
-- "update own profile" update policy; only the column grant extends.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists favourite_species text
    constraint profiles_favourite_species_length
      check (favourite_species is null or char_length(favourite_species) <= 60),
  add column if not exists main_format text
    constraint profiles_main_format_check
      check (main_format in ('singles', 'doubles', 'both')),
  add column if not exists looking_for text
    constraint profiles_looking_for_length
      check (looking_for is null or char_length(looking_for) <= 100),
  add column if not exists youtube_url text
    constraint profiles_youtube_url_shape
      check (youtube_url is null or (youtube_url ~ '^https://' and char_length(youtube_url) <= 200)),
  add column if not exists twitch_url text
    constraint profiles_twitch_url_shape
      check (twitch_url is null or (twitch_url ~ '^https://' and char_length(twitch_url) <= 200)),
  add column if not exists showdown_name text
    constraint profiles_showdown_name_length
      check (showdown_name is null or char_length(showdown_name) <= 64);

-- The owner may set the new fields (grants are additive: the existing
-- username/display_name/avatar_species/bio grant stays).
grant update (favourite_species, main_format, looking_for, youtube_url, twitch_url, showdown_name)
  on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- posts: an optional language tag ('en' or 'ja'). Null means untagged.
-- ---------------------------------------------------------------------------

alter table public.posts
  add column if not exists language text
    constraint posts_language_check check (language in ('en', 'ja'));

grant insert (language) on public.posts to authenticated;
grant update (language) on public.posts to authenticated;

-- ---------------------------------------------------------------------------
-- groups: an optional category and language for discovery.
-- ---------------------------------------------------------------------------

alter table public.groups
  add column if not exists category text
    constraint groups_category_check
      check (category in ('doubles', 'singles', 'team_building', 'regional')),
  add column if not exists language text
    constraint groups_language_check check (language in ('en', 'ja'));

grant insert (category, language) on public.groups to authenticated;
grant update (category, language) on public.groups to authenticated;

-- The feed read model exposes the post language to the feed filter.
-- `language` must be the LAST column: create or replace can only append
-- columns to a view, never insert one mid-list (42P16).
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
  posts.group_id,
  posts.language
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

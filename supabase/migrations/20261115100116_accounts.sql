-- Accounts: public profiles, team format and sharing flag.
-- The limits here mirror `src/lib/auth/validation.ts`; change both together.
-- `src/lib/database.types.ts` is hand-written from the migrations.

-- ---------------------------------------------------------------------------
-- Profiles: one row per auth user, readable by everyone.
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null
    constraint profiles_username_key unique
    constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text
    constraint profiles_display_name_length check (char_length(display_name) <= 40),
  avatar_species text
    constraint profiles_avatar_species_length check (char_length(avatar_species) <= 60),
  bio text
    constraint profiles_bio_length check (char_length(bio) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Rows are created by the trigger below, never through the API, and only the
-- four profile fields can be changed.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant update (username, display_name, avatar_species, bio)
  on public.profiles to authenticated;

create policy "profiles are public" on public.profiles
  for select
  to anon, authenticated
  using (true);

create policy "update own profile" on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Every new auth user gets a profile with a placeholder username
-- ("trainer_" plus ten hex characters), which they can change afterwards.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  for attempt in 1..5 loop
    begin
      insert into public.profiles (id, username)
      values (
        new.id,
        'trainer_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)
      );
      return new;
    exception when unique_violation then
      -- The random username was taken: try another.
    end;
  end loop;
  raise exception 'Could not allocate a username for the new account';
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Accounts that signed up before this migration.
insert into public.profiles (id, username)
select id, 'trainer_' || substr(replace(id::text, '-', ''), 1, 10)
from auth.users
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Teams: format, and a flag that makes a team readable by everyone.
-- ---------------------------------------------------------------------------

alter table public.teams
  add column format text not null default 'doubles'
    constraint teams_format_check check (format in ('singles', 'doubles')),
  add column is_public boolean not null default false,
  add constraint teams_data_is_team check (
    jsonb_typeof(data) = 'array' and jsonb_array_length(data) <= 6
  );

create index teams_user_id_idx on public.teams (user_id);

create policy "public teams are readable" on public.teams
  for select
  to anon, authenticated
  using (is_public);

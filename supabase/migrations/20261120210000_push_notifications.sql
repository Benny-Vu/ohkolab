-- Push notifications: device tokens, per-user push settings, and the
-- bookkeeping the send-push Edge Function needs (supabase/functions/
-- send-push, deployed separately, never by this migration).
--
-- Delivery is best-effort and opt-in per device:
--   - the triggers on notifications and messages call the Edge Function
--     through pg_net ONLY when public.push_config carries its URL — in
--     local development and CI the URL is null and the triggers are
--     silent, so no environment posts anywhere by accident;
--   - a push never fails the insert it came from: the webhook call is
--     dynamic and wrapped in an exception handler;
--   - the function claims rows with claim_push_batch()/claim_push_
--     messages(), so a burst of likes becomes one push (one push per
--     recipient per minute); rows that arrive inside the cooldown ride
--     along with the next claim.
--
-- Idempotent like the rest of supabase/migrations: `if not exists` for
-- tables and indexes, `create or replace` for functions, policies and
-- triggers created inside do-blocks, `alter policy` never used to drop.

-- ---------------------------------------------------------------------------
-- push_tokens: one row per registered device token. A token identifies
-- one DEVICE, not one user, so registration goes through the
-- register_push_token() security-definer function below, which takes the
-- token over from whoever held it (a shared or resold device must not
-- keep pushing the previous user's notifications). Clients can read and
-- delete their own rows; every other write path is closed. Deleting an
-- account cascades the tokens away.
-- ---------------------------------------------------------------------------

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- The FCM registration token. Long (150-255 characters typically).
  token text not null
    constraint push_tokens_token_shape check (char_length(token) between 1 and 1024),
  -- 'android' today; 'ios' and 'web' are reserved for those builds.
  platform text not null default 'android'
    constraint push_tokens_platform_check check (platform in ('android', 'ios', 'web')),
  created_at timestamptz not null default now(),
  -- Refreshed on every registration event (FCM rotates tokens).
  last_seen_at timestamptz not null default now(),
  constraint push_tokens_token_key unique (token)
);

alter table public.push_tokens enable row level security;

revoke all on public.push_tokens from anon, authenticated;
-- Select and delete only: rows are created by register_push_token().
grant select, delete on public.push_tokens to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'push_tokens'
      and policyname = 'users read their own push tokens'
  ) then
    create policy "users read their own push tokens" on public.push_tokens
      for select
      to authenticated
      using (user_id = (select auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'push_tokens'
      and policyname = 'users remove their own push tokens'
  ) then
    create policy "users remove their own push tokens" on public.push_tokens
      for delete
      to authenticated
      using (user_id = (select auth.uid()));
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- register_push_token: the one write path for push_tokens, callable by
-- signed-in users only. It deletes any existing row for the token (whoever
-- held it — a shared or resold device changes hands) and inserts a fresh
-- row for the caller, so the previous owner's pushes stop reaching the
-- device immediately.
-- ---------------------------------------------------------------------------

create or replace function public.register_push_token(
  p_token text,
  p_platform text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'register_push_token requires a signed-in user'
      using errcode = '42501';
  end if;
  if p_token is null or char_length(p_token) not between 1 and 1024 then
    raise exception 'Invalid push token'
      using errcode = '23514';
  end if;
  if p_platform not in ('android', 'ios', 'web') then
    raise exception 'Invalid push token platform'
      using errcode = '23514';
  end if;
  delete from public.push_tokens where token = p_token;
  insert into public.push_tokens (user_id, token, platform)
  values (v_user, p_token, p_platform);
end;
$$;

revoke execute on function public.register_push_token(text, text)
  from public, anon, authenticated;
grant execute on function public.register_push_token(text, text)
  to authenticated;

-- A user's tokens (the account-deletion cascade and the send lookups).
create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

-- ---------------------------------------------------------------------------
-- push_settings: per-user push settings, one row per user. A missing row
-- means "everything on" (the defaults), so users get pushes before they
-- ever open a settings screen. Users read and write only their own row.
-- ---------------------------------------------------------------------------

create table if not exists public.push_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  -- The master switch. Off stops every push.
  enabled boolean not null default true,
  -- Per-kind switches, all on by default. Moderation and appeal
  -- notifications never push; they have no switch.
  likes boolean not null default true,
  comments boolean not null default true,
  follows boolean not null default true,
  groups boolean not null default true,
  messages boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_settings enable row level security;

revoke all on public.push_settings from anon, authenticated;
-- No delete grant: rows go away only with the account.
grant select, insert, update on public.push_settings to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'push_settings'
      and policyname = 'users read their push settings'
  ) then
    create policy "users read their push settings" on public.push_settings
      for select
      to authenticated
      using (user_id = (select auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'push_settings'
      and policyname = 'users create their push settings'
  ) then
    create policy "users create their push settings" on public.push_settings
      for insert
      to authenticated
      with check (user_id = (select auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'push_settings'
      and policyname = 'users update their push settings'
  ) then
    create policy "users update their push settings" on public.push_settings
      for update
      to authenticated
      using (user_id = (select auth.uid()))
      with check (user_id = (select auth.uid()));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.push_settings'::regclass
      and tgname = 'push_settings_set_updated_at'
  ) then
    create trigger push_settings_set_updated_at
      before update on public.push_settings
      for each row execute function public.set_updated_at();
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- push_config: the single row telling the triggers where the send-push
-- Edge Function lives (https://<ref>.supabase.co/functions/v1/send-push)
-- and the shared secret it demands. Only the service role and this
-- migration's triggers ever read it; clients get no grants and RLS has
-- no policies, so the Data API exposes nothing. In local development and
-- CI the table stays empty and the triggers do nothing.
-- ---------------------------------------------------------------------------

create table if not exists public.push_config (
  id boolean primary key default true
    constraint push_config_single_row check (id),
  -- Null until the owner configures delivery: then the triggers call it.
  function_url text
    constraint push_config_url_shape check (function_url is null or function_url ~ '^https://'),
  -- Sent as x-webhook-key; the Edge Function compares it with its
  -- PUSH_WEBHOOK_KEY secret. Null disables delivery too.
  webhook_secret text
);

alter table public.push_config enable row level security;

revoke all on public.push_config from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Push bookkeeping on the two source tables. pushed_at is null until the
-- send-push Edge Function claims the row; no client grant touches it.
-- ---------------------------------------------------------------------------

alter table public.notifications
  add column if not exists pushed_at timestamptz;

alter table public.messages
  add column if not exists pushed_at timestamptz;

-- The send-push claims: everything unpushed for one recipient.
create index if not exists notifications_unpushed_idx
  on public.notifications (recipient_id)
  where pushed_at is null;
create index if not exists messages_unpushed_idx
  on public.messages (conversation_id)
  where pushed_at is null;

-- ---------------------------------------------------------------------------
-- The claim functions the Edge Function calls (service role only). They
-- claim every unpushed row for one recipient in one statement, so bursts
-- collapse into one push, and enforce the one-minute per-recipient
-- cooldown: rows arriving inside it stay unpushed and ride with the next
-- claim.
-- ---------------------------------------------------------------------------

create or replace function public.claim_push_batch(p_recipient uuid)
returns table (
  id uuid,
  type text,
  actor_id uuid,
  post_id uuid,
  group_id uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.notifications
    where recipient_id = p_recipient
      and pushed_at > now() - interval '60 seconds'
  ) then
    return;
  end if;
  return query
  with claim as (
    update public.notifications
    set pushed_at = now()
    where recipient_id = p_recipient
      and pushed_at is null
      -- Moderation and appeal notifications never push; leave them
      -- unclaimed so they cannot ride along with a push either.
      and type in ('like', 'comment', 'follow', 'group_invite')
    returning *
  )
  select claim.id, claim.type, claim.actor_id, claim.post_id, claim.group_id, claim.created_at
  from claim
  order by claim.created_at desc;
end;
$$;

create or replace function public.claim_push_messages(p_recipient uuid)
returns table (
  id uuid,
  conversation_id uuid,
  sender_id uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.messages m
    join public.conversation_participants cp on cp.conversation_id = m.conversation_id
    where cp.user_id = p_recipient
      and m.pushed_at > now() - interval '60 seconds'
  ) then
    return;
  end if;
  return query
  with claim as (
    update public.messages m
    set pushed_at = now()
    from public.conversation_participants cp
    where cp.conversation_id = m.conversation_id
      and cp.user_id = p_recipient
      and m.pushed_at is null
      and m.sender_id <> p_recipient
      and m.deleted_at is null
    returning m.id, m.conversation_id, m.sender_id, m.created_at
  )
  select claim.id, claim.conversation_id, claim.sender_id, claim.created_at
  from claim
  order by claim.created_at desc;
end;
$$;

revoke execute on function public.claim_push_batch(uuid) from public, anon, authenticated;
revoke execute on function public.claim_push_messages(uuid) from public, anon, authenticated;
grant execute on function public.claim_push_batch(uuid) to service_role;
grant execute on function public.claim_push_messages(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- The webhook triggers. One function serves both tables: the Edge Function
-- resolves the row from {table, id}. The pg_net call is dynamic (so the
-- migration never depends on pg_net's exact signature) and any failure is
-- swallowed: a push must never break the insert it announces.
-- ---------------------------------------------------------------------------

create or replace function public.call_push_webhook()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select function_url, webhook_secret into v_url, v_secret
  from public.push_config
  where id = true;

  -- No URL (local development and CI) or no secret: push delivery is not
  -- configured. The notification still lands; only the push is skipped.
  if v_url is null or v_url = '' or v_secret is null or v_secret = '' then
    return new;
  end if;

  begin
    execute format(
      'select net.http_post(url := %L, body := %L::jsonb, headers := %L::jsonb)',
      v_url,
      jsonb_build_object('table', tg_table_name, 'id', new.id)::text,
      jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-key', v_secret
      )::text
    );
  exception when others then
    -- pg_net missing, or its signature differs here. Best-effort only.
    null;
  end;
  return new;
end;
$$;

revoke execute on function public.call_push_webhook() from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.notifications'::regclass
      and tgname = 'notifications_call_push_webhook'
  ) then
    create trigger notifications_call_push_webhook
      after insert on public.notifications
      for each row execute function public.call_push_webhook();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.messages'::regclass
      and tgname = 'messages_call_push_webhook'
  ) then
    create trigger messages_call_push_webhook
      after insert on public.messages
      for each row execute function public.call_push_webhook();
  end if;
end;
$$;

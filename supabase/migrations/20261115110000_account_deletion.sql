-- Account deletion. Applied to the live project on 2026-11-15 by the owner
-- through the Supabase SQL editor, because the Supabase connector refuses a
-- function body that contains a `delete`. The editor does not record it in
-- the migration history, so this file's version is only a placeholder.

-- ---------------------------------------------------------------------------
-- Account deletion: removes the caller's auth user; profiles and teams go
-- with it through their foreign keys.
-- ---------------------------------------------------------------------------

create function public.delete_own_account()
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
  delete from auth.users where id = caller;
end;
$$;

revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

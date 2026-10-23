-- Admins can permanently delete an agent applicant (e.g. a license that can't be verified). Safe to re-run.
-- Deletes the sign-in account; the agent profile, listings and API keys go with it (on delete cascade).
-- Admin accounts can't be deleted this way, and you can't delete yourself.

create or replace function public.admin_delete_agent(target uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  target_email text;
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;
  if target = auth.uid() then
    raise exception 'You can''t delete your own account.' using errcode = '42501';
  end if;
  select email into target_email from auth.users where id = target;
  if target_email is null then
    raise exception 'Agent not found.' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.admins where lower(email) = lower(target_email)) then
    raise exception 'Admin accounts can''t be deleted here.' using errcode = '42501';
  end if;
  delete from auth.users where id = target;
end $$;

revoke all on function public.admin_delete_agent(uuid) from public, anon;
grant execute on function public.admin_delete_agent(uuid) to authenticated;

notify pgrst, 'reload schema';

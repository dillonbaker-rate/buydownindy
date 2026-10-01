-- Let the Supabase SQL editor (database owner) change verification, then mark the super admin verified.
-- Agents still can't verify themselves through the app. Safe to re-run.

create or replace function public.agents_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Admins (via the app), the service key, and the database owner (SQL editor) may change verification.
  if not public.is_admin()
     and coalesce(auth.role(), '') <> 'service_role'
     and session_user not in ('postgres', 'supabase_admin') then
    if tg_op = 'INSERT' then
      new.verification_status := 'pending';
      new.verified_at := null;
    else
      new.verification_status := old.verification_status;
      new.verified_at := old.verified_at;
      if new.license_number is distinct from old.license_number then
        new.verification_status := 'pending';
        new.verified_at := null;
      end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

update public.agents
set verification_status = 'verified', verified_at = now()
where lower(email) = 'dillon.baker@rate.com';

select name, email, verification_status, verified_at from public.agents where lower(email) = 'dillon.baker@rate.com';

-- Super admin role + a leads inbox (status and notes). Safe to re-run.

-- ── Roles ───────────────────────────────────────────────────────────────
alter table public.admins add column if not exists role text not null default 'admin';
do $$ begin
  alter table public.admins add constraint admins_role_chk check (role in ('admin','super_admin'));
exception when duplicate_object then null; end $$;
insert into public.admins (email, role) values ('dillon.baker@rate.com', 'super_admin')
on conflict (email) do update set role = 'super_admin';

create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')) and role = 'super_admin'
  );
$$;
grant execute on function public.is_super_admin() to anon, authenticated;

-- ── Leads inbox ─────────────────────────────────────────────────────────
alter table public.leads add column if not exists status text not null default 'new';
do $$ begin
  alter table public.leads add constraint leads_status_chk
    check (status in ('new','contacted','qualified','closed','not_a_fit'));
exception when duplicate_object then null; end $$;
alter table public.leads add column if not exists notes text;
alter table public.leads add column if not exists updated_at timestamptz;

-- Only the super admin reads and works leads.
drop policy if exists leads_admin_read on public.leads;
drop policy if exists leads_super_read on public.leads;
create policy leads_super_read on public.leads for select using (public.is_super_admin());
drop policy if exists leads_super_update on public.leads;
create policy leads_super_update on public.leads for update using (public.is_super_admin()) with check (public.is_super_admin());

-- So the inbox can show which agent invited the buyer.
drop policy if exists invites_admin_read on public.client_invites;
create policy invites_admin_read on public.client_invites for select using (public.is_admin());

notify pgrst, 'reload schema';

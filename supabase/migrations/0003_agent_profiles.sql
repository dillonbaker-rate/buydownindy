-- Fuller agent profiles, license verification, admin role, agent photos.
-- Safe to re-run.

-- ── Admins (can verify agents, enter daily rates) ───────────────────────
create table if not exists public.admins (email text primary key);
insert into public.admins (email) values ('dillon.baker@rate.com') on conflict do nothing;
alter table public.admins enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- ── Agent profile fields ────────────────────────────────────────────────
alter table public.agents
  add column if not exists photo_url text,
  add column if not exists team_name text,
  add column if not exists office_phone text,
  add column if not exists office_address text,
  add column if not exists license_number text,
  add column if not exists mls_id text,
  add column if not exists licensed_since integer,
  add column if not exists counties text[] not null default '{}',
  add column if not exists website text,
  add column if not exists instagram text,
  add column if not exists facebook text,
  add column if not exists linkedin text,
  add column if not exists bio text,
  add column if not exists verification_status text not null default 'pending',
  add column if not exists verified_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

do $$ begin
  alter table public.agents add constraint agents_verification_status_chk
    check (verification_status in ('pending','verified','rejected'));
exception when duplicate_object then null; end $$;

-- Agents can't verify themselves: only admins change verification. Editing the license number
-- sends a verified agent back to pending.
create or replace function public.agents_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() and coalesce(auth.role(), '') <> 'service_role' then
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
drop trigger if exists agents_guard on public.agents;
create trigger agents_guard before insert or update on public.agents
  for each row execute function public.agents_guard();

drop policy if exists agents_admin_update on public.agents;
create policy agents_admin_update on public.agents for update using (public.is_admin()) with check (public.is_admin());

-- ── Admin can enter daily rates directly (no service key needed) ────────
drop policy if exists daily_rates_admin_write on public.daily_rates;
create policy daily_rates_admin_write on public.daily_rates for all using (public.is_admin()) with check (public.is_admin());

-- ── Buyers' lender requests can be saved without the service key ─────────
drop policy if exists leads_insert_public on public.leads;
create policy leads_insert_public on public.leads for insert to anon, authenticated with check (consent_at is not null);
drop policy if exists leads_admin_read on public.leads;
create policy leads_admin_read on public.leads for select using (public.is_admin());

-- ── Agent photos ────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('agent-photos', 'agent-photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists agent_photos_insert_own on storage.objects;
create policy agent_photos_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'agent-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists agent_photos_delete_own on storage.objects;
create policy agent_photos_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'agent-photos' and (storage.foldername(name))[1] = auth.uid()::text);

notify pgrst, 'reload schema';

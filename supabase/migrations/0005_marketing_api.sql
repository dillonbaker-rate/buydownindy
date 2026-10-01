-- Agent marketing tools: on/off switch, and API keys for the data API. Safe to re-run.

-- ── App settings (admin-controlled switches) ────────────────────────────
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
drop policy if exists settings_read on public.app_settings;
create policy settings_read on public.app_settings for select using (true);
drop policy if exists settings_admin_write on public.app_settings;
create policy settings_admin_write on public.app_settings for all using (public.is_admin()) with check (public.is_admin());
-- Off until Rate compliance reviews (RESPA Section 8 / Reg Z advertising). Admins can always use the tools.
insert into public.app_settings (key, value) values ('marketing_enabled', 'false'::jsonb) on conflict (key) do nothing;

-- ── API keys (stored hashed; the full key is shown to the agent once) ───
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents (id) on delete cascade,
  name text not null default 'API key',
  prefix text not null,
  key_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index if not exists api_keys_agent_idx on public.api_keys (agent_id);
alter table public.api_keys enable row level security;
drop policy if exists api_keys_own_read on public.api_keys;
create policy api_keys_own_read on public.api_keys for select using (agent_id = auth.uid());
drop policy if exists api_keys_own_insert on public.api_keys;
create policy api_keys_own_insert on public.api_keys for insert with check (agent_id = auth.uid());
drop policy if exists api_keys_own_update on public.api_keys;
create policy api_keys_own_update on public.api_keys for update using (agent_id = auth.uid()) with check (agent_id = auth.uid());

-- Check a key (by its SHA-256 hash) without exposing the table. Returns the agent and whether they may use it.
create or replace function public.verify_api_key(p_hash text)
returns table (agent_id uuid, agent_email text, verified boolean, is_admin boolean)
language plpgsql security definer set search_path = public as $$
begin
  update public.api_keys set last_used_at = now() where key_hash = p_hash and revoked_at is null;
  return query
    select a.id, a.email, a.verification_status = 'verified',
           exists (select 1 from public.admins ad where lower(ad.email) = lower(a.email))
    from public.api_keys k join public.agents a on a.id = k.agent_id
    where k.key_hash = p_hash and k.revoked_at is null;
end $$;
revoke all on function public.verify_api_key(text) from public;
grant execute on function public.verify_api_key(text) to anon, authenticated;

notify pgrst, 'reload schema';

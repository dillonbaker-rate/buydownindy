-- Agent profiles prepared ahead of time by an admin (or Grok), keyed by the agent's email. Safe to re-run.
-- When that agent signs up with the same email, the profile form opens already filled in; they check it, add a
-- headshot and save. If the admin marked the license verified and the agent keeps the same license number, the
-- profile is verified on save (done by the server with the service key, which agents_guard allows).

create table if not exists public.agent_prefills (
  email text primary key check (email = lower(email)),
  name text,
  brokerage text,
  phone text,
  team_name text,
  office_phone text,
  office_address text,
  license_number text,
  mls_id text,
  licensed_since integer,
  counties text[] not null default '{}',
  website text,
  instagram text,
  facebook text,
  linkedin text,
  bio text,
  license_verified boolean not null default false,
  -- Admin-only: where the details came from (e.g. Grok's sources). Never shown to the agent.
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  used_at timestamptz
);

alter table public.agent_prefills enable row level security;
drop policy if exists agent_prefills_admin on public.agent_prefills;
create policy agent_prefills_admin on public.agent_prefills for all using (public.is_admin()) with check (public.is_admin());

-- The signed-in agent's own prepared profile (matched on sign-in email), without the admin notes.
create or replace function public.my_prefill() returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(p) - 'notes'
  from public.agent_prefills p
  where p.email = lower(coalesce(auth.jwt() ->> 'email', '')) and p.used_at is null;
$$;
revoke all on function public.my_prefill() from public, anon;
grant execute on function public.my_prefill() to authenticated;

notify pgrst, 'reload schema';

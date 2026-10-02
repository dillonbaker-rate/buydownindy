-- Permanent log of Agent Terms acceptances (who, which version, when).
create table if not exists public.agent_terms_acceptances (
  id bigint generated always as identity primary key,
  agent_id uuid not null,
  email text,
  version text not null,
  accepted_at timestamptz not null default now(),
  user_agent text
);
alter table public.agent_terms_acceptances enable row level security;
drop policy if exists terms_log_insert_own on public.agent_terms_acceptances;
create policy terms_log_insert_own on public.agent_terms_acceptances for insert to authenticated with check (agent_id = auth.uid());
drop policy if exists terms_log_admin_read on public.agent_terms_acceptances;
create policy terms_log_admin_read on public.agent_terms_acceptances for select using (public.is_admin());

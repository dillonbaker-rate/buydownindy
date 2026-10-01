-- Agents invite their buyer clients to the search with a personal link (/i/<code>).
-- Safe to re-run.

create table if not exists public.client_invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  agent_id uuid not null references public.agents (id) on delete cascade,
  client_name text not null,
  client_email text,
  client_phone text,
  open_count integer not null default 0,
  last_opened_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists client_invites_agent_idx on public.client_invites (agent_id);

alter table public.client_invites enable row level security;
drop policy if exists invites_select_own on public.client_invites;
create policy invites_select_own on public.client_invites for select using (agent_id = auth.uid());
drop policy if exists invites_insert_own on public.client_invites;
create policy invites_insert_own on public.client_invites for insert with check (agent_id = auth.uid());
drop policy if exists invites_delete_own on public.client_invites;
create policy invites_delete_own on public.client_invites for delete using (agent_id = auth.uid());

-- Public lookup by code without exposing the client's contact info. Optionally counts the open.
create or replace function public.open_invite(p_code text, p_record boolean default true)
returns table (client_first text, agent_name text, brokerage text, agent_phone text, agent_email text)
language plpgsql security definer set search_path = public as $$
begin
  if p_record then
    update public.client_invites set open_count = open_count + 1, last_opened_at = now() where code = p_code;
  end if;
  return query
    select split_part(i.client_name, ' ', 1), a.name, a.brokerage, a.phone, a.email
    from public.client_invites i join public.agents a on a.id = i.agent_id
    where i.code = p_code;
end $$;
revoke all on function public.open_invite(text, boolean) from public;
grant execute on function public.open_invite(text, boolean) to anon, authenticated;

-- Leads remember which agent invite (if any) the buyer came from.
alter table public.leads add column if not exists invite_code text;

notify pgrst, 'reload schema';

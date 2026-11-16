-- The agent's name for a sent hidden listing, so the email greets them by first name. Safe to re-run.

alter table public.listings add column if not exists handoff_name text;

-- Agents' example views must keep hiding who a listing was sent to, now including the name.
create or replace function public.example_listings() returns setof jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(l) - array['handoff_email', 'handoff_name', 'handoff_token', 'handoff_sent_at', 'handoff_claimed_at', 'agent_id']
  from public.listings l
  where l.status = 'draft'
    and exists (select 1 from public.agents a where a.id = auth.uid())
  order by l.created_at desc;
$$;
revoke all on function public.example_listings() from public, anon;
grant execute on function public.example_listings() to authenticated;

create or replace function public.example_listing(listing_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(l) - array['handoff_email', 'handoff_name', 'handoff_token', 'handoff_sent_at', 'handoff_claimed_at', 'agent_id']
  from public.listings l
  where l.id = listing_id and l.status = 'draft'
    and exists (select 1 from public.agents a where a.id = auth.uid());
$$;
revoke all on function public.example_listing(uuid) from public, anon;
grant execute on function public.example_listing(uuid) to authenticated;

notify pgrst, 'reload schema';

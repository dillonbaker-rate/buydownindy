-- Hidden listings as examples for agents. Safe to re-run.
-- Any signed-in agent (has an agent profile) can browse hidden listings to see how BuyDown Indy presents a
-- concession and which homes are being worked. Private fields are removed: who it was sent to, the private
-- claim link, and which account owns it. Admins already read everything (migration 0010).

create or replace function public.example_listings() returns setof jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(l) - array['handoff_email', 'handoff_token', 'handoff_sent_at', 'handoff_claimed_at', 'agent_id']
  from public.listings l
  where l.status = 'draft'
    and exists (select 1 from public.agents a where a.id = auth.uid())
  order by l.created_at desc;
$$;
revoke all on function public.example_listings() from public, anon;
grant execute on function public.example_listings() to authenticated;

create or replace function public.example_listing(listing_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(l) - array['handoff_email', 'handoff_token', 'handoff_sent_at', 'handoff_claimed_at', 'agent_id']
  from public.listings l
  where l.id = listing_id and l.status = 'draft'
    and exists (select 1 from public.agents a where a.id = auth.uid());
$$;
revoke all on function public.example_listing(uuid) from public, anon;
grant execute on function public.example_listing(uuid) to authenticated;

notify pgrst, 'reload schema';

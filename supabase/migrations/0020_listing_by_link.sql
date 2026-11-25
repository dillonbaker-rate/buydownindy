-- Anyone with a listing's link can open it: hidden (draft), expired, pending and sold listings included, signed in
-- or not. Listing ids are random UUIDs, so only people who were given the link can find one; the map and search
-- still show only live, unexpired listings. The private claim token is never returned. Safe to re-run.

create or replace function public.listing_by_link(listing_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select (to_jsonb(l) - array['handoff_token']) || jsonb_build_object('agent', (
    select jsonb_build_object('name', a.name, 'brokerage', a.brokerage, 'email', a.email, 'phone', a.phone,
                              'photo_url', a.photo_url, 'verification_status', a.verification_status)
    from public.agents a where a.id = l.agent_id))
  from public.listings l
  where l.id = listing_id;
$$;
revoke all on function public.listing_by_link(uuid) from public;
grant execute on function public.listing_by_link(uuid) to anon, authenticated;

notify pgrst, 'reload schema';

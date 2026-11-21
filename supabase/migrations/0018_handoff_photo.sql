-- A headshot the admin adds to a hidden listing for the agent it's built for. Shown on that listing's flyers,
-- offered as their profile photo when they sign up, and copied to their profile when they claim the listing
-- (only if they don't have a photo yet). Safe to re-run.

alter table public.listings add column if not exists handoff_photo_url text;

-- Agents' example views keep hiding who a listing was sent to, now including the headshot.
create or replace function public.example_listings() returns setof jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(l) - array['handoff_email', 'handoff_name', 'handoff_photo_url', 'handoff_token', 'handoff_sent_at', 'handoff_claimed_at', 'agent_id']
  from public.listings l
  where l.status = 'draft'
    and exists (select 1 from public.agents a where a.id = auth.uid())
  order by l.created_at desc;
$$;
revoke all on function public.example_listings() from public, anon;
grant execute on function public.example_listings() to authenticated;

create or replace function public.example_listing(listing_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(l) - array['handoff_email', 'handoff_name', 'handoff_photo_url', 'handoff_token', 'handoff_sent_at', 'handoff_claimed_at', 'agent_id']
  from public.listings l
  where l.id = listing_id and l.status = 'draft'
    and exists (select 1 from public.agents a where a.id = auth.uid());
$$;
revoke all on function public.example_listing(uuid) from public, anon;
grant execute on function public.example_listing(uuid) to authenticated;

-- Hidden listings waiting for the signed-in agent, now with the headshot (offered on their new profile).
drop function if exists public.my_handoffs();
create function public.my_handoffs() returns table (token text, address text, city text, photo_url text)
language sql stable security definer set search_path = public as $$
  select l.handoff_token, l.address, l.city, l.handoff_photo_url from public.listings l
  where l.status = 'draft' and l.handoff_token is not null
    and lower(l.handoff_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  order by l.handoff_sent_at desc nulls last;
$$;
revoke all on function public.my_handoffs() from public, anon;
grant execute on function public.my_handoffs() to authenticated;

-- Claiming also gives the agent the headshot if their profile has none.
create or replace function public.claim_listing(t text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  l public.listings;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.' using errcode = '28000';
  end if;
  select * into l from public.listings where handoff_token = t and status = 'draft' for update;
  if not found then
    raise exception 'This listing link has already been used or was turned off.' using errcode = 'P0002';
  end if;
  if l.handoff_email is not null and lower(l.handoff_email) <> lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'This listing was sent to %. Sign in with that email to take it live.', l.handoff_email using errcode = '42501';
  end if;
  if not exists (select 1 from public.agents where id = auth.uid()) then
    raise exception 'Finish your agent profile first.' using errcode = '42501';
  end if;
  update public.listings
  set agent_id = auth.uid(), status = 'live', expires_at = now() + interval '30 days',
      photo_rights_confirmed = true, handoff_token = null, handoff_claimed_at = now()
  where id = l.id;
  if l.handoff_photo_url is not null then
    update public.agents set photo_url = l.handoff_photo_url
    where id = auth.uid() and (photo_url is null or photo_url = '');
  end if;
  return l.id;
end $$;
revoke all on function public.claim_listing(text) from public, anon;
grant execute on function public.claim_listing(text) to authenticated;

notify pgrst, 'reload schema';

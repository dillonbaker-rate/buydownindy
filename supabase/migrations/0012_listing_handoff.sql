-- Hidden listings an admin prepares and hands off to an agent. Safe to re-run.
-- status 'draft' = hidden: not on the map, not readable by the public (the read policy only allows 'live').
-- The admin sends a private link (handoff_token) to one agent email; that agent claims it, which moves the
-- listing to their account and puts it live.

alter table public.listings drop constraint if exists listings_status_check;
alter table public.listings add constraint listings_status_check check (status in ('live', 'pending', 'sold', 'draft'));

alter table public.listings
  add column if not exists handoff_email text,
  add column if not exists handoff_token text unique,
  add column if not exists handoff_sent_at timestamptz,
  add column if not exists handoff_claimed_at timestamptz;

-- The private preview: anyone holding the link can see that one hidden listing.
create or replace function public.listing_by_handoff(t text) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(l) from public.listings l
  where t is not null and length(t) >= 20 and l.handoff_token = t and l.status = 'draft';
$$;
grant execute on function public.listing_by_handoff(text) to anon, authenticated;

-- Hidden listings waiting for the signed-in agent (matched on their sign-in email).
create or replace function public.my_handoffs() returns table (token text, address text, city text)
language sql stable security definer set search_path = public as $$
  select l.handoff_token, l.address, l.city from public.listings l
  where l.status = 'draft' and l.handoff_token is not null
    and lower(l.handoff_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  order by l.handoff_sent_at desc nulls last;
$$;
revoke all on function public.my_handoffs() from public, anon;
grant execute on function public.my_handoffs() to authenticated;

-- The agent takes the listing: it moves to their account and goes live for 30 days.
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
  return l.id;
end $$;
revoke all on function public.claim_listing(text) from public, anon;
grant execute on function public.claim_listing(text) to authenticated;

notify pgrst, 'reload schema';

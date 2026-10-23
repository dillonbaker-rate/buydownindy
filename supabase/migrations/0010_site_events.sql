-- Admin Metrics page: anonymous usage counts (calculator use, no personal data) and admin read access to all listings. Safe to re-run.

create table if not exists public.site_events (
  id bigint generated always as identity primary key,
  name text not null check (name in ('calc_payment', 'calc_buydown')),
  created_at timestamptz not null default now()
);
create index if not exists site_events_name_time_idx on public.site_events (name, created_at);

alter table public.site_events enable row level security;
-- Anyone may record an event (only the allowed names); only admins read them.
drop policy if exists site_events_insert on public.site_events;
create policy site_events_insert on public.site_events for insert to anon, authenticated
  with check (name in ('calc_payment', 'calc_buydown'));
drop policy if exists site_events_admin_read on public.site_events;
create policy site_events_admin_read on public.site_events for select using (public.is_admin());

-- Metrics also count sold / pending / expired listings, which the public policy hides.
drop policy if exists listings_admin_read on public.listings;
create policy listings_admin_read on public.listings for select using (public.is_admin());

notify pgrst, 'reload schema';

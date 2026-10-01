-- BuyDown Indy schema: agents, listings, leads, rate snapshots, photo storage.
-- Run in the Supabase SQL editor (or `supabase db push`). Safe to re-run.

create extension if not exists pgcrypto;

-- ── Agents ────────────────────────────────────────────────────────────────
-- One row per signed-in seller's agent. id = auth.users.id.
create table if not exists public.agents (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  brokerage text not null,
  email text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

-- ── Listings ──────────────────────────────────────────────────────────────
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.agents (id) on delete cascade,
  address text not null,
  city text not null,
  county text not null,
  zip text,
  lat double precision not null,
  lng double precision not null,
  price integer not null check (price > 0),
  beds numeric(4,1) not null check (beds > 0),
  baths numeric(4,1) not null check (baths > 0),
  sqft integer not null check (sqft > 0),
  concession integer not null check (concession > 0),
  loan_types text[] not null check (cardinality(loan_types) > 0 and loan_types <@ array['Conventional','FHA','VA']),
  default_down_pct numeric(4,1) not null default 5,
  taxes_yr integer,
  insurance_yr integer,
  hoa_mo integer,
  built_year integer,
  photos jsonb not null default '[]'::jsonb check (jsonb_array_length(photos) <= 7),
  external_url text,
  status text not null default 'live' check (status in ('live','pending','sold')),
  expires_at timestamptz not null default now() + interval '30 days',
  photo_rights_confirmed boolean not null default false,
  is_sample boolean not null default false,
  is_example boolean not null default false,
  -- Sample rows have no agent account; these name the placeholder agent.
  sample_agent_name text,
  sample_brokerage text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists listings_live_idx on public.listings (status, expires_at);
create index if not exists listings_agent_idx on public.listings (agent_id);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists listings_touch on public.listings;
create trigger listings_touch before update on public.listings
  for each row execute function public.touch_updated_at();

-- ── Lender leads ─────────────────────────────────────────────────────────
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings (id) on delete set null,
  listing_label text,           -- address snapshot (sample listings have no uuid)
  name text not null,
  email text not null,
  phone text not null,
  message text,
  consent_at timestamptz not null,
  consent_text text not null,   -- exact wording the buyer agreed to
  user_agent text,
  created_at timestamptz not null default now()
);

-- ── Weekly rate (Freddie Mac PMMS) ───────────────────────────────────────
create table if not exists public.rate_snapshots (
  week_of date primary key,
  rate_30yr numeric(5,3) not null,
  source text not null default 'Freddie Mac PMMS',
  created_at timestamptz not null default now()
);

-- ── Row-level security ───────────────────────────────────────────────────
alter table public.agents enable row level security;
alter table public.listings enable row level security;
alter table public.leads enable row level security;
alter table public.rate_snapshots enable row level security;

-- Agents: public can read (listing pages show the listing agent's contact); agents manage their own row.
drop policy if exists agents_read on public.agents;
create policy agents_read on public.agents for select using (true);
drop policy if exists agents_insert_self on public.agents;
create policy agents_insert_self on public.agents for insert with check (auth.uid() = id);
drop policy if exists agents_update_self on public.agents;
create policy agents_update_self on public.agents for update using (auth.uid() = id) with check (auth.uid() = id);

-- Listings: anyone sees live, unexpired listings; agents see and manage all of their own.
drop policy if exists listings_public_read on public.listings;
create policy listings_public_read on public.listings for select
  using ((status = 'live' and expires_at > now()) or agent_id = auth.uid());
drop policy if exists listings_insert_own on public.listings;
create policy listings_insert_own on public.listings for insert
  with check (agent_id = auth.uid() and is_sample = false and photo_rights_confirmed);
drop policy if exists listings_update_own on public.listings;
create policy listings_update_own on public.listings for update
  using (agent_id = auth.uid()) with check (agent_id = auth.uid() and is_sample = false);
drop policy if exists listings_delete_own on public.listings;
create policy listings_delete_own on public.listings for delete using (agent_id = auth.uid());

-- Leads: written only by the server (service role). No public read.
-- Rate snapshots: public read, written only by the cron job (service role).
drop policy if exists rates_read on public.rate_snapshots;
create policy rates_read on public.rate_snapshots for select using (true);

-- ── Photo storage ────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-photos', 'listing-photos', true, 10485760, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;

-- Agents upload into a folder named after their user id: {uid}/{file}
drop policy if exists photos_insert_own on storage.objects;
create policy photos_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists photos_delete_own on storage.objects;
create policy photos_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── Daily rates entered by Dillon (Rate's 30-yr fixed by program) ─────────
-- If no row exists for today (Indianapolis time) the site falls back to Freddie Mac PMMS.
create table if not exists public.daily_rates (
  rate_date date primary key,
  conventional numeric(5,3) not null check (conventional between 1 and 20),
  fha numeric(5,3) not null check (fha between 1 and 20),
  va numeric(5,3) not null check (va between 1 and 20),
  entered_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.daily_rates enable row level security;
drop policy if exists daily_rates_read on public.daily_rates;
create policy daily_rates_read on public.daily_rates for select using (true);
-- Writes go through /api/rates (admin check + service role).

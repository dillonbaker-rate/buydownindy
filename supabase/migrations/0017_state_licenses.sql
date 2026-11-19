-- Indiana real estate licensee list (monthly bulk download from the Professional Licensing Agency), used to verify
-- agents automatically when their license number, name, status and expiration match. Safe to re-run.

create table if not exists public.state_licenses (
  license_number text primary key,      -- normalized: uppercase, no spaces or dashes
  first_name text,
  last_name text,
  full_name text,
  license_type text,
  status text,
  expires_on date,
  city text,
  batch text not null,                  -- the import that last saw this license
  imported_at timestamptz not null default now()
);

create table if not exists public.state_license_imports (
  id text primary key,
  file_name text,
  rows integer not null default 0,
  agents_verified integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

alter table public.state_licenses enable row level security;
alter table public.state_license_imports enable row level security;
drop policy if exists state_licenses_admin on public.state_licenses;
create policy state_licenses_admin on public.state_licenses for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists state_license_imports_admin on public.state_license_imports;
create policy state_license_imports_admin on public.state_license_imports for all using (public.is_admin()) with check (public.is_admin());

notify pgrst, 'reload schema';

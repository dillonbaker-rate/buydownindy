-- Agent Terms acceptance: which version each agent accepted, and when.
alter table public.agents add column if not exists terms_version text;
alter table public.agents add column if not exists terms_accepted_at timestamptz;

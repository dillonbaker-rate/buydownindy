-- A copy of every email the site sends, for the admin Emails page. Safe to re-run.
-- Written by the server with the service key; only the super admin can read it (lead emails carry buyer contact info).

create table if not exists public.email_log (
  id bigint generated always as identity primary key,
  kind text not null,
  to_addresses text[] not null,
  reply_to text,
  subject text not null,
  html text not null,
  text_body text,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  resend_id text,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists email_log_created_idx on public.email_log (created_at desc);

alter table public.email_log enable row level security;
drop policy if exists email_log_super_read on public.email_log;
create policy email_log_super_read on public.email_log for select using (public.is_super_admin());

notify pgrst, 'reload schema';

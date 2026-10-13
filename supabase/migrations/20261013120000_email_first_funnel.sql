-- Email-first funnel (gtm-roast-20).
-- roast_leads: an anonymous visitor who gives an email to get the full report.
-- No RLS policies on purpose: only the service role (capture-lead,
-- get-anonymous-roast, create-checkout) reads or writes it.
create table if not exists public.roast_leads (
  id uuid primary key default gen_random_uuid(),
  anonymous_roast_id uuid references public.anonymous_roasts(id) on delete set null,
  url text not null,
  email text not null,
  token text not null unique,
  created_at timestamptz not null default now(),
  unique (anonymous_roast_id, email)
);
alter table public.roast_leads enable row level security;
create index if not exists roast_leads_email_idx on public.roast_leads (lower(email));

-- Purchases without an account: who paid and for which anonymous roast.
alter table public.purchases add column if not exists anonymous_roast_id uuid
  references public.anonymous_roasts(id) on delete set null;
alter table public.purchases add column if not exists email text;
-- Already nullable in production (checked 2026-10-13); stated so a fresh
-- database accepts anonymous purchases too.
alter table public.purchases alter column user_id drop not null;

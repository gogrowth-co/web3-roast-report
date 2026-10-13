-- When analysis started, so analyze-web3 can tell a live run from one the
-- edge runtime killed mid-way (gtm-roast-21). A row stuck on 'processing'
-- past the function time limit is restarted instead of reported as running.
alter table public.roasts add column if not exists processing_started_at timestamptz;
alter table public.anonymous_roasts add column if not exists processing_started_at timestamptz;

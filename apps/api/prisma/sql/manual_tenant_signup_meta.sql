-- Sign up details captured when an account is created: IP address, rough location (Vercel geo headers), device, and where the person came from.
-- Shown on the platform client page and written into the new account alert email. Empty for accounts created before this existed.
alter table public.tenants add column if not exists signup_meta jsonb not null default '{}'::jsonb;

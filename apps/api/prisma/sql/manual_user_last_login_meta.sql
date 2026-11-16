-- Where each user's last successful login came from: IP address, rough location (Vercel geo headers) and device.
-- Shown on the platform client page as the account's last login. Empty until a user next signs in.
alter table public.users add column if not exists last_login_meta jsonb;

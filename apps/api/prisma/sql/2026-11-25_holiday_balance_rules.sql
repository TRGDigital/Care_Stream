-- Holiday balance rules: part days, exceptions and blocked dates (pilot: account CS-1001 only). Adds COLUMNS only; nothing is changed or removed. Safe to run more than once.
-- holiday_days.part: what part of the day is booked: full (the whole shift), am, pm, or part (a number of hours chosen by the person). Existing days stay 'full'.
-- holiday_requests.over_allowance / over_allowance_note: an administrator or manager allowed a booking over the allowance (or past a rule) and wrote why.
-- holiday_settings.blocked_dates: date ranges staff cannot book, each with a reason, for example [{"from":"2026-12-24","to":"2027-01-02","reason":"Christmas week"}].
-- The app reads and writes these with plain SQL, so it keeps working before this is run: until then every day is a full day, nothing is flagged as an exception, and blocked dates cannot be saved.
alter table public.holiday_days     add column if not exists part text not null default 'full';       -- full | am | pm | part
alter table public.holiday_requests add column if not exists over_allowance boolean not null default false;
alter table public.holiday_requests add column if not exists over_allowance_note text;
alter table public.holiday_settings add column if not exists blocked_dates jsonb not null default '[]'::jsonb;

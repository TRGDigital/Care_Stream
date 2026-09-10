-- Agency workers.
--
-- Care providers use agency staff to plug rota gaps. It is expensive, so they avoid it where
-- they can, but avoidance is not always possible. An agency worker is the same kind of person
-- as any other staff member, so this is a flag on the user rather than a separate record: they
-- read policies, answer training and appear in the hub exactly as employed staff do.
--
-- What differs is everything AROUND them:
--
--   * access is time boxed to the booking, and revoked when it ends
--   * their DBS, right to work and registration are held by the AGENCY, not the home, so they
--     must not sit permanently red on the compliance register
--   * they do not receive supervisions or appraisals
--   * they need a local induction (fire exits, the COSHH cupboard, which residents need what),
--     not the full statutory induction they already did with their agency
--   * they do not count toward the plan's staff limit, because they are not the home's staff

alter table users add column if not exists is_agency     boolean not null default false;
alter table users add column if not exists agency_name   text;
-- The booking. agency_end is the access cliff; agency_access_ends_at is the actual moment
-- access is withdrawn, which is later than the end date because of the grace period below.
alter table users add column if not exists agency_start  timestamptz;
alter table users add column if not exists agency_end    timestamptz;
-- Optional. Lets the spend report say what the booking cost, rather than only how long it was.
alter table users add column if not exists agency_day_rate_pence integer;
-- Set when the pre-expiry warning has been sent, so it is sent once per booking rather than
-- every day the job runs. Cleared whenever the end date is extended.
alter table users add column if not exists agency_expiry_warned_at timestamptz;

-- The daily job asks "which agency bookings end soon, or have ended". That is this index.
create index if not exists users_agency_end_idx on users (is_agency, agency_end)
  where is_agency = true;

comment on column users.is_agency is
  'Agency worker: time-boxed access, excluded from compliance chasing, supervisions and plan staff limits.';

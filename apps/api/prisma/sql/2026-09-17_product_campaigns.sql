-- Product email campaigns: training-shop and policy-shop buyers.
--
-- These buyers are not on a CareStream plan, so they cannot use the plan drip's
-- one-enrolment-per-tenant rule: a policy buyer who later takes a licence needs
-- both. The enrolment key becomes (tenant_id, campaign), with the existing plan
-- drip carrying campaign = 'plan'.
--
-- `condition` on an email is the name of a predicate evaluated at send time
-- (see services/onboarding/conditions.ts). `condition_unmet` says what to do
-- when it is false: skip this email for good, or hold the sequence until it is
-- true. Holding is what lets a policy email wait for the policy to be written.

ALTER TABLE onboarding_enrolments ADD COLUMN IF NOT EXISTS campaign TEXT NOT NULL DEFAULT 'plan';

ALTER TABLE onboarding_enrolments DROP CONSTRAINT IF EXISTS onboarding_enrolments_tenant_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS onboarding_enrolments_tenant_campaign_key
  ON onboarding_enrolments (tenant_id, campaign);

ALTER TABLE onboarding_emails ADD COLUMN IF NOT EXISTS condition TEXT;
ALTER TABLE onboarding_emails ADD COLUMN IF NOT EXISTS condition_unmet TEXT NOT NULL DEFAULT 'skip';

-- How long a held email waits before the sequence gives up and moves on, so a
-- buyer who never completes their intake does not sit in the campaign forever.
ALTER TABLE onboarding_emails ADD COLUMN IF NOT EXISTS hold_max_days INT NOT NULL DEFAULT 14;

ALTER TABLE onboarding_sends ADD COLUMN IF NOT EXISTS campaign TEXT NOT NULL DEFAULT 'plan';

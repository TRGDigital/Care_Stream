-- A client buying a policy we write for them.
--
-- Modelled on training_licenses, which is the one-off Checkout flow already proven in
-- production: hosted Stripe Checkout in payment mode, reconciled when the buyer returns,
-- idempotent on the Stripe payment id. Nothing new is invented about taking money.
--
-- What is new is that this purchase is not delivered instantly. A training licence exists the
-- moment it is paid for; a policy has to be written, read internally and approved before the
-- client should ever see it. So a purchase carries a status through that work, and the client
-- is shown where their document has got to rather than an empty shelf.
--
--   paid      the money is in and the job is queued
--   drafting  being written
--   drafted   written, waiting on our internal read
--   approved  we are happy with it; the policy is now the client's
--   refunded  we could not deliver it and gave the money back
--
-- Nothing moves to approved automatically. That step is a person deciding the document is
-- good enough to put a care home's name on.

CREATE TABLE IF NOT EXISTS policy_purchase (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         TEXT        NOT NULL,
  -- What they bought. The title comes from the regulation's curated expected title, and the
  -- regulations are kept so we can show why the policy was needed and what it must answer.
  policy_title      TEXT        NOT NULL,
  reference_keys    TEXT[]      NOT NULL DEFAULT '{}',
  -- What they paid. Stored in pence at the price of the day, so a later price change never
  -- rewrites history.
  price_pence       INTEGER     NOT NULL,
  currency          TEXT        NOT NULL DEFAULT 'gbp',
  -- Stripe's payment id. UNIQUE per title so a buyer refreshing the return page cannot be
  -- charged twice or provisioned twice, the same guard training licences rely on.
  stripe_payment_id TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'paid',
  -- The delivered document, once written and approved.
  policy_id         TEXT,
  drafted_at        TIMESTAMPTZ,
  approved_at       TIMESTAMPTZ,
  approved_by       TEXT,
  purchased_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per payment per policy title. A single Checkout session can buy several policies,
-- so the payment id alone is not unique.
CREATE UNIQUE INDEX IF NOT EXISTS policy_purchase_payment_title_idx
  ON policy_purchase (stripe_payment_id, policy_title);

CREATE INDEX IF NOT EXISTS policy_purchase_tenant_idx ON policy_purchase (tenant_id, purchased_at DESC);
CREATE INDEX IF NOT EXISTS policy_purchase_status_idx ON policy_purchase (status);

COMMENT ON TABLE policy_purchase IS
  'A policy a client has paid us to write. Follows the training_licenses one-off Checkout pattern; status carries it from paid through internal approval to delivered.';

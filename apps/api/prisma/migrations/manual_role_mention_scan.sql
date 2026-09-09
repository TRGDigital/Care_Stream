-- Cache of "which named roles do this tenant's own policies mention".
--
-- The settings screen offers twenty four named roles. Most homes need a handful, and picking
-- which by reading a form of twenty four boxes is the wrong way round: their own policies
-- already say. "The Falls Lead reviews every fall" is a request for a name, written by the
-- home itself.
--
-- The scan is a regex sweep over policy text, so it costs no AI credit, but it is not cheap
-- in I/O: only twelve of Ferndale's three hundred and twenty two policies have their text in
-- Postgres and the rest come from object storage one at a time. Hence a stored result the
-- settings screen can read instantly, refreshed on demand rather than on page load.
--
-- One row per tenant. The whole scan is kept as jsonb because the shape follows the role
-- list, which changes as policy families are added, and there is nothing here worth querying
-- across tenants.

CREATE TABLE IF NOT EXISTS role_mention_scan (
  tenant_id   TEXT        PRIMARY KEY,
  scanned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  result      JSONB       NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE role_mention_scan IS
  'Per tenant: which named roles their policies mention, how many policies each, and one example. Refreshed on demand from the settings screen.';

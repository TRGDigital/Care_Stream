-- Workforce compliance register (Enterprise). Applied to prod via Supabase on
-- 2026-07-02. Adds the plan feature flag + the staff_credentials table with RLS
-- tenant isolation matching the other tenant tables.

ALTER TABLE plans ADD COLUMN IF NOT EXISTS has_workforce_compliance boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS staff_credentials (
  id         text PRIMARY KEY,
  tenant_id  text NOT NULL,
  user_id    text NOT NULL,
  type       text NOT NULL,               -- dbs | right_to_work | professional_registration | reference
  reference  text,
  issued_at  timestamp(3),
  expires_at timestamp(3),
  notes      text,
  created_at timestamp(3) NOT NULL DEFAULT now(),
  updated_at timestamp(3) NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS staff_credentials_user_id_type_key ON staff_credentials(user_id, type);
CREATE INDEX IF NOT EXISTS staff_credentials_tenant_id_idx ON staff_credentials(tenant_id);

ALTER TABLE staff_credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS staff_credentials_tenant_isolation ON staff_credentials;
CREATE POLICY staff_credentials_tenant_isolation ON staff_credentials
  FOR ALL TO carestreamai_api
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON staff_credentials TO carestreamai_api;

UPDATE plans SET has_workforce_compliance = true WHERE name = 'Enterprise';

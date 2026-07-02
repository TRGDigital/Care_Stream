-- Workforce compliance: supervisions & appraisals (Enterprise). Applied to prod
-- via Supabase on 2026-07-02. One row per session; RLS tenant isolation matches
-- the other tenant tables.

CREATE TABLE IF NOT EXISTS staff_supervisions (
  id           text PRIMARY KEY,
  tenant_id    text NOT NULL,
  user_id      text NOT NULL,
  type         text NOT NULL,               -- supervision | appraisal
  held_on      timestamp(3) NOT NULL,
  conducted_by text,
  next_due     timestamp(3),
  notes        text,
  created_at   timestamp(3) NOT NULL DEFAULT now(),
  updated_at   timestamp(3) NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS staff_supervisions_tenant_id_idx ON staff_supervisions(tenant_id);
CREATE INDEX IF NOT EXISTS staff_supervisions_user_id_idx ON staff_supervisions(user_id);

ALTER TABLE staff_supervisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS staff_supervisions_tenant_isolation ON staff_supervisions;
CREATE POLICY staff_supervisions_tenant_isolation ON staff_supervisions
  FOR ALL TO carestreamai_api
  USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON staff_supervisions TO carestreamai_api;

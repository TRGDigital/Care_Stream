-- Add intent classification fields to email_sessions and whatsapp_sessions.
-- detected_category: the resolved pipeline category for this session
-- awaiting_clarification: true while we're waiting for the user to reply 1/2/3

ALTER TABLE "email_sessions"
  ADD COLUMN IF NOT EXISTS "detected_category"      TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS "awaiting_clarification" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "whatsapp_sessions"
  ADD COLUMN IF NOT EXISTS "detected_category"      TEXT    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS "awaiting_clarification" BOOLEAN NOT NULL DEFAULT false;

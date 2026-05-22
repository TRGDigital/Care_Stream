-- Add response_style to tenants.
-- Controls AI response verbosity: "standard" (full detail) or "concise" (shorter summaries).
-- WhatsApp and voice always use concise regardless of this setting.

ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "response_style" TEXT NOT NULL DEFAULT 'standard';

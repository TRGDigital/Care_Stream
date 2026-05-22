-- Add first_language and second_language to users.
-- first_language drives all outbound training and notification language (ISO 639-3).
-- second_language is optional — used if a question fails to translate into first_language.

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "first_language"  TEXT NOT NULL DEFAULT 'eng',
  ADD COLUMN IF NOT EXISTS "second_language" TEXT;

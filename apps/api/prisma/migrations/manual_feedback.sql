-- Feedback column on queries
ALTER TABLE queries ADD COLUMN IF NOT EXISTS feedback TEXT CHECK (feedback IN ('positive', 'negative'));

-- Prompt version history
CREATE TABLE IF NOT EXISTS ai_prompt_versions (
  id         TEXT NOT NULL,
  prompt_id  TEXT NOT NULL,
  usage      TEXT NOT NULL,
  label      TEXT NOT NULL,
  content    TEXT NOT NULL,
  saved_at   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_prompt_versions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ai_prompt_versions_prompt_id_idx" ON "ai_prompt_versions"("prompt_id");

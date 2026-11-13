-- Collection keywords (platform only). Idempotent. Run in the Supabase SQL editor for project
-- shjpatdojoigcgmaewbg BEFORE the code deploy: the API selects these columns.
ALTER TABLE collections ADD COLUMN IF NOT EXISTS primary_keyword    TEXT;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS secondary_keywords TEXT[] NOT NULL DEFAULT '{}';

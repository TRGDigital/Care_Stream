ALTER TABLE knowledge_entries ADD COLUMN IF NOT EXISTS knowledge_category TEXT NOT NULL DEFAULT 'general';

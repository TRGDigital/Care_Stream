-- RalfyIndex auto-indexing: config (single row) + submissions log.
-- The API key is inserted separately (kept out of source control).

CREATE TABLE IF NOT EXISTS "ralfyindex_config" (
  "id"             TEXT        NOT NULL DEFAULT 'singleton',
  "api_key"        TEXT,
  "enabled"        BOOLEAN     NOT NULL DEFAULT true,
  "instant_index"  BOOLEAN     NOT NULL DEFAULT false,
  "project_prefix" TEXT        NOT NULL DEFAULT 'CareStream',
  "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ralfyindex_config_pkey" PRIMARY KEY ("id")
);

-- Seed the singleton config row (api_key set out-of-band).
INSERT INTO "ralfyindex_config" ("id") VALUES ('singleton')
ON CONFLICT ("id") DO NOTHING;

CREATE TABLE IF NOT EXISTS "ralfyindex_submissions" (
  "id"           TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "url"          TEXT        NOT NULL,
  "source"       TEXT        NOT NULL DEFAULT 'blog',
  "blog_post_id" TEXT,
  "project_name" TEXT,
  "status"       TEXT        NOT NULL DEFAULT 'submitted',
  "credits_used" INTEGER,
  "error"        TEXT,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ralfyindex_submissions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ralfyindex_submissions_status_created_idx"
  ON "ralfyindex_submissions" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "ralfyindex_submissions_url_idx"
  ON "ralfyindex_submissions" ("url");

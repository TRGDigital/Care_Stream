CREATE TABLE IF NOT EXISTS "cqc_seeds" (
  "id"               TEXT         NOT NULL,
  "slug"             TEXT         NOT NULL,
  "framework_area"   TEXT         NOT NULL,
  "also_known_as"    TEXT[]       NOT NULL DEFAULT '{}',
  "description"      TEXT         NOT NULL DEFAULT '',
  "inspector_focus"  TEXT         NOT NULL DEFAULT '',
  "evidence_expected" TEXT        NOT NULL DEFAULT '',
  "rating_indicators" TEXT        NOT NULL DEFAULT '',
  "source_urls"      TEXT[]       NOT NULL DEFAULT '{}',
  "is_active"        BOOLEAN      NOT NULL DEFAULT true,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cqc_seeds_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "cqc_seeds_slug_key" ON "cqc_seeds"("slug");

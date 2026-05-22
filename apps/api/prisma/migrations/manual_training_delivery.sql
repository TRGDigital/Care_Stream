-- Add shift_type to users (day / night / any)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "shift_type" TEXT NOT NULL DEFAULT 'any';

-- Training delivery rules: scheduled, return-to-work, post-incident configs
CREATE TABLE IF NOT EXISTS "training_delivery_rules" (
    "id"                 TEXT        NOT NULL,
    "tenant_id"          TEXT        NOT NULL,
    "module_id"          TEXT,
    "name"               TEXT        NOT NULL,
    "rule_type"          TEXT        NOT NULL DEFAULT 'scheduled',
    "is_active"          BOOLEAN     NOT NULL DEFAULT true,
    "target_audience"    TEXT        NOT NULL DEFAULT 'all',
    "target_user_ids"    TEXT[]      NOT NULL DEFAULT '{}',
    "days_of_week"       INTEGER[]   NOT NULL DEFAULT '{}',
    "send_time"          TEXT,
    "questions_per_send" INTEGER     NOT NULL DEFAULT 3,
    "frequency_cap_day"  INTEGER,
    "frequency_cap_week" INTEGER,
    "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"         TEXT,
    CONSTRAINT "training_delivery_rules_pkey" PRIMARY KEY ("id")
);

-- Training send log: immutable record of every question send
CREATE TABLE IF NOT EXISTS "training_send_log" (
    "id"           TEXT        NOT NULL,
    "tenant_id"    TEXT        NOT NULL,
    "rule_id"      TEXT,
    "module_id"    TEXT,
    "user_id"      TEXT        NOT NULL,
    "question_ids" TEXT[]      NOT NULL DEFAULT '{}',
    "trigger_type" TEXT        NOT NULL,
    "triggered_by" TEXT,
    "context"      TEXT,
    "sent_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "training_send_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "training_delivery_rules_tenant_id_idx"
    ON "training_delivery_rules"("tenant_id");

CREATE INDEX IF NOT EXISTS "training_send_log_tenant_id_sent_at_idx"
    ON "training_send_log"("tenant_id", "sent_at");

CREATE INDEX IF NOT EXISTS "training_send_log_user_id_idx"
    ON "training_send_log"("user_id");

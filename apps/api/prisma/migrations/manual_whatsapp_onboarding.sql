-- Manual migration: WhatsApp sessions + Onboarding module
-- Excludes DROP COLUMN for also_known_as_tsv (managed by DB trigger, not Prisma)

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "phone_allowlist" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "twilio_whatsapp_number" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "whatsapp_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "onboarding_flows" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "job_roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "onboarding_steps" (
    "id" TEXT NOT NULL,
    "flow_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "policy_id" TEXT,
    "question" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "onboarding_enrollments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "flow_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),

    CONSTRAINT "onboarding_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "onboarding_progress" (
    "id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "step_id" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3),
    "answer_text" TEXT,
    "answer_correct" BOOLEAN,

    CONSTRAINT "onboarding_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "whatsapp_sessions_tenant_id_phone_number_idx" ON "whatsapp_sessions"("tenant_id", "phone_number");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "whatsapp_sessions_tenant_id_expires_at_idx" ON "whatsapp_sessions"("tenant_id", "expires_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "onboarding_flows_tenant_id_is_active_idx" ON "onboarding_flows"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "onboarding_steps_flow_id_order_idx" ON "onboarding_steps"("flow_id", "order");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "onboarding_enrollments_tenant_id_user_id_idx" ON "onboarding_enrollments"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "onboarding_enrollments_tenant_id_flow_id_idx" ON "onboarding_enrollments"("tenant_id", "flow_id");

-- CreateIndex (unique, skip if exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'onboarding_enrollments_flow_id_user_id_key') THEN
    CREATE UNIQUE INDEX "onboarding_enrollments_flow_id_user_id_key" ON "onboarding_enrollments"("flow_id", "user_id");
  END IF;
END $$;

-- CreateIndex (unique, skip if exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'onboarding_progress_enrollment_id_step_id_key') THEN
    CREATE UNIQUE INDEX "onboarding_progress_enrollment_id_step_id_key" ON "onboarding_progress"("enrollment_id", "step_id");
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_sessions_tenant_id_fkey') THEN
    ALTER TABLE "whatsapp_sessions" ADD CONSTRAINT "whatsapp_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_flows_tenant_id_fkey') THEN
    ALTER TABLE "onboarding_flows" ADD CONSTRAINT "onboarding_flows_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_steps_flow_id_fkey') THEN
    ALTER TABLE "onboarding_steps" ADD CONSTRAINT "onboarding_steps_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "onboarding_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_steps_policy_id_fkey') THEN
    ALTER TABLE "onboarding_steps" ADD CONSTRAINT "onboarding_steps_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_enrollments_tenant_id_fkey') THEN
    ALTER TABLE "onboarding_enrollments" ADD CONSTRAINT "onboarding_enrollments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_enrollments_flow_id_fkey') THEN
    ALTER TABLE "onboarding_enrollments" ADD CONSTRAINT "onboarding_enrollments_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "onboarding_flows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_enrollments_user_id_fkey') THEN
    ALTER TABLE "onboarding_enrollments" ADD CONSTRAINT "onboarding_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_progress_enrollment_id_fkey') THEN
    ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "onboarding_enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_progress_step_id_fkey') THEN
    ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "onboarding_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

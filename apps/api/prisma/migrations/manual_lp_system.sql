-- Landing page system (B2B PPC) — demos.carestreamai.com
-- Apply once against the CareStream Supabase database (SQL editor or MCP).
-- Mirrors the Prisma models LandingPage / LpSubmission / LpEvent.

CREATE TABLE IF NOT EXISTS "landing_pages" (
  "id"                             TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "product_slug"                   TEXT        NOT NULL,
  "campaign_slug"                  TEXT        NOT NULL,
  "is_active"                      BOOLEAN     NOT NULL DEFAULT false,
  "noindex"                        BOOLEAN     NOT NULL DEFAULT true,
  "content"                        JSONB       NOT NULL,
  "variant_group"                  TEXT,
  "variant_label"                  TEXT,
  "traffic_allocation"             INTEGER     NOT NULL DEFAULT 100,
  "conversion_type"                TEXT        NOT NULL DEFAULT 'demo_booking',
  "conversion_value_pennies"       INTEGER,
  "additional_notification_emails" TEXT[]      NOT NULL DEFAULT '{}',
  "google_ads_conversion_id"       TEXT,
  "google_ads_conversion_label"    TEXT,
  "meta_pixel_id"                  TEXT,
  "meta_event_name"                TEXT,
  "linkedin_partner_id"            TEXT,
  "linkedin_conversion_id"         TEXT,
  "ga4_measurement_id"             TEXT,
  "meta_title"                     TEXT,
  "meta_description"               TEXT,
  "og_image_url"                   TEXT,
  "created_at"                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "landing_pages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "landing_pages_product_campaign_key" ON "landing_pages" ("product_slug", "campaign_slug");
CREATE INDEX IF NOT EXISTS "landing_pages_variant_idx" ON "landing_pages" ("variant_group");

CREATE TABLE IF NOT EXISTS "lp_submissions" (
  "id"                   TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "landing_page_id"      TEXT        NOT NULL,
  "data"                 JSONB       NOT NULL,
  "utm_source"           TEXT,
  "utm_medium"           TEXT,
  "utm_campaign"         TEXT,
  "utm_term"             TEXT,
  "utm_content"          TEXT,
  "gclid"                TEXT,
  "fbclid"               TEXT,
  "referrer"             TEXT,
  "page_url"             TEXT,
  "user_agent"           TEXT,
  "ip_address"           TEXT,
  "viewport"             TEXT,
  "device_type"          TEXT,
  "time_on_page_seconds" INTEGER,
  "scroll_depth_pct"     INTEGER,
  "variant_group"        TEXT,
  "variant_label"        TEXT,
  "status"               TEXT        NOT NULL DEFAULT 'new',
  "qualified_at"         TIMESTAMPTZ,
  "converted_at"         TIMESTAMPTZ,
  "created_at"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "lp_submissions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lp_submissions_page_fkey" FOREIGN KEY ("landing_page_id") REFERENCES "landing_pages" ("id")
);
CREATE INDEX IF NOT EXISTS "lp_submissions_page_idx" ON "lp_submissions" ("landing_page_id", "created_at");
CREATE INDEX IF NOT EXISTS "lp_submissions_variant_idx" ON "lp_submissions" ("variant_group", "variant_label");

CREATE TABLE IF NOT EXISTS "lp_events" (
  "id"              TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "landing_page_id" TEXT        NOT NULL,
  "session_id"      TEXT        NOT NULL,
  "event_type"      TEXT        NOT NULL,
  "field_name"      TEXT,
  "metadata"        JSONB,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "lp_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lp_events_page_fkey" FOREIGN KEY ("landing_page_id") REFERENCES "landing_pages" ("id")
);
CREATE INDEX IF NOT EXISTS "lp_events_page_session_idx" ON "lp_events" ("landing_page_id", "session_id");
CREATE INDEX IF NOT EXISTS "lp_events_type_idx" ON "lp_events" ("event_type", "created_at");

-- ── Seed: first CareStream campaign (multilingual policy access) ──────────────
INSERT INTO "landing_pages" ("product_slug", "campaign_slug", "is_active", "noindex", "conversion_type", "meta_title", "meta_description", "content")
SELECT 'carestream', 'multilingual-policy-access', true, true, 'demo_booking',
  'Care policies in every language, 24/7 | CareStream',
  'Give every care worker instant, cited answers from your own policies in 60+ languages, in the hub. Book a demo.',
  $json$
{
  "hero": {
    "eyebrow": "For UK care home operators",
    "headline": "Give every care worker your policies, in their own language, 24/7.",
    "subheadline": "Your overseas and night-shift staff get instant, cited answers from your own policies in 60+ languages, with no app to download and no training needed.",
    "primaryCta": { "label": "Book my demo", "anchor": "#form" },
    "trustRibbon": { "stat": "Built for UK care providers, grounded in your own documents." }
  },
  "problem": {
    "eyebrow": "The problem",
    "headline": "Your policies are written in English. A large part of your team don't think in English.",
    "body": [
      "Over 190,000 overseas workers joined the UK care sector in a single year. Most are expected to navigate complex policy folders in a second language, often on a night shift, with no manager to ask.",
      "When a carer can't find or understand the right procedure, the people they support are at risk, and your CQC evidence suffers. A policy nobody can read is a liability, not a safeguard."
    ]
  },
  "howItWorks": {
    "eyebrow": "How it works",
    "headline": "Up and running in under an hour.",
    "steps": [
      { "number": "01", "title": "Upload your policies", "body": "Add your policy library and handbook from the dashboard. PDF, Word and text all work, with no integration project." },
      { "number": "02", "title": "Your team asks in the hub", "body": "Staff ask in the hub or by email, in the language they think in. The answer comes back in the same language, cited to the exact policy." },
      { "number": "03", "title": "Your evidence builds itself", "body": "Every question and answer is logged, giving you a live record of policy access and multilingual support, ready for inspection." }
    ]
  },
  "features": {
    "headline": "Everything your team needs, in one hub.",
    "items": [
      { "icon": "Globe", "title": "60+ languages", "description": "Staff ask and read in their own language. Your records stay in English. No setup, no extra cost." },
      { "icon": "FileText", "title": "Answers from your documents", "description": "Every answer is drawn only from your approved policies and cited to the source. Never the internet, never guesswork." },
      { "icon": "Smartphone", "title": "In the hub, on any phone", "description": "No app to download and no training for frontline staff. They open the hub and ask, day or night." },
      { "icon": "ShieldCheck", "title": "CQC evidence, automatically", "description": "Policy access, languages used and staff engagement are logged and ready as inspection evidence." },
      { "icon": "Mic", "title": "Voice and hands-free", "description": "Staff can speak their question mid-task, in any language, and get the same cited answer." },
      { "icon": "GraduationCap", "title": "Training built in", "description": "Mandatory training and modules from your own policies, delivered in the same hub, with renewals tracked." }
    ]
  },
  "faq": {
    "headline": "Common questions",
    "items": [
      { "question": "Do staff need to download an app?", "answer": "No. Staff use the hub on any phone or browser. There is nothing to install and no training needed for frontline staff." },
      { "question": "Which languages are supported?", "answer": "Over 60. Language is detected automatically on every question, so staff just ask in the language they think in and the answer comes back in the same language." },
      { "question": "Where do the answers come from?", "answer": "Only your own uploaded policies. Every answer is grounded in your documents and cited to the exact policy and section. It never uses the internet or another organisation's content." },
      { "question": "Is our data safe?", "answer": "Your documents and data are stored in the UK/EEA and never used to train AI models. A Data Processing Agreement is provided to every subscriber." },
      { "question": "How long does setup take?", "answer": "Most care settings are live within an hour. Upload your policies, add your staff, and your team can start asking straight away." }
    ]
  },
  "finalCta": {
    "headline": "See it working with your own policies.",
    "subheadline": "Book a 30 minute demo and watch CareStream answer real questions from your documents, in any language.",
    "ctaLabel": "Book my demo",
    "ctaAnchor": "#form"
  },
  "form": {
    "headline": "Book your demo",
    "subheadline": "Tell us a little about your service and we will arrange a 30 minute walkthrough.",
    "submitLabel": "Book my demo",
    "successHeadline": "Thank you",
    "successMessage": "We've received your enquiry. We'll be in touch within one working day to book your demo.",
    "consentText": "By submitting, you agree to be contacted about your enquiry. See our privacy policy for how we handle your data.",
    "privacyLinkUrl": "https://carestreamai.com/privacy",
    "fields": [
      { "name": "fullName", "label": "Full name", "type": "text", "required": true, "columnSpan": "half", "autocomplete": "name" },
      { "name": "workEmail", "label": "Work email", "type": "email", "required": true, "columnSpan": "half", "autocomplete": "email", "validation": { "warnFreeEmail": true } },
      { "name": "organisation", "label": "Organisation", "type": "text", "required": true, "columnSpan": "full", "autocomplete": "organization" },
      { "name": "role", "label": "Job title", "type": "text", "required": true, "columnSpan": "half", "autocomplete": "organization-title" },
      { "name": "phone", "label": "Phone number", "type": "tel", "required": false, "columnSpan": "half", "autocomplete": "tel" },
      { "name": "message", "label": "Anything you'd like to cover?", "type": "textarea", "required": false, "columnSpan": "full", "placeholder": "Optional, e.g. multilingual demo, CQC reporting, data security" }
    ]
  }
}
$json$::jsonb
WHERE NOT EXISTS (SELECT 1 FROM "landing_pages" WHERE "product_slug" = 'carestream' AND "campaign_slug" = 'multilingual-policy-access');

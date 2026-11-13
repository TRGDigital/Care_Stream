-- Page performance tracking (blog posts and collections). Idempotent.
-- Run in the Supabase SQL editor for project shjpatdojoigcgmaewbg BEFORE the code deploy.

CREATE TABLE IF NOT EXISTS page_metrics (
  url             TEXT    NOT NULL,
  date            DATE    NOT NULL,
  kind            TEXT    NOT NULL DEFAULT 'blog',
  slug            TEXT    NOT NULL,
  impressions     INTEGER NOT NULL DEFAULT 0,
  clicks          INTEGER NOT NULL DEFAULT 0,
  position        REAL,
  sessions        INTEGER NOT NULL DEFAULT 0,
  engaged_seconds INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (url, date)
);
CREATE INDEX IF NOT EXISTS page_metrics_slug_date_idx ON page_metrics (slug, date);

CREATE TABLE IF NOT EXISTS page_query_metrics (
  url         TEXT    NOT NULL,
  query       TEXT    NOT NULL,
  window_end  DATE    NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks      INTEGER NOT NULL DEFAULT 0,
  position    REAL,
  PRIMARY KEY (url, query, window_end)
);
CREATE INDEX IF NOT EXISTS page_query_metrics_url_idx ON page_query_metrics (url, window_end);

CREATE TABLE IF NOT EXISTS page_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url        TEXT NOT NULL,
  kind       TEXT NOT NULL,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS page_events_url_idx ON page_events (url, created_at);

-- Sign ups per page: the registration link carries source=blog-<slug>.
ALTER TABLE signup_attempts ADD COLUMN IF NOT EXISTS source TEXT;
CREATE INDEX IF NOT EXISTS signup_attempts_source_idx ON signup_attempts (source, created_at) WHERE source IS NOT NULL;

-- Closed to the public API: only the server (service role) reads these.
ALTER TABLE page_metrics       ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_query_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_events        ENABLE ROW LEVEL SECURITY;

-- Daily collector at 05:45 UTC (Search Console data lags about 2 days; the job refreshes the last 7).
select cron.unschedule('cs-page-metrics') where exists (select 1 from cron.job where jobname = 'cs-page-metrics');
select cron.schedule('cs-page-metrics', '45 5 * * *', $$select public.carestream_cron('page-metrics')$$);

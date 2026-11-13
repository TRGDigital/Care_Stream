-- Topic cluster for the related-content block (platform sets it; the public page reads it).
-- Idempotent. Run in the Supabase SQL editor for project shjpatdojoigcgmaewbg BEFORE the code deploy.
ALTER TABLE blog_posts  ADD COLUMN IF NOT EXISTS topic_cluster TEXT;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS topic_cluster TEXT;
CREATE INDEX IF NOT EXISTS blog_posts_topic_cluster_idx  ON blog_posts  (topic_cluster) WHERE topic_cluster IS NOT NULL;
CREATE INDEX IF NOT EXISTS collections_topic_cluster_idx ON collections (topic_cluster) WHERE topic_cluster IS NOT NULL;

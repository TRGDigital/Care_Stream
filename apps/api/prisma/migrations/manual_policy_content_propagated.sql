-- Publish propagates the new content to S3, the formatted-HTML cache and the search index. That step
-- was wrapped in a swallow-all try/catch, so a failure left the policy marked published while staff
-- kept seeing the previous version, silently. This flag records propagation state so a failure is
-- visible and can be re-synced.
ALTER TABLE policy_documents
  ADD COLUMN IF NOT EXISTS content_propagated boolean NOT NULL DEFAULT true;

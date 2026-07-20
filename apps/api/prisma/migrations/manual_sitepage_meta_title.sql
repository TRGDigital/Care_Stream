-- Add a separate SEO meta title to site_pages.
-- Until now the page `title` doubled as both the H1 and the <title> tag. This column lets the
-- <title> be set independently (the meta generator / Pages tab can push it); rendering falls
-- back to `title` when meta_title is null, so existing pages are unaffected.
-- Additive + nullable = safe. Run this BEFORE deploying the code that references meta_title.

ALTER TABLE "site_pages"
  ADD COLUMN IF NOT EXISTS "meta_title" TEXT;

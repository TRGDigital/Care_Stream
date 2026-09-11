-- Hero image per shop policy, and one image per piece of legislation (shared across
-- every policy that cites it). Both keys point at objects under shop/images/ in S3.
ALTER TABLE "policy_products"      ADD COLUMN IF NOT EXISTS "image_key" TEXT;
ALTER TABLE "external_regulations" ADD COLUMN IF NOT EXISTS "image_key" TEXT;

// Which picture an audit card shows: the audit's OWN picture, never a shared one (Len, 24 Nov 2026: no two audits may show the same picture).
// Keyed by the audit's page slug, or by its catalogue slug when it has no page yet. The pictures are made by the API
// (apps/api/src/data/audit-image-scenes.ts) and listed at /public/audit-images. A card whose picture is not made yet shows none.
import { AUDIT_PAGE_NAME_SLUG } from './audit-pages/slugs'

export function auditImageKeys(name: string, catalogueSlug?: string): string[] {
  const own = AUDIT_PAGE_NAME_SLUG[name] ?? catalogueSlug
  return own ? [own] : []
}

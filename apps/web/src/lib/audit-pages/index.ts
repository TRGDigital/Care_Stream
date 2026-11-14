import type { AuditPageData } from './types'
import { page as marChartAuditHomeCare } from './mar-chart-audit-home-care'

// Audits that have their own product page at /care-audits/<slug>. Add a page here once its data file exists.
// The sitemap, the /care-audits library links and the platform "Main site pages" list all read this.
export const AUDIT_PAGES: AuditPageData[] = [marChartAuditHomeCare]

export const AUDIT_PAGE_BY_SLUG = new Map(AUDIT_PAGES.map(p => [p.slug, p]))
export const AUDIT_PAGE_SLUGS = new Set(AUDIT_PAGES.map(p => p.slug))

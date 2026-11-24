// "Pending drafts": pages written outside the nightly routine (for example in a working session) that are waiting to be saved as DRAFTS.
// The pages live in src/data/pending-drafts/{blog,scenarios,collections}.json. Run by the cron route /cron/import-pending-drafts (scheduled nightly).
//
// Safe by design and safe to run any number of times:
//  - everything is saved as a DRAFT; nothing is ever published
//  - a slug that already exists on the platform (draft or published) is left completely alone, so an edit made in review is never overwritten
// Once the pages are in, the files can be emptied (an empty list does nothing).

import { prisma } from '../../db/client'
import { importBlogDrafts, importCollectionDrafts } from '../../routes/admin'
import { importScenarioDrafts } from '../../routes/scenarios'
import pendingBlog from '../../data/pending-drafts/blog.json'
import pendingScenarios from '../../data/pending-drafts/scenarios.json'
import pendingCollections from '../../data/pending-drafts/collections.json'

const slugOf = (s: unknown) => String(s ?? '').trim().replace(/^\/?blog\//, '').replace(/^\//, '')

export async function importPendingDrafts() {
  const out: { blog: { created: string[]; kept: string[]; skipped: unknown[] }; scenarios: { created: unknown[]; kept: string[]; skipped: unknown[] }; collections: { created: string[]; kept: string[]; skipped: unknown[] } } =
    { blog: { created: [], kept: [], skipped: [] }, scenarios: { created: [], kept: [], skipped: [] }, collections: { created: [], kept: [], skipped: [] } }

  const blog = (pendingBlog as any[]) ?? []
  if (blog.length) {
    const have = new Set<string>((await (prisma as any).blogPost.findMany({ where: { slug: { in: blog.map(b => slugOf(b.slug)) } }, select: { slug: true } })).map((r: any) => r.slug))
    const fresh = blog.filter(b => !have.has(slugOf(b.slug)))
    out.blog.kept = blog.filter(b => have.has(slugOf(b.slug))).map(b => slugOf(b.slug))
    if (fresh.length) {
      const r = await importBlogDrafts(fresh, false)   // allowRefresh false: a published post is never touched
      out.blog.created = r.created.map(c => c.slug); out.blog.skipped = r.skipped
    }
  }

  const scn = (pendingScenarios as any[]) ?? []
  if (scn.length) {
    const have = new Set<string>((await (prisma as any).scenarioPage.findMany({ where: { slug: { in: scn.map(s => String(s.slug)) } }, select: { slug: true } })).map((r: any) => r.slug))
    out.scenarios.kept = scn.filter(s => have.has(String(s.slug))).map(s => String(s.slug))
    const fresh = scn.filter(s => !have.has(String(s.slug)))
    if (fresh.length) { const r = await importScenarioDrafts(fresh); out.scenarios.created = r.created; out.scenarios.skipped = r.skipped }
  }

  // Collections: saved as drafts only, and a slug that already exists (draft or published) is left alone, so a review edit is never overwritten.
  const col = (pendingCollections as any[]) ?? []
  if (col.length) {
    const slugC = (s: unknown) => String(s ?? '').trim().replace(/^\/?collection\//, '').replace(/^\//, '')
    const have = new Set<string>((await (prisma as any).collection.findMany({ where: { slug: { in: col.map(c => slugC(c.slug)) } }, select: { slug: true } })).map((r: any) => r.slug))
    out.collections.kept = col.filter(c => have.has(slugC(c.slug))).map(c => slugC(c.slug))
    const fresh = col.filter(c => !have.has(slugC(c.slug)))
    if (fresh.length) { const r = await importCollectionDrafts(fresh, false); out.collections.created = r.created.map(c => c.slug); out.collections.skipped = r.skipped }
  }
  return out
}

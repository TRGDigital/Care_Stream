// Endpoints for the nightly CareStream content routines (blog posts and collection pages).
//
// A cloud routine has no repository and no platform login, so it talks to these three endpoints with a bearer token
// (CONTENT_ROUTINE_TOKEN):
//   GET  /routine/content/bundle       the writing guidelines, checker tools, backlogs and catalogues (a snapshot of
//                                      ~/carestream-content made by tools/sync_engine.py)
//   GET  /routine/content/state        what is already on the platform (so a night never repeats a slug, keyword,
//                                      heading, opening or image), and the platform's draft counts
//   POST /routine/content/blog         save posts as DRAFTS
//   POST /routine/content/collections  save collections as DRAFTS
//   POST /routine/content/scenarios    save scenario pages as DRAFTS (checked by lib/scenario-validate; only slugs in the queue)
//   POST /routine/content/image       make one illustration in the house style when no stock image fits (capped per day)
//   POST /routine/content/notify       once at the end of a night: emails the platform owner the drafts created in the
//                                      last day plus the routine's own report
//
// Nothing here can publish, change a published page, or refresh one: the shared import functions are called with
// allowRefresh false, and every item is forced to status draft. A human approves each page in /platform/blog.

import { Router, Request, Response, NextFunction } from 'express'
import { timingSafeEqual } from 'crypto'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { importBlogDrafts, importCollectionDrafts } from './admin'
import { sendContentDraftsEmail, sendOwnerReminderEmail } from '../services/email/outbound'
import { generateContentImage } from '../services/policy-shop/shopImage'
import bundle from '../data/content-engine/bundle.json'
import scenarioQueue from '../data/scenario-queue.json'
import existingScenarios from '../data/scenario-existing.json'
import { validateScenario } from '../lib/scenario-validate'

interface QueueItem { n: number; slug: string; title: string; hook: string; features: string; status: string; primary: { keyword: string; searches: number }; secondary: { keyword: string; searches: number }[]; scene: string; course?: string; blogs?: string[]; notes?: string }
const QUEUE = scenarioQueue as unknown as QueueItem[]

export const contentRoutineRouter = Router()

function authorised(req: Request): boolean {
  const want = process.env.CONTENT_ROUTINE_TOKEN
  if (!want || want.length < 24) return false
  const got = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
  const a = Buffer.from(got); const b = Buffer.from(want)
  return a.length === b.length && timingSafeEqual(a, b)
}

contentRoutineRouter.use((req: Request, res: Response, next: NextFunction) => {
  if (!process.env.CONTENT_ROUTINE_TOKEN) { err(res, 'NOT_CONFIGURED', 'The content routine is not configured.'); return }
  if (!authorised(req)) { err(res, 'INVALID_TOKEN', 'Token is invalid.'); return }
  next()
})

const stripTags = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
const h2s = (html: string) => Array.from(html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)).map(m => stripTags(m[1])).filter(Boolean)
const imgs = (html: string) => Array.from(html.matchAll(/<img[^>]+src="([^"]+)"/gi)).map(m => m[1])
function first12(html: string): string {
  for (const m of html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const t = stripTags(m[1])
    if (t.split(' ').length > 6) return (t.toLowerCase().match(/[a-z0-9']+/g) ?? []).slice(0, 12).join(' ')
  }
  return ''
}

contentRoutineRouter.get('/bundle', (_req: Request, res: Response) => {
  ok(res, bundle)
})

contentRoutineRouter.get('/state', async (_req: Request, res: Response) => {
  const [posts, cols, scn] = await Promise.all([
    (prisma as any).blogPost.findMany({ select: { slug: true, title: true, status: true, topic_cluster: true, primary_keyword: true, secondary_keywords: true, feature_image_url: true, content: true, created_at: true } }),
    (prisma as any).collection.findMany({ select: { slug: true, title: true, status: true, kind: true, cluster_key: true, topic_cluster: true, primary_keyword: true, secondary_keywords: true, intro: true, body: true, created_at: true } }),
    (prisma as any).scenarioPage.findMany({ select: { slug: true, status: true, data: true } }),
  ])
  const doneSlugs = new Set<string>(scn.map((r: any) => r.slug))
  const scenarios = scn.map((r: any) => ({ slug: r.slug, status: r.status, title: r.data?.title ?? '', primary_keyword: r.data?.primary_keyword ?? null, secondary_keywords: r.data?.secondary_keywords ?? [], image: r.data?.image ?? null }))
  const scenario_queue = QUEUE.filter(q => q.status === 'READY' && !doneSlugs.has(q.slug)).sort((a, b) => a.n - b.n)
  const blogs = posts.map((p: any) => ({
    slug: p.slug, title: p.title, status: p.status, topic_cluster: p.topic_cluster ?? null, primary_keyword: p.primary_keyword ?? null,
    secondary_keywords: p.secondary_keywords ?? [], feature_image: p.feature_image_url ?? null,
    h2s: h2s(p.content ?? ''), first12: first12(p.content ?? ''), images: imgs(p.content ?? ''),
  }))
  const collections = cols.map((c: any) => {
    const html = `${c.intro ?? ''} ${c.body ?? ''}`
    return {
      slug: c.slug, title: c.title, status: c.status, kind: c.kind, cluster_key: c.cluster_key, topic_cluster: c.topic_cluster ?? null,
      primary_keyword: c.primary_keyword ?? null, secondary_keywords: c.secondary_keywords ?? [],
      h2s: h2s(html), first12: first12(c.intro ?? ''), images: imgs(html),
    }
  })
  ok(res, {
    blogs, collections, scenarios, scenario_queue, scenarios_existing: existingScenarios,
    published_blog_slugs: posts.filter((p: any) => p.status === 'published').map((p: any) => p.slug),
    counts: {
      scenario_drafts: scn.filter((r: any) => r.status === 'draft').length,
      scenario_queue_left: scenario_queue.length,
      blog_drafts: posts.filter((p: any) => p.status === 'draft').length,
      collection_drafts: cols.filter((c: any) => c.status === 'draft').length,
    },
  })
})

contentRoutineRouter.post('/blog', async (req: Request, res: Response) => {
  const list = Array.isArray(req.body?.posts) ? req.body.posts.slice(0, 10) : []
  if (!list.length) { err(res, 'VALIDATION_ERROR', 'posts must be a non empty array.'); return }
  // Never publish, never refresh, never feature: the import forces a draft and the routine cannot ask otherwise.
  const clean = list.map((p: any) => { const { refresh: _r, status: _s, is_featured: _f, publication_date: _d, ...rest } = p ?? {}; return rest })
  ok(res, await importBlogDrafts(clean, false))
})

// POST /routine/content/scenarios  { scenarios: [page] }  (at most 3 a call). Draft only, from the queue only, validated first.
contentRoutineRouter.post('/scenarios', async (req: Request, res: Response) => {
  const list = Array.isArray(req.body?.scenarios) ? req.body.scenarios.slice(0, 3) : []
  if (!list.length) { err(res, 'VALIDATION_ERROR', 'scenarios must be a non empty array.'); return }
  const posts = await (prisma as any).blogPost.findMany({ where: { status: 'published' }, select: { slug: true } })
  const blogSlugs = posts.map((p: any) => p.slug)
  const created: string[] = []; const skipped: { slug: string; reason: string[] }[] = []
  for (const page of list) {
    const slug = String(page?.slug ?? '')
    const q = QUEUE.find(x => x.slug === slug)
    if (!q) { skipped.push({ slug, reason: ['The slug is not in the scenario queue.'] }); continue }
    if (q.status !== 'READY') { skipped.push({ slug, reason: ['This queue item is not marked READY.'] }); continue }
    if (await (prisma as any).scenarioPage.findUnique({ where: { slug } })) { skipped.push({ slug, reason: ['A page with this slug already exists. Nothing was changed.'] }); continue }
    const data = { ...page, status: 'draft', order: q.n }
    const v = validateScenario(data, { expected: { primary: q.primary.keyword, secondary: q.secondary.map(k => k.keyword) }, blogSlugs })
    if (v.errors.length) { skipped.push({ slug, reason: v.errors.slice(0, 12) }); continue }
    await (prisma as any).scenarioPage.create({ data: { slug, status: 'draft', sort_order: q.n, data } })
    created.push(slug)
  }
  ok(res, { created, skipped })
})

contentRoutineRouter.post('/collections', async (req: Request, res: Response) => {
  const list = Array.isArray(req.body?.collections) ? req.body.collections.slice(0, 10) : []
  if (!list.length) { err(res, 'VALIDATION_ERROR', 'collections must be a non empty array.'); return }
  const clean = list.map((c: any) => { const { refresh: _r, status: _s, ...rest } = c ?? {}; return rest })
  ok(res, await importCollectionDrafts(clean, false))
})

// POST /routine/content/image  { topic, scene, key? }  ->  { url, alt_hint }
// For when the stock library has nothing that fits a page. The scene is a plain description of one ordinary care moment. The image is
// generated in the house flat teal style (prompt editable as `blog_image_generation` in Platform Console, AI Prompts), stored, and its
// public URL returned. Capped so a runaway routine cannot spend: 24 images a day in total (every blog now has a generated hero, plus inline and collection images), 3 per request.
let imageDay = ''; let imageCount = 0
contentRoutineRouter.post('/image', async (req: Request, res: Response) => {
  const topic = String(req.body?.topic ?? '').trim().slice(0, 200)
  const scene = String(req.body?.scene ?? '').trim().slice(0, 600)
  if (topic.length < 3 || scene.length < 15) { err(res, 'VALIDATION_ERROR', 'topic and a scene description (a sentence or two) are required.'); return }
  const today = new Date().toISOString().slice(0, 10)
  if (imageDay !== today) { imageDay = today; imageCount = 0 }
  if (imageCount >= 24) { err(res, 'DAILY_LIMIT', 'The daily image limit has been reached. Flag [CHECK] new image needed. Do not use a stock image as a blog hero.', 429); return }
  imageCount++
  try {
    const url = await generateContentImage(topic, scene, String(req.body?.key || topic))
    ok(res, { url: `https://api.carestreamai.com${url}`, generated_today: imageCount })
  } catch (e: any) {
    imageCount = Math.max(0, imageCount - 1)
    err(res, 'GENERATE_FAILED', e?.message ?? 'could not generate that image', 500)
  }
})

// POST /routine/content/notify  { kind: 'blog' | 'collections', report?: string }
// Looks the drafts up in the database rather than trusting the routine's list, so the email is a true record.
contentRoutineRouter.post('/notify', async (req: Request, res: Response) => {
  const kind = req.body?.kind
  // { kind: 'reminder', subject, message }: a one off reminder email to the owner (scheduled by a routine).
  if (kind === 'reminder') {
    const subject = String(req.body?.subject ?? '').trim()
    const message = String(req.body?.message ?? '').trim()
    if (!subject || !message) { err(res, 'VALIDATION_ERROR', 'A reminder needs a subject and a message.'); return }
    try { await sendOwnerReminderEmail({ subject, message }) } catch (e: any) { err(res, 'EMAIL_FAILED', String(e?.message ?? e).slice(0, 200)); return }
    ok(res, { kind, sent: true }); return
  }
  if (kind !== 'blog' && kind !== 'collections' && kind !== 'scenarios') { err(res, 'VALIDATION_ERROR', "kind must be 'blog', 'collections' or 'scenarios'."); return }
  const since = new Date(Date.now() - 8 * 3600 * 1000)
  const rows = kind === 'scenarios'
    ? (await (prisma as any).scenarioPage.findMany({ where: { created_at: { gte: since } }, orderBy: { created_at: 'asc' }, select: { slug: true, status: true, created_at: true, data: true } }))
        .map((r: any) => ({ title: String(r.data?.title ?? r.slug).replace(/<[^>]+>/g, ''), slug: r.slug, primary_keyword: r.data?.primary_keyword ?? null, created_at: r.created_at, status: r.status }))
    : kind === 'blog'
    ? await (prisma as any).blogPost.findMany({ where: { created_at: { gte: since } }, orderBy: { created_at: 'asc' }, select: { title: true, slug: true, primary_keyword: true, created_at: true, status: true } })
    : await (prisma as any).collection.findMany({ where: { created_at: { gte: since } }, orderBy: { created_at: 'asc' }, select: { title: true, slug: true, primary_keyword: true, created_at: true, status: true } })
  try {
    await sendContentDraftsEmail({ kind, items: rows, report: String(req.body?.report ?? '') })
  } catch (e: any) {
    err(res, 'EMAIL_FAILED', String(e?.message ?? e).slice(0, 200)); return
  }
  ok(res, { kind, listed: rows.length })
})

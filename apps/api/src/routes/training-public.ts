import { Router, Request, Response } from 'express'
import { downloadFile } from '../services/storage/s3'
import { prisma } from '../db/client'
import { illustrationUrl } from '../services/training/moduleImage'
import { TOPIC_GROUP_LABELS } from '../data/training-topics'
import { CARE_SETTINGS, SETTING_LABELS } from '../lib/care-setting'
import { createTrainingCheckoutSession, createTrainingBasketCheckoutSession, TRAINING_LICENCE_PENCE, retrieveTrainingCheckoutSession } from '../services/billing/stripe'
import { createLoginLink } from '../lib/login-tokens'
import { siteUrl } from '../lib/urls'
import { translateTextsBatch, translateQuestionsBatch } from '../lib/translate'
import { sendStaffLoginLinkEmail, sendPasswordSetupEmail } from '../services/email/outbound'
import { hashPassword } from '../services/auth/password'
import crypto from 'crypto'

const slugify = (s: string): string =>
  s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

// The generated module content uses a care-home voice ("our home"). CareStream
// serves every kind of CQC-regulated service, so the public-facing defaults say
// "care setting". Mirrors the same helper on the marketing page.
const careSetting = (input?: string | null): string =>
  (input ?? '')
    .replace(/\bat our home\b/gi, 'at the care setting')
    .replace(/\bcare homes\b/gi, 'care settings')
    .replace(/\bcare home\b/gi, 'care setting')
    .replace(/\bnursing homes\b/gi, 'care settings')
    .replace(/\bnursing home\b/gi, 'care setting')
    .replace(/\bour home\b/gi, 'the care setting')
    .replace(/\bthe home\b/gi, 'the care setting')
    .replace(/\bthis home\b/gi, 'this care setting')
    .replace(/\byour home\b/gi, 'your care setting')

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
}

// Public, unauthenticated serving of AI-generated training-module illustrations.
// Mounted before requireAuth in app.ts. Filenames are uuid.ext (set at upload),
// so the strict pattern blocks path traversal. Illustrations carry no tenant
// data — they're generic topic artwork — so no auth/tenant scoping is needed.
export const publicTrainingRouter = Router()

publicTrainingRouter.get('/image/:file', async (req: Request, res: Response) => {
  const file = String(req.params.file ?? '')
  if (!/^[a-f0-9-]+\.(png|jpe?g|webp|gif)$/i.test(file)) { res.status(400).end(); return }
  const ext = file.split('.').pop()!.toLowerCase()
  try {
    const buffer = await downloadFile(`training/images/${file}`)
    res.setHeader('Content-Type', IMAGE_CONTENT_TYPES[ext] ?? 'application/octet-stream')
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    // helmet sets CORP same-origin globally; allow the console/hub (other origin) to load these.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    res.send(buffer)
  } catch {
    res.status(404).end()
  }
})

// Public catalogue of the standard annual mandatory training subjects, for the
// marketing site. Returns every active platform topic (the full mandatory list),
// each with its published module's cover image and description where one has been
// built and approved. No tenant data, so no auth needed.
publicTrainingRouter.get('/standard-modules', async (_req: Request, res: Response) => {
  try {
    const [topics, modules] = await Promise.all([
      (prisma as any).trainingTopic.findMany({
        where:   { tenant_id: null, is_active: true },
        orderBy: { sort_order: 'asc' },
      }),
      // Include drafts as well as approved: these are the platform's own standard
      // library, so we surface the generated cover, description and meta even
      // before a module is formally approved. Approved versions are preferred.
      (prisma as any).trainingModule.findMany({
        where:   { tenant_id: null, source: 'ai_generated' },
        select:  { id: true, topic_id: true, approved: true, description: true, frequency: true, duration_minutes: true, pass_mark: true, illustration_key: true },
        orderBy: [{ approved: 'desc' }, { created_at: 'desc' }],
      }),
    ])
    // First module per topic (approved preferred, then most recent) for text and
    // meta; first module that has a cover (approved preferred) for the image.
    const textByTopic = new Map<string, any>()
    const coverByTopic = new Map<string, any>()
    for (const m of (modules as any[])) {
      if (!m.topic_id) continue
      if (!textByTopic.has(m.topic_id)) textByTopic.set(m.topic_id, m)
      if (m.illustration_key && !coverByTopic.has(m.topic_id)) coverByTopic.set(m.topic_id, m)
    }
    const items = (topics as any[]).map(t => {
      const txt   = textByTopic.get(t.id)
      const cover = coverByTopic.get(t.id)
      return {
        slug:               slugify(t.title),
        title:              t.title,
        group_key:          t.group_key,
        care_setting:       t.care_setting ?? null,
        frequency:          txt?.frequency ?? t.default_frequency,
        requires_practical: t.requires_practical,
        built:              !!txt,
        description:        txt?.description ?? null,
        duration_minutes:   txt?.duration_minutes ?? null,
        pass_mark:          txt?.pass_mark ?? null,
        illustration_url:   cover ? illustrationUrl(cover.illustration_key) : null,
      }
    })
    res.json({ data: { groups: TOPIC_GROUP_LABELS, settings: CARE_SETTINGS.map(s => ({ key: s, label: SETTING_LABELS[s] })), topics: items } })
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'failed' })
  }
})

// Public detail for one standard training subject, for the per-module marketing
// pages. Returns the teaching outline (summary, outcomes, key points, section
// headings and bodies, mapped standards) — the assessment questions and answers
// stay private.
publicTrainingRouter.get('/standard-modules/:slug', async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug ?? '')
    const topics = await (prisma as any).trainingTopic.findMany({ where: { tenant_id: null, is_active: true } })
    const topic = (topics as any[]).find(t => slugify(t.title) === slug)
    if (!topic) { res.status(404).json({ error: 'not found' }); return }

    const modules = await (prisma as any).trainingModule.findMany({
      where:   { tenant_id: null, source: 'ai_generated', topic_id: topic.id },
      select:  { approved: true, description: true, frequency: true, illustration_key: true, learning_content: true, standards: true },
      orderBy: [{ approved: 'desc' }, { created_at: 'desc' }],
    })
    const m = (modules as any[])[0]
    const cover = (modules as any[]).find(x => x.illustration_key)
    const lc = (m?.learning_content ?? {}) as any
    // Per-section images may have been generated on a different module version
    // than the one chosen for text (e.g. on a draft). Build a per-index image
    // map, preferring the selected module, aligned by section order.
    const sectionImageByIdx = new Map<number, string>()
    for (const mod of [m, ...(modules as any[])]) {
      const secs = (mod?.learning_content as any)?.sections
      if (!Array.isArray(secs)) continue
      secs.forEach((sec: any, i: number) => {
        if (sec?.image_key && !sectionImageByIdx.has(i)) sectionImageByIdx.set(i, sec.image_key)
      })
    }
    const sections = Array.isArray(lc.sections)
      ? lc.sections.map((s: any, i: number) => ({
          heading:   String(s?.heading ?? ''),
          body:      String(s?.body ?? ''),
          image_url: sectionImageByIdx.has(i) ? illustrationUrl(sectionImageByIdx.get(i)!) : null,
        })).filter((s: any) => s.heading)
      : []
    const standards = Array.isArray(m?.standards) ? (m.standards as any[]).map(s => s?.label).filter(Boolean) : []

    res.json({ data: { module: {
      slug,
      title:              topic.title,
      group_key:          topic.group_key,
      group_label:        TOPIC_GROUP_LABELS[topic.group_key] ?? topic.group_key,
      care_setting:       topic.care_setting ?? null,
      built:              !!m,
      frequency:          m?.frequency ?? topic.default_frequency,
      requires_practical: topic.requires_practical,
      description:        m?.description ?? null,
      summary:            typeof lc.summary === 'string' ? lc.summary : null,
      outcomes:           Array.isArray(lc.outcomes) ? lc.outcomes.map(String).slice(0, 6) : [],
      key_points:         Array.isArray(lc.key_points) ? lc.key_points.map(String).slice(0, 8) : [],
      sections,
      standards,
      illustration_url:   cover ? illustrationUrl(cover.illustration_key) : null,
    } } })
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'failed' })
  }
})

// GET /standard-modules/:slug/demo — one real lesson section + one real question
// so the public training + PPC landing pages can show a live, interactive taster of
// how the module works. Questions are otherwise private; exposing a single sample
// question (with its answer) is intentional for the demo.
publicTrainingRouter.get('/standard-modules/:slug/demo', async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug ?? '')
    const topics = await (prisma as any).trainingTopic.findMany({ where: { tenant_id: null, is_active: true } })
    const topic = (topics as any[]).find(t => slugify(t.title) === slug)
    if (!topic) { res.status(404).json({ error: 'not found' }); return }

    const modules = await (prisma as any).trainingModule.findMany({
      where:   { tenant_id: null, source: 'ai_generated', topic_id: topic.id },
      select:  { learning_content: true, questions: true },
      orderBy: [{ approved: 'desc' }, { created_at: 'desc' }],
    })
    const m = (modules as any[])[0]
    const lc = (m?.learning_content ?? {}) as any
    const secs = Array.isArray(lc.sections) ? lc.sections : []

    // First teaching section that has real content.
    const firstIdx = secs.findIndex((s: any) => s?.heading && s?.body)
    const firstSec = firstIdx >= 0 ? secs[firstIdx] : null
    let sectionImage: string | null = firstSec?.image_key ? illustrationUrl(firstSec.image_key) : null
    if (firstSec && !sectionImage) {
      for (const mod of modules as any[]) {
        const ss = (mod?.learning_content as any)?.sections
        if (Array.isArray(ss) && ss[firstIdx]?.image_key) { sectionImage = illustrationUrl(ss[firstIdx].image_key); break }
      }
    }
    const lesson = firstSec
      ? { heading: String(firstSec.heading), body: String(firstSec.body), image_url: sectionImage }
      : null

    // First assessment question with usable options + a correct index.
    const qs = Array.isArray(m?.questions) ? m.questions : []
    const q = qs.find((x: any) => x?.text && Array.isArray(x?.options) && x.options.length >= 2 && typeof x?.correct === 'number') ?? null
    const question = q
      ? { text: String(q.text), options: q.options.map(String), correct: q.correct as number, explanation: q.explanation ? String(q.explanation) : null }
      : null

    // Saved Polish + Hindi translations of the demo. Generated once (call with
    // ?gen=1), then read from cache on every render — zero runtime translation cost.
    const translations: Record<string, { lesson: { heading: string; body: string }; question: { text: string; options: string[]; explanation: string | null } }> = {}
    try {
      const rows: any[] = await (prisma as any).$queryRawUnsafe(
        `select lang, lesson, question from demo_translations where topic_slug = $1 and lang in ('pol','hin')`,
        slug,
      )
      for (const r of rows) {
        translations[r.lang] = {
          lesson:   typeof r.lesson === 'string' ? JSON.parse(r.lesson) : r.lesson,
          question: typeof r.question === 'string' ? JSON.parse(r.question) : r.question,
        }
      }
      // Generate + cache translations. Warm ONE language per request (?gen=pol /
      // ?gen=hin) so each finishes within the function limit; ?gen=1 does both.
      const genParam = String(req.query.gen ?? '')
      const genLangs: Array<'pol' | 'hin'> =
        genParam === '1' ? ['pol', 'hin'] : genParam === 'pol' || genParam === 'hin' ? [genParam] : []
      if (genLangs.length && lesson && question) {
        for (const lang of genLangs) {
          const [headingT, bodyT, explT0] = await translateTextsBatch(
            [lesson.heading, lesson.body, question.explanation ?? ''],
            lang,
          )
          const explT = question.explanation ? explT0 : null
          const [qT] = await translateQuestionsBatch([{ text: question.text, options: question.options }], lang)
          // Defensive: keep only the heading line (a long body occasionally bleeds in).
          const lessonT = { heading: (headingT || lesson.heading).split('\n\n')[0].trim(), body: bodyT }
          const questionT = { text: qT.text, options: qT.options, explanation: explT }
          await (prisma as any).$executeRawUnsafe(
            `insert into demo_translations (topic_slug, lang, lesson, question) values ($1, $2, $3::jsonb, $4::jsonb)
             on conflict (topic_slug, lang) do update set lesson = excluded.lesson, question = excluded.question, created_at = now()`,
            slug, lang, JSON.stringify(lessonT), JSON.stringify(questionT),
          )
          translations[lang] = { lesson: lessonT, question: questionT }
        }
      }
    } catch {
      // Translations are a progressive enhancement — never fail the demo on them.
    }

    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=600, stale-while-revalidate=86400')
    res.json({ data: { demo: {
      slug,
      title:          topic.title,
      lesson,
      question,
      total_sections: secs.length,
      total_questions: qs.length,
      translations,
    } } })
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'failed' })
  }
})

// ─── Password-protected module share (external validation) ───────────────────
// GET returns just the module name (to render the unlock prompt). POST checks the
// password and returns the full module, including questions + correct answers, for review.

publicTrainingRouter.get('/shared/:token', async (req: Request, res: Response) => {
  const token = String(req.params.token ?? '')
  const mod = await (prisma as any).trainingModule.findFirst({
    where:  { share_token: token, share_enabled: true },
    select: { name: true },
  })
  if (!mod) { res.status(404).json({ error: 'not found' }); return }
  res.json({ data: { name: mod.name } })
})

publicTrainingRouter.post('/shared/:token/unlock', async (req: Request, res: Response) => {
  const token = String(req.params.token ?? '')
  const password = String(req.body?.password ?? '')
  const mod = await (prisma as any).trainingModule.findFirst({
    where:  { share_token: token, share_enabled: true },
    select: { name: true, share_password: true, description: true, frequency: true, pass_mark: true, requires_practical: true, learning_content: true, questions: true, standards: true, illustration_key: true },
  })
  if (!mod) { res.status(404).json({ error: 'not found' }); return }
  if (!mod.share_password || password !== mod.share_password) { res.status(401).json({ error: 'Incorrect password' }); return }

  const lc = (mod.learning_content ?? {}) as any
  const sections = Array.isArray(lc.sections)
    ? lc.sections.map((s: any) => ({ heading: String(s?.heading ?? ''), body: String(s?.body ?? ''), image_url: s?.image_key ? illustrationUrl(s.image_key) : null })).filter((s: any) => s.heading || s.body)
    : []
  const questions = Array.isArray(mod.questions)
    ? (mod.questions as any[]).map((q) => ({
        text:        String(q?.text ?? ''),
        options:     Array.isArray(q?.options) ? q.options.map(String) : [],
        correct:     typeof q?.correct === 'number' ? q.correct : null,
        explanation: q?.explanation ? String(q.explanation) : null,
      })).filter((q) => q.text)
    : []
  const standards = Array.isArray(mod.standards) ? (mod.standards as any[]).map(s => s?.label).filter(Boolean) : []

  res.json({ data: { module: {
    name:               mod.name,
    description:        mod.description ?? null,
    frequency:          mod.frequency ?? null,
    pass_mark:          mod.pass_mark ?? null,
    requires_practical: mod.requires_practical ?? false,
    summary:            typeof lc.summary === 'string' ? lc.summary : null,
    outcomes:           Array.isArray(lc.outcomes) ? lc.outcomes.map(String) : [],
    key_points:         Array.isArray(lc.key_points) ? lc.key_points.map(String) : [],
    sections,
    questions,
    standards,
    illustration_url:   mod.illustration_key ? illustrationUrl(mod.illustration_key) : null,
  } } })
})

// Public SEO index for the standard training module pages. Feeds the platform
// console (Blog → Pages and → Alt Tags) so meta and image alt text are editable,
// and the marketing sitemap. Returns one page per built module, plus every image
// (cover + section illustrations) with a suggested default alt. Image `src` is
// the API-relative path; the console/site prefix it with NEXT_PUBLIC_API_URL to
// match the <SiteImage> key. No tenant data, so no auth needed.
publicTrainingRouter.get('/seo-index', async (_req: Request, res: Response) => {
  try {
    const [topics, modules] = await Promise.all([
      (prisma as any).trainingTopic.findMany({ where: { tenant_id: null, is_active: true }, orderBy: { sort_order: 'asc' } }),
      (prisma as any).trainingModule.findMany({
        where:   { tenant_id: null, source: 'ai_generated' },
        select:  { topic_id: true, approved: true, description: true, illustration_key: true, learning_content: true },
        orderBy: [{ approved: 'desc' }, { created_at: 'desc' }],
      }),
    ])
    // Group modules per topic; the first per group is the best (approved, recent).
    const modsByTopic = new Map<string, any[]>()
    for (const m of (modules as any[])) {
      if (!m.topic_id) continue
      if (!modsByTopic.has(m.topic_id)) modsByTopic.set(m.topic_id, [])
      modsByTopic.get(m.topic_id)!.push(m)
    }

    const pages: Array<{ path: string; title: string; description: string; image: string | null }> = []
    const images: Array<{ src: string; alt: string }> = []
    const seenSrc = new Set<string>()
    const pushImg = (key: string | null | undefined, alt: string) => {
      if (!key) return
      const src = illustrationUrl(key)
      if (!src || seenSrc.has(src)) return
      seenSrc.add(src)
      images.push({ src, alt })
    }

    for (const t of (topics as any[])) {
      const mods = modsByTopic.get(t.id) ?? []
      if (!mods.length) continue                       // only built modules get a public page
      const best = mods[0]
      const lc = (best.learning_content ?? {}) as any
      const slug = slugify(t.title)
      const summary = careSetting(typeof lc.summary === 'string' ? lc.summary : (best.description ?? ''))
      // Cover (any version that has one) — also the page's hero, reused as its social image.
      const coverMod = mods.find(x => x.illustration_key)
      pages.push({
        path:        `/staff-training/${slug}`,
        title:       `${t.title} Training for Care Staff | CareStreamAI`,
        description: summary || `${t.title} training for UK care staff: what it covers, who needs it, how often, and how CareStream delivers it in any language.`,
        image:       coverMod?.illustration_key ? illustrationUrl(coverMod.illustration_key) : null,
      })

      // Section illustrations by index (cover already captured above).
      pushImg(coverMod?.illustration_key, careSetting(`${t.title} training`))

      const headings: string[] = Array.isArray(lc.sections) ? lc.sections.map((s: any) => String(s?.heading ?? '')) : []
      const imgByIdx = new Map<number, string>()
      for (const mod of mods) {
        const secs = (mod.learning_content as any)?.sections
        if (!Array.isArray(secs)) continue
        secs.forEach((s: any, i: number) => { if (s?.image_key && !imgByIdx.has(i)) imgByIdx.set(i, s.image_key) })
      }
      for (const [i, key] of imgByIdx) {
        const h = careSetting(headings[i] ?? '')
        pushImg(key, h ? `${t.title} training: ${h}` : `${t.title} training illustration`)
      }
    }

    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400')
    res.json({ data: { pages, images } })
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'failed' })
  }
})

// POST /public/training/basket-event — anonymous add-to-basket / checkout-started
// counter for the public shop (powers platform Basket Analytics). Fire-and-forget
// from the web cart; no personal data stored, always responds ok.
publicTrainingRouter.post('/basket-event', async (req: Request, res: Response) => {
  try {
    const kind = String(req.body?.kind ?? 'add')
    const slug = String(req.body?.module_slug ?? '').trim().slice(0, 120)
    const qty  = Math.max(1, Math.min(500, Math.floor(Number(req.body?.quantity)) || 1))
    if ((kind === 'add' || kind === 'checkout') && slug) {
      await (prisma as any).basketEvent.create({ data: { kind, module_slug: slug, quantity: qty } }).catch(() => {})
    }
  } catch { /* never fail the shop over analytics */ }
  res.json({ data: { ok: true } })
})

// GET /public/training/licence-price — unit price (pence) for the buy page total.
publicTrainingRouter.get('/licence-price', (_req: Request, res: Response) => {
  res.json({ data: { unit_pence: TRAINING_LICENCE_PENCE, currency: 'gbp' } })
})

// POST /public/training/checkout — start a one-off purchase of N training licences
// for one module (training-only gateway tier). Returns the Stripe Checkout URL.
// Public + unauthenticated: the buyer is usually a brand-new prospect; the account
// is provisioned on return (reconcile), not before payment.
publicTrainingRouter.post('/checkout', async (req: Request, res: Response) => {
  try {
    const { module_slug, quantity, email, org_name } = req.body ?? {}
    const slug = String(module_slug ?? '').trim()
    const qty  = Math.floor(Number(quantity))
    const mail = String(email ?? '').trim().toLowerCase()
    const org  = String(org_name ?? '').trim()
    if (!slug || !org || !Number.isFinite(qty) || qty < 1) {
      res.status(400).json({ error: 'module_slug, quantity and org_name are required' }); return
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) { res.status(400).json({ error: 'A valid email is required' }); return }

    // Resolve the module name from its topic (snapshot for the receipt + licence).
    const topics = await (prisma as any).trainingTopic.findMany({ where: { tenant_id: null, is_active: true }, select: { title: true } })
    const topic = (topics as any[]).find(t => slugify(t.title) === slug)
    if (!topic) { res.status(404).json({ error: 'Unknown training module' }); return }

    const url = await createTrainingCheckoutSession({ moduleSlug: slug, moduleName: topic.title, quantity: qty, email: mail, orgName: org })
    res.json({ data: { url } })
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'checkout failed' })
  }
})

// POST /public/training/checkout-basket — start a one-off purchase of a BASKET of
// licences across several modules. The volume discount is applied to the total
// number of licences. Provisioning happens on return (same reconcile endpoint).
publicTrainingRouter.post('/checkout-basket', async (req: Request, res: Response) => {
  try {
    const { items, email, org_name } = req.body ?? {}
    const mail = String(email ?? '').trim().toLowerCase()
    const org  = String(org_name ?? '').trim()
    if (!Array.isArray(items) || items.length === 0) { res.status(400).json({ error: 'items are required' }); return }
    if (!org) { res.status(400).json({ error: 'org_name is required' }); return }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) { res.status(400).json({ error: 'A valid email is required' }); return }

    const topics = await (prisma as any).trainingTopic.findMany({ where: { tenant_id: null, is_active: true }, select: { title: true } })
    const bySlug = new Map((topics as any[]).map(t => [slugify(t.title), t.title] as const))

    const built: { moduleSlug: string; moduleName: string; quantity: number }[] = []
    for (const it of items) {
      const slug = String(it?.module_slug ?? '').trim()
      const qty  = Math.floor(Number(it?.quantity))
      if (!slug || !Number.isFinite(qty) || qty < 1) continue
      const name = bySlug.get(slug)
      if (!name) { res.status(404).json({ error: `Unknown training module: ${slug}` }); return }
      built.push({ moduleSlug: slug, moduleName: name, quantity: qty })
    }
    if (!built.length) { res.status(400).json({ error: 'No valid items in the basket' }); return }

    const url = await createTrainingBasketCheckoutSession({ items: built, email: mail, orgName: org })
    res.json({ data: { url } })
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'checkout failed' })
  }
})

// A URL-safe, unique tenant slug from an org name (mirrors auth.ts registration).
async function uniqueTrainingSlug(orgName: string): Promise<string> {
  const base = (orgName || 'service').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'service'
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`
    const clash = await (prisma as any).tenant.findFirst({ where: { OR: [{ slug }, { email_domain: slug }] }, select: { id: true } })
    if (!clash) return slug
  }
  return `${base}-${Date.now().toString(36)}`
}

// POST /public/training/checkout/reconcile — after the Stripe return, verify the
// payment and provision: a training-only tenant + admin user + N licences (pooled,
// unallocated) + a passwordless login email. Idempotent on the Stripe payment id.
publicTrainingRouter.post('/checkout/reconcile', async (req: Request, res: Response) => {
  try {
    const sessionId = String(req.body?.session_id ?? '').trim()
    if (!sessionId) { res.status(400).json({ error: 'session_id is required' }); return }

    const s = await retrieveTrainingCheckoutSession(sessionId)
    if (!s) { res.status(404).json({ error: 'Checkout session not found' }); return }
    if (!s.paid) { res.status(402).json({ error: 'Payment not complete yet' }); return }

    // Idempotent: if licences already exist for this payment, just report success.
    const existing = await (prisma as any).trainingLicense.findFirst({ where: { stripe_payment_id: s.paymentId }, select: { id: true } })
    if (existing) { res.json({ data: { provisioned: true, already: true, email: s.email } }); return }

    const orgName   = s.metadata.org_name || 'Your service'
    const email     = (s.email || s.metadata.email || '').toLowerCase()
    const adminName = s.customerName || orgName
    const consoleTenantId = String(s.metadata.tenant_id || '')
    if (!email && !consoleTenantId) { res.status(400).json({ error: 'No email on the payment' }); return }

    // Build the list of {slug, qty} to provision — from the basket metadata for a
    // multi-course order, otherwise the single module.
    let items: { slug: string; qty: number }[] = []
    if (s.metadata.kind === 'training_basket' && s.metadata.basket) {
      try {
        items = (JSON.parse(s.metadata.basket) as Array<{ s: string; q: number }>)
          .map(b => ({ slug: String(b.s), qty: Math.max(1, Math.min(500, Math.floor(Number(b.q) || 1))) }))
          .filter(b => b.slug)
      } catch { items = [] }
    }
    if (!items.length) {
      const slug = s.metadata.module_slug || ''
      const qty  = Math.max(1, Math.min(500, parseInt(s.metadata.quantity || '1', 10) || 1))
      if (slug) items = [{ slug, qty }]
    }
    if (!items.length) { res.status(400).json({ error: 'No items on the payment' }); return }

    const topics = await (prisma as any).trainingTopic.findMany({ where: { tenant_id: null, is_active: true }, select: { id: true, title: true } })
    const bySlug = new Map((topics as any[]).map(t => [slugify(t.title), t] as const))
    const renewalDue = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)

    // In-console purchase by a signed-in tenant (metadata.tenant_id): attach the
    // licences straight to that tenant — no provisioning, no sign-in/password emails.
    let user = email ? await (prisma as any).user.findUnique({ where: { email }, select: { id: true, tenant_id: true, name: true } }) : null
    let tenantId = ''
    if (consoleTenantId) {
      const t = await (prisma as any).tenant.findUnique({ where: { id: consoleTenantId }, select: { id: true } })
      if (t) tenantId = t.id
    }
    // Otherwise: attach to an existing account if the email is already known, else
    // create a new training-only tenant + admin.
    if (!tenantId && user) {
      tenantId = user.tenant_id
    } else if (!tenantId) {
      const slug = await uniqueTrainingSlug(orgName)
      const tenant = await (prisma as any).tenant.create({
        data: { name: orgName, slug, email_domain: slug, tier: 'training_only', subscription_status: 'active', branding_signoff: 'The CareStream Team' },
      })
      // Passwordless: a random hash satisfies the non-null column; they sign in via
      // the magic login link (and can set a password later if they want).
      const tempHash = await hashPassword(crypto.randomBytes(12).toString('base64url'))
      user = await (prisma as any).user.create({
        data: { tenant_id: tenant.id, email, name: adminName, role: 'admin', email_verified: true, password_hash: tempHash },
      })
      tenantId = tenant.id

      // New account: alongside the magic sign-in link, send a set-your-password email
      // (7-day token via the standard reset flow) so the buyer always has a second way
      // in — one-time magic links can be consumed by email security scanners.
      const setupToken = crypto.randomBytes(24).toString('base64url')
      await (prisma as any).user.update({
        where: { id: user.id },
        data:  { password_reset_token: setupToken, password_reset_token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      }).catch(() => {})
      await sendPasswordSetupEmail(email, adminName, `${siteUrl()}/reset-password?token=${setupToken}`)
        .catch((e: any) => console.error('[training-checkout] password setup email failed:', e?.message ?? e))
    }

    // One pooled licence per seat, per module, all tagged with the Stripe payment id.
    let totalLicences = 0
    for (const it of items) {
      const topic = bySlug.get(it.slug)
      await (prisma as any).trainingLicense.createMany({
        data: Array.from({ length: it.qty }, () => ({
          tenant_id: tenantId, topic_id: topic?.id ?? null, module_slug: it.slug, module_name: topic?.title ?? it.slug,
          price_pence: TRAINING_LICENCE_PENCE, currency: 'gbp', stripe_payment_id: s.paymentId, renewal_due_at: renewalDue,
        })),
      })
      totalLicences += it.qty
    }

    // Sign-in email only for shop purchases — a console buyer is already signed in.
    if (!consoleTenantId && user) {
      const link = await createLoginLink(user.id, tenantId, 14 * 24 * 60 * 60 * 1000)
      await sendStaffLoginLinkEmail({ to: email, name: adminName, link, expiresMins: 14 * 24 * 60 }).catch((e: any) => console.error('[training-checkout] login email failed:', e?.message ?? e))
    }

    res.json({ data: { provisioned: true, email, licences: totalLicences, modules: items.length } })
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'reconcile failed' })
  }
})

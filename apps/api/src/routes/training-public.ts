import { Router, Request, Response } from 'express'
import { downloadFile } from '../services/storage/s3'
import { prisma } from '../db/client'
import { illustrationUrl } from '../services/training/moduleImage'
import { TOPIC_GROUP_LABELS } from '../data/training-topics'
import { CARE_SETTINGS, SETTING_LABELS } from '../lib/care-setting'
import { createTrainingCheckoutSession, TRAINING_LICENCE_PENCE, retrieveTrainingCheckoutSession } from '../services/billing/stripe'
import { createLoginLink } from '../lib/login-tokens'
import { sendStaffLoginLinkEmail } from '../services/email/outbound'
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

    const pages: Array<{ path: string; title: string; description: string }> = []
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
      pages.push({
        path:        `/staff-training/${slug}`,
        title:       `${t.title} Training for Care Staff | CareStreamAI`,
        description: summary || `${t.title} training for UK care staff: what it covers, who needs it, how often, and how CareStream delivers it in any language.`,
      })

      // Cover (any version that has one), then section illustrations by index.
      const coverMod = mods.find(x => x.illustration_key)
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

    const moduleSlug = s.metadata.module_slug || ''
    const moduleName = s.metadata.module_name || moduleSlug
    const qty        = Math.max(1, Math.min(500, parseInt(s.metadata.quantity || '1', 10) || 1))
    const orgName    = s.metadata.org_name || 'Your service'
    const email      = (s.email || s.metadata.email || '').toLowerCase()
    const adminName  = s.customerName || orgName
    if (!email) { res.status(400).json({ error: 'No email on the payment' }); return }

    const topics = await (prisma as any).trainingTopic.findMany({ where: { tenant_id: null, is_active: true }, select: { id: true, title: true } })
    const topicId = (topics as any[]).find(t => slugify(t.title) === moduleSlug)?.id ?? null
    const renewalDue = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)

    // Attach to an existing account if the email is already known, else create a
    // new training-only tenant + admin.
    let user = await (prisma as any).user.findUnique({ where: { email }, select: { id: true, tenant_id: true, name: true } })
    let tenantId: string
    if (user) {
      tenantId = user.tenant_id
    } else {
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
    }

    await (prisma as any).trainingLicense.createMany({
      data: Array.from({ length: qty }, () => ({
        tenant_id: tenantId, topic_id: topicId, module_slug: moduleSlug, module_name: moduleName,
        price_pence: TRAINING_LICENCE_PENCE, currency: 'gbp', stripe_payment_id: s.paymentId, renewal_due_at: renewalDue,
      })),
    })

    const link = await createLoginLink(user.id, tenantId, 14 * 24 * 60 * 60 * 1000)
    await sendStaffLoginLinkEmail({ to: email, name: adminName, link, expiresMins: 14 * 24 * 60 }).catch((e: any) => console.error('[training-checkout] login email failed:', e?.message ?? e))

    res.json({ data: { provisioned: true, email, licences: qty, module: moduleName } })
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'reconcile failed' })
  }
})

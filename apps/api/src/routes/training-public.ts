import { Router, Request, Response } from 'express'
import { downloadFile } from '../services/storage/s3'
import { prisma } from '../db/client'
import { illustrationUrl } from '../services/training/moduleImage'
import { TOPIC_GROUP_LABELS } from '../data/training-topics'

const slugify = (s: string): string =>
  s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

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
        frequency:          txt?.frequency ?? t.default_frequency,
        requires_practical: t.requires_practical,
        built:              !!txt,
        description:        txt?.description ?? null,
        duration_minutes:   txt?.duration_minutes ?? null,
        pass_mark:          txt?.pass_mark ?? null,
        illustration_url:   cover ? illustrationUrl(cover.illustration_key) : null,
      }
    })
    res.json({ data: { groups: TOPIC_GROUP_LABELS, topics: items } })
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'failed' })
  }
})

// Public detail for one standard training subject, for the per-module marketing
// pages. Returns the high-level outline only (summary, outcomes, key points,
// section headings, mapped standards) — never the full lesson text.
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
    const sections = Array.isArray(lc.sections) ? lc.sections.map((s: any) => s?.heading).filter(Boolean) : []
    const standards = Array.isArray(m?.standards) ? (m.standards as any[]).map(s => s?.label).filter(Boolean) : []

    res.json({ data: { module: {
      slug,
      title:              topic.title,
      group_key:          topic.group_key,
      group_label:        TOPIC_GROUP_LABELS[topic.group_key] ?? topic.group_key,
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

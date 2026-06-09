import { Router, Request, Response } from 'express'
import { downloadFile } from '../services/storage/s3'
import { prisma } from '../db/client'
import { illustrationUrl } from '../services/training/moduleImage'
import { TOPIC_GROUP_LABELS } from '../data/training-topics'

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
      (prisma as any).trainingModule.findMany({
        where:  { tenant_id: null, source: 'ai_generated', approved: true },
        select: { id: true, topic_id: true, description: true, frequency: true, duration_minutes: true, pass_mark: true, illustration_key: true },
      }),
    ])
    const byTopic = new Map<string, any>()
    for (const m of (modules as any[])) { if (m.topic_id) byTopic.set(m.topic_id, m) }
    const items = (topics as any[]).map(t => {
      const m = byTopic.get(t.id)
      return {
        title:              t.title,
        group_key:          t.group_key,
        frequency:          m?.frequency ?? t.default_frequency,
        requires_practical: t.requires_practical,
        built:              !!m,
        description:        m?.description ?? null,
        duration_minutes:   m?.duration_minutes ?? null,
        pass_mark:          m?.pass_mark ?? null,
        illustration_url:   m ? illustrationUrl(m.illustration_key) : null,
      }
    })
    res.json({ data: { groups: TOPIC_GROUP_LABELS, topics: items } })
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'failed' })
  }
})

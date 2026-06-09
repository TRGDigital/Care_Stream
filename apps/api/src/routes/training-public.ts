import { Router, Request, Response } from 'express'
import { downloadFile } from '../services/storage/s3'
import { prisma } from '../db/client'
import { illustrationUrl } from '../services/training/moduleImage'

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

// Public list of the published standard (annual mandatory) training modules, for
// the marketing site. These are the shared library modules: tenant_id = null,
// source = ai_generated, approved = true. No tenant data, so no auth needed.
publicTrainingRouter.get('/standard-modules', async (_req: Request, res: Response) => {
  try {
    const mods = await (prisma as any).trainingModule.findMany({
      where:  { tenant_id: null, source: 'ai_generated', approved: true },
      select: {
        id: true, name: true, description: true, frequency: true,
        duration_minutes: true, pass_mark: true, cpd_accredited: true,
        independently_reviewed: true, illustration_key: true,
      },
      orderBy: { name: 'asc' },
    })
    const modules = (mods as any[]).map(m => ({
      id:               m.id,
      name:             m.name,
      description:      m.description,
      frequency:        m.frequency,
      duration_minutes: m.duration_minutes,
      pass_mark:        m.pass_mark,
      cpd_accredited:   m.cpd_accredited,
      independently_reviewed: m.independently_reviewed,
      illustration_url: illustrationUrl(m.illustration_key),
    }))
    res.json({ data: { modules } })
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'failed' })
  }
})

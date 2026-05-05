import { Router } from 'express'

export const regulationsRouter = Router()

// GET /regulations — list active external regulations (§6, §12.1)
regulationsRouter.get('/', (_req, res) => res.json({ success: true }))

// GET /regulations/:key — full knowledge base entry by reference_key (e.g. 'gdpr')
regulationsRouter.get('/:key', (_req, res) => res.json({ success: true }))

// POST /admin/regulations/sync — trigger Google Sheets sync (platform admin only) (§6.5)
regulationsRouter.post('/sync', (_req, res) => res.json({ success: true }))

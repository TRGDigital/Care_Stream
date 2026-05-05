import { Router } from 'express'

export const queryRouter = Router()

// POST /query — submit chat query; runs RAG pipeline + Claude (§4.1.2)
// Language detected before RAG; routes to Prompt A or B (§4.3.1)
// Searches: internal_policy | staff_handbook | external_regulation per §4.6.5
queryRouter.post('/', (_req, res) => res.json({ success: true }))

// GET /queries — list query history for tenant (admin only)
queryRouter.get('/', (_req, res) => res.json({ success: true }))

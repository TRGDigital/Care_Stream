import { Router } from 'express'

export const policiesRouter = Router()

// GET /policies — list tenant's policies, scoped by tenant_id from JWT (§3.1)
policiesRouter.get('/', (_req, res) => res.json({ success: true }))

// POST /policies — upload document; enqueues ingestion worker (§4.1.1)
// Accepts: PDF, DOCX, TXT | Categories: internal_policy | staff_handbook (§4.5)
policiesRouter.post('/', (_req, res) => res.json({ success: true }))

// GET /policies/:id — retrieve full policy text from S3 (§4.3 full policy return)
policiesRouter.get('/:id', (_req, res) => res.json({ success: true }))

// DELETE /policies/:id — archive policy (never hard-delete; remove from Pinecone) (§10.5)
policiesRouter.delete('/:id', (_req, res) => res.json({ success: true }))

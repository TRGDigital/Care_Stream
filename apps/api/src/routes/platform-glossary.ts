import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { requirePlatformAdmin } from '../middleware/auth'

// Platform-owner management of the UNIVERSAL translation glossary — term-locking
// that applies to every tenant, merged under each tenant's own glossary (a tenant
// entry for the same term wins). Consumed by apps/api/src/lib/translate.ts.
export const platformGlossaryRouter = Router()
platformGlossaryRouter.use(requirePlatformAdmin)

function clean(term: unknown): string {
  return typeof term === 'string' ? term.trim().slice(0, 120) : ''
}

// ─── GET / — list all universal terms ──────────────────────────────────────────
platformGlossaryRouter.get('/', async (_req: Request, res: Response) => {
  const terms = await (prisma as any).platformGlossary.findMany({ orderBy: { term: 'asc' } })
  ok(res, { terms })
})

// ─── POST / — add a term ────────────────────────────────────────────────────────
platformGlossaryRouter.post('/', async (req: Request, res: Response) => {
  const term = clean(req.body?.term)
  if (!term) return err(res, 'INVALID_INPUT', 'A term is required', 400)
  const keep = req.body?.keep !== false
  const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 200) : ''

  // Case-insensitive dedupe.
  const existing = await (prisma as any).platformGlossary.findFirst({ where: { term: { equals: term, mode: 'insensitive' } } })
  if (existing) return err(res, 'DUPLICATE', 'That term is already in the universal glossary', 409)

  const created = await (prisma as any).platformGlossary.create({ data: { term, keep, note } })
  ok(res, { term: created })
})

// ─── PATCH /:id — edit keep / note ──────────────────────────────────────────────
platformGlossaryRouter.patch('/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id)
  const existing = await (prisma as any).platformGlossary.findUnique({ where: { id } })
  if (!existing) return err(res, 'NOT_FOUND', 'Term not found', 404)
  const data: Record<string, any> = {}
  if (req.body?.keep !== undefined) data.keep = !!req.body.keep
  if (req.body?.note !== undefined) data.note = typeof req.body.note === 'string' ? req.body.note.trim().slice(0, 200) : ''
  const term = await (prisma as any).platformGlossary.update({ where: { id }, data })
  ok(res, { term })
})

// ─── DELETE /:id ────────────────────────────────────────────────────────────────
platformGlossaryRouter.delete('/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id)
  const existing = await (prisma as any).platformGlossary.findUnique({ where: { id } })
  if (!existing) return err(res, 'NOT_FOUND', 'Term not found', 404)
  await (prisma as any).platformGlossary.delete({ where: { id } })
  ok(res, { deleted: true })
})

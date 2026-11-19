// Platform Console: request indexing for the public scenario pages (via RalfyIndex, the same service
// that indexes training pages). Only scenario URLs on the canonical host are accepted, at most 50 a call.

import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { requirePlatformAdmin } from '../middleware/auth'
import { submitUrlsForIndexing, ralfyIndexBalance } from '../services/ralfyindex/indexer'

export const seoIndexRouter = Router()
seoIndexRouter.use(requirePlatformAdmin)

const ALLOWED = /^https:\/\/www\.carestreamai\.com\/scenarios(\/[a-z0-9-]+)?$/

seoIndexRouter.post('/submit', async (req: Request, res: Response) => {
  const raw: unknown[] = Array.isArray(req.body?.urls) ? req.body.urls : []
  const urls = Array.from(new Set(raw.map(u => String(u).trim()).filter(u => ALLOWED.test(u)))).slice(0, 50)
  if (!urls.length) { err(res, 'VALIDATION_ERROR', 'Send one or more https://www.carestreamai.com/scenarios URLs.'); return }

  const cfg = await (prisma as any).ralfyIndexConfig.findUnique({ where: { id: 'singleton' } }).catch(() => null)
  if (!cfg?.enabled || !cfg?.api_key) { err(res, 'NOT_CONFIGURED', 'RalfyIndex is not set up or is switched off, so nothing was submitted.', 409); return }

  const balance = await ralfyIndexBalance()
  if (balance !== null && balance < urls.length) {
    err(res, 'NO_CREDITS', `RalfyIndex has ${balance} credits and ${urls.length} URLs were requested (1 credit each). Top up first.`, 402); return
  }

  await submitUrlsForIndexing(urls, { source: 'page', force: !!req.body?.force })

  const rows = await (prisma as any).ralfyIndexSubmission.findMany({
    where: { url: { in: urls } }, orderBy: { created_at: 'desc' }, select: { url: true, status: true, created_at: true },
  }).catch(() => [])
  const latest = new Map<string, { status: string; created_at: Date }>()
  for (const r of rows as any[]) if (!latest.has(r.url)) latest.set(r.url, r)
  ok(res, {
    requested: urls.length,
    balance_before: balance,
    results: urls.map(u => ({ url: u, status: latest.get(u)?.status ?? 'not submitted', at: latest.get(u)?.created_at ?? null })),
  })
})

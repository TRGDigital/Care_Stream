// POST /public/page-visit: the site's own visit tracker (components/marketing/site-tracker.tsx). Public and unauthenticated, so everything is
// cleaned by lib/site-visit.ts first; the rate limit for /public applies. Always answers 204 so a failure can never affect a visitor.
import express, { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { cleanVisit } from '../lib/site-visit'

export const siteVisitsRouter = Router()
// The browser sends text/plain (a "simple" request: no CORS preflight, and sendBeacon works while the page closes); the JSON is read from the text.
siteVisitsRouter.use(express.text({ type: 'text/plain', limit: '20kb' }))

siteVisitsRouter.post('/', async (req: Request, res: Response) => {
  try {
    let body = req.body
    if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = null } }   // sendBeacon can arrive as text
    const v = cleanVisit(body, req.get('user-agent'))
    if (v) {
      const { id, ...rest } = v
      await (prisma as any).siteVisit.upsert({
        where: { id },
        create: { id, ...rest, clicks: rest.clicks as any },
        // A later beat only ever adds: the numbers never go down and conversions are merged, so a late or repeated beat cannot lose anything.
        update: { ended_at: rest.ended_at ?? undefined, active_seconds: rest.active_seconds, elapsed_seconds: rest.elapsed_seconds, max_scroll_pct: rest.max_scroll_pct, interactions: rest.interactions, clicks: rest.clicks as any, conversions: rest.conversions, next_path: rest.next_path ?? undefined },
      })
    }
  } catch { /* never affects the visitor */ }
  res.status(204).end()
})

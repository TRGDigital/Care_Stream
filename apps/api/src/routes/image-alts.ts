import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok } from '../lib/response'

// Public, unauthenticated alt-text map for static site images — consumed by the
// marketing site's <SiteImage> component. Mounted before requireAuth in app.ts.
// Platform-level (no tenant scoping).
export const publicImageAltsRouter = Router()

// GET /public/image-alts — { alts: { [src]: alt } }
publicImageAltsRouter.get('/', async (_req: Request, res: Response) => {
  const rows = await (prisma as any).siteImageAlt.findMany({ select: { src: true, alt: true } })
  const alts: Record<string, string> = {}
  for (const r of rows) if (r.alt) alts[r.src] = r.alt
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400')
  ok(res, { alts })
})

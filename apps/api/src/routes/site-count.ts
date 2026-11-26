// POST /public/page-count: counts every public page view anonymously (components/marketing/page-counter.tsx). Public and unauthenticated; always 204 so a
// failure can never affect a visitor. See lib/site-count.ts for what is and is not kept.
import express, { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { cleanCount } from '../lib/site-count'

export const siteCountRouter = Router()
siteCountRouter.use(express.text({ type: 'text/plain', limit: '4kb' }))

siteCountRouter.post('/', async (req: Request, res: Response) => {
  try {
    let body: any = req.body
    if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = null } }
    const c = cleanCount(body, req.get('user-agent'))
    if (c) {
      await (prisma as any).$executeRaw`
        insert into public.site_page_counts (day, path, source, device, views) values (${c.day}::date, ${c.path}, ${c.source}, ${c.device}, 1)
        on conflict (day, path, source, device) do update set views = public.site_page_counts.views + 1`
    }
  } catch { /* never affects the visitor */ }
  res.status(204).end()
})

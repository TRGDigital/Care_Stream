// Pictures for the audit cards on /care-audits.
//   GET /public/audit-images                    the pictures made so far: { images: { <key>: { url, alt } } }
//   cron generateAuditImages(limit)             makes the next few missing pictures (see data/audit-image-scenes.ts), in the house style
// Generation is deliberately a few at a time (each takes about a minute) and idempotent: a key that already has a picture is skipped.

import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok } from '../lib/response'
import { generateContentImage } from '../services/policy-shop/shopImage'
import { AUDIT_IMAGE_SCENES } from '../data/audit-image-scenes'

const p = () => prisma as any
const ABSOLUTE = (path: string) => (/^https?:/.test(path) ? path : `${(process.env.API_PUBLIC_URL || 'https://api.carestreamai.com').replace(/\/$/, '')}${path}`)

export const auditImagesPublicRouter = Router()
auditImagesPublicRouter.get('/', async (_req: Request, res: Response) => {
  let rows: any[] = []
  try { rows = await p().auditImage.findMany() } catch { rows = [] }   // the table may not exist yet: no pictures, cards stay text only
  const images: Record<string, { url: string; alt: string }> = {}
  for (const r of rows) images[r.key] = { url: ABSOLUTE(r.url), alt: r.alt }
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600')
  ok(res, { images, total: AUDIT_IMAGE_SCENES.length, made: rows.length })
})

export async function generateAuditImages(limit: number, dryRun = false) {
  const have = new Set<string>((await p().auditImage.findMany({ select: { key: true } })).map((r: any) => r.key))
  const todo = AUDIT_IMAGE_SCENES.filter(s => !have.has(s.key))
  const out = { total: AUDIT_IMAGE_SCENES.length, already: have.size, remaining_before: todo.length, made: [] as string[], failed: [] as Array<{ key: string; error: string }> }
  if (dryRun) return out
  for (const s of todo.slice(0, Math.max(0, Math.min(limit, 6)))) {
    try {
      const url = await generateContentImage(s.topic, s.scene, s.key)
      await p().auditImage.create({ data: { key: s.key, url, alt: s.alt } })
      out.made.push(s.key)
    } catch (e: any) { out.failed.push({ key: s.key, error: String(e?.message ?? e).slice(0, 160) }) }
  }
  return { ...out, remaining_after: todo.length - out.made.length }
}

// ── Hero pictures for the blog drafts listed in data/blog-hero-scenes.ts ──
import { BLOG_HERO_SCENES } from '../data/blog-hero-scenes'
export async function generateBlogHeroes(limit: number, dryRun = false) {
  const out = { listed: BLOG_HERO_SCENES.length, needing: [] as string[], made: [] as string[], missing_posts: [] as string[], failed: [] as Array<{ slug: string; error: string }> }
  for (const s of BLOG_HERO_SCENES) {
    const post = await p().blogPost.findUnique({ where: { slug: s.slug }, select: { id: true, feature_image_url: true } })
    if (!post) { out.missing_posts.push(s.slug); continue }
    if (!post.feature_image_url) out.needing.push(s.slug)
  }
  if (dryRun) return out
  for (const slug of out.needing.slice(0, Math.max(0, Math.min(limit, 4)))) {
    const s = BLOG_HERO_SCENES.find(x => x.slug === slug)!
    try {
      const url = ABSOLUTE(await generateContentImage(s.topic, s.scene, `hero-${s.slug}`))
      await p().blogPost.update({ where: { slug: s.slug }, data: { feature_image_url: url, feature_image_alt: s.alt } })
      out.made.push(s.slug)
    } catch (e: any) { out.failed.push({ slug, error: String(e?.message ?? e).slice(0, 160) }) }
  }
  return { ...out, remaining_after: out.needing.length - out.made.length }
}

// Platform Console → Policy Images.
//
// The shop pages need two libraries of artwork: a HERO per policy, and one image per
// piece of LEGISLATION. They are kept apart on purpose: the 65 policies cite only 57
// distinct regulations, so keying the legislation art by reference_key means a law
// like Regulation 13 is drawn once and reused on every policy that cites it.
//
// Which regulations a policy is analysed against is resolved live from
// expected_policy_titles, exactly as the public shop endpoint resolves it, so this
// list can never drift from what the pages actually render.

import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { requirePlatformAdmin } from '../middleware/auth'
import {
  generatePolicyHeroImage, generateRegulationImage, shopImageUrl,
} from '../services/policy-shop/shopImage'
import { titleVariants } from './policy-shop-public'

export const platformPolicyImagesRouter = Router()
platformPolicyImagesRouter.use(requirePlatformAdmin)

// ─── GET / — both libraries, with what is done and what is still missing ──────
platformPolicyImagesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const [products, regs] = await Promise.all([
      (prisma as any).policyProduct.findMany({
        where:   { active: true },
        select:  { slug: true, title: true, description: true, price_pence: true, image_key: true },
        orderBy: { sort_order: 'asc' },
      }),
      (prisma as any).externalRegulation.findMany({
        select: { reference_key: true, official_name: true, expected_policy_titles: true, image_key: true },
      }),
    ])

    // Count how many policies each regulation appears on, so the ones worth doing
    // first are obvious. A regulation nothing cites is not listed at all.
    const used = new Map<string, number>()
    for (const p of products as any[]) {
      const variants = new Set(titleVariants(p.title).map(v => v.toLowerCase()))
      for (const r of regs as any[]) {
        const titles: string[] = r.expected_policy_titles ?? []
        if (titles.some(t => variants.has(String(t).toLowerCase()))) {
          used.set(r.reference_key, (used.get(r.reference_key) ?? 0) + 1)
        }
      }
    }

    const regulations = (regs as any[])
      .filter(r => used.has(r.reference_key))
      .map(r => ({
        reference_key: r.reference_key,
        official_name: r.official_name,
        used_by:       used.get(r.reference_key) ?? 0,
        image_url:     shopImageUrl(r.image_key),
      }))
      .sort((a, b) => b.used_by - a.used_by || a.official_name.localeCompare(b.official_name))

    ok(res, {
      policies: (products as any[]).map(p => ({
        slug: p.slug, title: p.title, description: p.description,
        price_pence: p.price_pence, image_url: shopImageUrl(p.image_key),
      })),
      regulations,
    })
  } catch (e: any) {
    err(res, 'IMAGES_FAILED', e?.message ?? 'could not read the image library', 500)
  }
})

// ─── POST /policy/:slug — generate (or regenerate) one policy hero ────────────
platformPolicyImagesRouter.post('/policy/:slug', async (req: Request, res: Response) => {
  const slug = String(req.params.slug)
  try {
    const key = await generatePolicyHeroImage(slug)
    ok(res, { slug, image_url: shopImageUrl(key) })
  } catch (e: any) {
    err(res, 'GENERATE_FAILED', e?.message ?? 'could not generate that image', 500)
  }
})

// ─── POST /regulation/:key — generate (or regenerate) one legislation image ───
platformPolicyImagesRouter.post('/regulation/:key', async (req: Request, res: Response) => {
  const reference_key = String(req.params.key)
  try {
    const key = await generateRegulationImage(reference_key)
    ok(res, { reference_key, image_url: shopImageUrl(key) })
  } catch (e: any) {
    err(res, 'GENERATE_FAILED', e?.message ?? 'could not generate that image', 500)
  }
})

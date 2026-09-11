// Public, unauthenticated data for the policy shop's marketing pages.
//
// Serves a product with the two things the page demonstrates: the intake fields we
// collect to write the buyer's copy (labels only — this is a demo, not a form), and
// the legislation the policy is analysed against, resolved live from the regulation
// library via expected_policy_titles so the page can never drift from what the
// verification gate actually checks.

import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'

export const policyShopPublicRouter = Router()

// Title variants a home might use for the same document, so the regulation lookup
// matches the library's expected titles.
function titleVariants(title: string): string[] {
  const t = title.trim()
  const variants = new Set<string>([t])
  variants.add(t.replace(/ and /g, ' & '))
  variants.add(t.replace(/ & /g, ' and '))
  // "Safeguarding Adults Policy" → also try "Safeguarding Policy"
  const words = t.replace(/ Policy$/i, '').split(' ')
  if (words.length > 1) variants.add(`${words[0]} Policy`)
  return [...variants]
}

// GET /products/:slug — one product, its intake demo and the regulations analysed.
policyShopPublicRouter.get('/products/:slug', async (req: Request, res: Response) => {
  try {
    const product = await (prisma as any).policyProduct.findFirst({
      where: { slug: String(req.params.slug), active: true },
    })
    if (!product) return err(res, 'NOT_FOUND', 'That policy was not found', 404)

    const [bundles, regs] = await Promise.all([
      (prisma as any).policyBundle.findMany({
        where: { key: { in: product.bundle_keys ?? [] }, active: true },
        select: { key: true, title: true, price_pence: true },
      }),
      (prisma as any).externalRegulation.findMany({
        where: { expected_policy_titles: { hasSome: titleVariants(product.title) } },
        select: { reference_key: true, official_name: true, summary: true, required_elements: true },
        orderBy: { official_name: 'asc' },
      }).catch(() => [] as any[]),
    ])

    // Related policies: siblings from the same bundles (the natural next purchases),
    // Complete Library membership excluded since everything shares it.
    const meaningfulBundles = (product.bundle_keys ?? []).filter((k: string) => k !== 'complete-library')
    const related = meaningfulBundles.length
      ? await (prisma as any).policyProduct.findMany({
          where: { active: true, slug: { not: product.slug }, bundle_keys: { hasSome: meaningfulBundles } },
          select: { slug: true, title: true, description: true, price_pence: true, taster: true },
          orderBy: { sort_order: 'asc' },
          take: 6,
        }).catch(() => [] as any[])
      : []

    ok(res, {
      product: {
        slug: product.slug, title: product.title, description: product.description,
        price_pence: product.price_pence, taster: product.taster,
        // Labels and help only — the page shows WHAT we ask, never anyone's answers.
        intake_fields: ((product.intake_fields as any[]) ?? []).map(f => ({
          key: f.key, label: f.label, help: f.help ?? null, shared: f.shared === true,
        })),
      },
      bundles,
      regulations: (regs as any[]).map(r => ({
        reference_key: r.reference_key,
        official_name: r.official_name,
        summary: r.summary ?? '',
        required_elements_count: Array.isArray(r.required_elements) ? r.required_elements.length : 0,
        // The curated elements themselves are the page's bullet-point key facts.
        key_facts: (Array.isArray(r.required_elements) ? r.required_elements : []).slice(0, 6),
      })),
      related,
    })
  } catch (e: any) {
    err(res, 'PRODUCT_FAILED', e?.message ?? 'could not load that policy', 500)
  }
})

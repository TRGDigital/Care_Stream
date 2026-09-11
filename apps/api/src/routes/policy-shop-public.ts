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

// The curated required_elements are written as instructions to the WRITER ("Policy
// must designate a named Safeguarding Lead…"), which is right for the verification
// gate and wrong for a buyer reading a sales page. This turns each one into a
// statement about the document they are buying ("Designates a named Safeguarding
// Lead…") for DISPLAY ONLY: the stored elements are never touched, because the gate
// compares against them.
//
// Elements already written as noun phrases ("A process for…", "Definition and
// recognition criteria…") read correctly as they are and are left alone.
function thirdPerson(verb: string): string {
  const v = verb.toLowerCase()
  if (/[^aeiou]y$/.test(v)) return `${v.slice(0, -1)}ies`      // specify → specifies
  if (/(s|sh|ch|x|z)$/.test(v)) return `${v}es`                // address → addresses
  return `${v}s`                                                // require → requires
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
// Verbs that end in "ly" and so would otherwise be mistaken for adverbs —
// "Policy must comply with…" must not become "Comply withs…".
const LY_VERBS = new Set(['comply', 'apply', 'supply', 'imply', 'multiply', 'reply', 'rely'])

export function humaniseElement(element: string): string {
  const text = String(element ?? '').trim()
  const m = text.match(/^(?:the\s+)?polic(?:y|ies)\s+must\s+(.*)$/is)
  if (!m) return text

  // "also" and "not" appear in either order in the real data.
  let rest = m[1].trim()
  let negated = false
  for (;;) {
    const before = rest
    rest = rest.replace(/^also\s+/i, '')
    const neg = rest.match(/^not\s+/i)
    if (neg) { negated = true; rest = rest.slice(neg[0].length) }
    if (rest === before) break
  }

  const words = rest.split(/\s+/)
  let adverb = ''
  if (words.length > 1 && /ly$/i.test(words[0]) && !LY_VERBS.has(words[0].toLowerCase())) {
    adverb = (words.shift() as string).toLowerCase()
  }
  const verb = (words.shift() ?? '').toLowerCase()
  if (!/^[a-z]{2,}$/.test(verb)) return text

  // A paired verb straight after the first ("appoint or identify") is conjugated too,
  // so it does not read as "Appoints or identify".
  if (words.length > 1 && /^(or|and)$/i.test(words[0]) && /^[a-z]{2,}$/i.test(words[1])) {
    words[1] = thirdPerson(words[1])
  }

  const tail = words.join(' ')
  // A prohibition reads naturally with the bare verb: "Does not require staff to…"
  // rather than "Nots require…".
  const head = negated
    ? `Does not ${adverb ? `${adverb} ` : ''}${verb}`
    : adverb
      ? `${cap(adverb)} ${thirdPerson(verb)}`
      : cap(thirdPerson(verb))
  return `${head}${tail ? ` ${tail}` : ''}`.replace(/\s+/g, ' ').trim()
}

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
        // The curated elements are the page's bullet-point key facts, rephrased for a
        // reader rather than for the writer.
        key_facts: (Array.isArray(r.required_elements) ? r.required_elements : []).slice(0, 6).map(humaniseElement),
      })),
      related,
    })
  } catch (e: any) {
    err(res, 'PRODUCT_FAILED', e?.message ?? 'could not load that policy', 500)
  }
})

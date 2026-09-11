// Illustration generation for the paid-policy shop pages.
//
// Two kinds, and the split matters: a HERO per policy (65 of them, the image that
// opens the intake game on /care-policies/<slug>), and one image per piece of
// LEGISLATION. The 65 policies cite 77 regulation sections but only 57 distinct
// regulations, so keying the legislation art by reference_key instead of by policy
// means the same law is drawn once and reused everywhere it appears.
//
// Style follows the training module illustrations deliberately: a policy page and a
// course page sit in the same shop and should not look like two different products.

import OpenAI from 'openai'
import { prisma } from '../../db/client'
import { uploadShopImage } from '../storage/s3'
import { recordCostUsd } from '../../lib/token-usage'

// gpt-image-1: text input $5, image input $10, image output $40 per 1M tokens.
// Falls back to the per-image estimate for 1024x1024 at default quality.
function imageCostUsd(usage: any): number {
  if (usage && (usage.input_tokens || usage.output_tokens)) {
    const textIn  = usage.input_tokens_details?.text_tokens ?? usage.input_tokens ?? 0
    const imageIn = usage.input_tokens_details?.image_tokens ?? 0
    const out     = usage.output_tokens ?? 0
    return (textIn * 5 + imageIn * 10 + out * 40) / 1_000_000
  }
  // per-image estimate for 1536x1024 at default quality, when usage is absent
  return 0.063
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

// Both are editable in Platform Console → AI Prompts.
export const POLICY_HERO_PROMPT_USAGE = 'policy_hero_image_generation'
export const POLICY_LAW_PROMPT_USAGE  = 'policy_law_image_generation'

export const DEFAULT_POLICY_HERO_PROMPT = `Create a cover illustration for a UK care provider's written policy document.
Policy: "{{topic}}".
Context: {{summary}}

Style: flat modern vector illustration, soft rounded shapes, warm and friendly, gentle teal and warm-neutral palette, plenty of clean negative space. A calm UK care setting.
Do NOT include any text, words, letters or logos.
Do NOT show realistic human faces — keep any people stylised, simple and abstract.
Compose for a WIDE landscape frame: keep the subject centred and away from the top and bottom edges, which are cropped.
Professional and reassuring, suitable for a care provider buying this policy.`

export const DEFAULT_POLICY_LAW_PROMPT = `Create an illustration representing a piece of UK care legislation or regulatory standard.
Regulation: "{{topic}}".
What it requires: {{summary}}

Style: flat modern vector illustration, soft rounded shapes, gentle teal and warm-neutral palette, plenty of clean negative space. Convey the SUBJECT of the regulation through the scene, not through symbols of law such as gavels, scales or courtrooms.
Do NOT include any text, words, letters, numbers or logos.
Do NOT show realistic human faces — keep any people stylised, simple and abstract.
Compose for a WIDE landscape frame: keep the subject centred and away from the top and bottom edges, which are cropped.
Calm and authoritative, suitable beside a policy a care provider is buying.`

async function promptFor(usage: string, fallback: string): Promise<string> {
  try {
    const row = await (prisma as any).aiPrompt.findUnique({ where: { usage } })
    if (row?.content) return row.content
  } catch { /* the console may not have an override yet */ }
  return fallback
}

function build(template: string, topic: string, context: string): string {
  return template
    .replace(/\{\{\s*topic\s*\}\}/g, topic)
    .replace(/\{\{\s*summary\s*\}\}/g, context.trim().slice(0, 400))
}

// LANDSCAPE, not square. Three of the four places these appear are wide — the intake
// card is 16:9, the legislation panel 16:10, the related-policy card 16:9 — and the CSS
// uses object-fit:cover. A 1024x1024 source loses 44% of its height to that crop, which
// is how you end up with headless people. 3:2 loses about 5%.
const SIZE = '1536x1024'

async function generate(template: string, topic: string, context: string): Promise<string> {
  const result = await openai.images.generate({
    model:  'gpt-image-1',
    prompt: build(template, topic, context),
    size:   SIZE,
  })
  recordCostUsd('gpt-image-1', imageCostUsd((result as any).usage))
  const b64 = result.data?.[0]?.b64_json
  if (!b64) throw new Error('Image generation returned no data')
  return uploadShopImage(Buffer.from(b64, 'base64'))
}

// One hero per policy, seeded from the product's own title and description.
export async function generatePolicyHeroImage(slug: string): Promise<string> {
  const product = await (prisma as any).policyProduct.findUnique({
    where:  { slug },
    select: { id: true, title: true, description: true },
  })
  if (!product) throw new Error('Policy not found')
  const context = (product.description || '').trim().length > 10
    ? product.description
    : `A ${product.title} written for a UK care provider.`
  const key = await generate(await promptFor(POLICY_HERO_PROMPT_USAGE, DEFAULT_POLICY_HERO_PROMPT),
                             product.title, context)
  await (prisma as any).policyProduct.update({ where: { id: product.id }, data: { image_key: key } })
  return key
}

// One image per regulation, shared by every policy that cites it.
export async function generateRegulationImage(referenceKey: string): Promise<string> {
  const reg = await (prisma as any).externalRegulation.findUnique({
    where:  { reference_key: referenceKey },
    select: { id: true, official_name: true, summary: true, care_home_context: true },
  })
  if (!reg) throw new Error('Regulation not found')
  // care_home_context describes the setting the rule bites in, which produces a better
  // scene than the legal summary on its own.
  const context = [reg.care_home_context, reg.summary].filter(Boolean).join(' ')
    || `A UK care regulation: ${reg.official_name}.`
  const key = await generate(await promptFor(POLICY_LAW_PROMPT_USAGE, DEFAULT_POLICY_LAW_PROMPT),
                             reg.official_name, context)
  await (prisma as any).externalRegulation.update({ where: { id: reg.id }, data: { image_key: key } })
  return key
}

// Public URL the marketing site loads a stored shop illustration from.
export function shopImageUrl(key?: string | null): string | null {
  if (!key) return null
  const file = key.split('/').pop()
  return file ? `/public/policy-shop/image/${file}` : null
}

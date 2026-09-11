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
import { humaniseElement } from '../../routes/policy-shop-public'

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

// NOTE: these defaults are the fallback only — Platform Console → AI Prompts overrides
// them, and the live overrides are what generated the current artwork. They were
// rewritten on 2026-09-11 after the first 17 heroes came back literal: a whistle for
// whistleblowing, a brain and scales of justice for mental capacity, and a "Care
// Planning Policy" caption baked into the frame. Three rules fixed it — illustrate the
// practice not the words, no icon used as a metaphor, and the frame is edge to edge
// with no lettering anywhere. Keep this file and the console in step.
// Both are editable in Platform Console → AI Prompts.
export const POLICY_HERO_PROMPT_USAGE = 'policy_hero_image_generation'
export const POLICY_LAW_PROMPT_USAGE  = 'policy_law_image_generation'

export const DEFAULT_POLICY_HERO_PROMPT = `Create a cover illustration for a UK care provider's written policy document.
Policy: "{{topic}}".
Context: {{summary}}

Illustrate what the policy is ABOUT IN PRACTICE: one ordinary, believable moment in a care setting that the policy governs. Never illustrate the words in its name, and never use a symbol to stand for the idea.
A whistleblowing policy is a member of staff quietly raising a concern with a manager in private, never a whistle. A mental capacity policy is a carer sitting with a resident, unhurried, helping them make their own decision, never a brain or a floating head. A restraint policy is a calm, unhurried interaction, never anyone being held or confined. A modern slavery policy is careful, respectful recruitment, never chains or captivity.

Do NOT include: scales of justice, gavels, courtrooms, anatomical diagrams, brains, lightbulbs, floating or disembodied body parts, thought bubbles, tick or cross marks, shields, padlocks, or any other icon used as a metaphor. People, rooms and everyday objects only.
Nothing distressing, coercive or punitive. Nothing done TO a resident against their will. Everyone in the scene is treated with dignity.

Style: flat modern vector illustration, soft rounded shapes, warm and friendly, gentle teal and warm-neutral palette on a light warm-neutral background, plenty of clean negative space. A calm UK care setting.
The illustration fills the ENTIRE frame, edge to edge. There is no caption, no title bar, no label strip, no banner, no border and no margin of flat colour along any edge. Any lettering anywhere in the image is a failure: no text, words, letters, numbers, captions or logos, including on clipboards, signs, folders or screens within the scene.
Do NOT show realistic human faces — keep any people stylised, simple and abstract.
Compose for a WIDE landscape frame: keep the subject centred and away from the top and bottom edges, which are cropped.
Professional and reassuring, suitable for a care provider buying this policy.`

export const DEFAULT_POLICY_LAW_PROMPT = `Create an illustration representing a piece of UK care legislation or regulatory standard.
Regulation: "{{topic}}".
What it requires: {{summary}}

Illustrate the regulation's SUBJECT IN PRACTICE: one ordinary, believable moment in a care setting that complying with it looks like. Never illustrate the words in its name, and never use a symbol to stand for the idea. A safeguarding regulation is a carer listening carefully to a resident, never a shield. A staffing regulation is a handover between two colleagues, never a clock or a rota icon. A records regulation is someone writing up notes, never a filing cabinet of padlocks.

Do NOT include: scales of justice, gavels, courtrooms, legal documents with seals, anatomical diagrams, brains, lightbulbs, floating or disembodied body parts, thought bubbles, tick or cross marks, shields, padlocks, or any other icon used as a metaphor. People, rooms and everyday objects only.
Nothing distressing, coercive or punitive. Nothing done TO a resident against their will. Everyone in the scene is treated with dignity.

Style: flat modern vector illustration, soft rounded shapes, warm and friendly, gentle teal and warm-neutral palette on a light warm-neutral background, plenty of clean negative space. A calm UK care setting.
The illustration fills the ENTIRE frame, edge to edge. There is no caption, no title bar, no label strip, no banner, no border and no margin of flat colour along any edge. Any lettering anywhere in the image is a failure: no text, words, letters, numbers, captions or logos, including on clipboards, signs, folders or screens within the scene.
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

// ── Who is in the picture ─────────────────────────────────────────────────────
// The model defaults hard to one look: the first run came back with a South Asian
// woman in scrubs in almost every image. Asking the prompt for "a mix of ethnicities"
// cannot fix that, because each image is generated on its own with no knowledge of the
// other 121 — it can only ask a single picture to be mixed.
//
// So the variety is imposed here instead. Each image is handed a specific cast, picked
// from these rotations by a stable hash of its own key, which makes the SET varied by
// construction. Stable matters: regenerating one image gives it the same people back,
// so a reshoot does not silently change who is in it.
//
// The UK care workforce is one of the most ethnically diverse in the country, so this
// is what the sector actually looks like, not decoration.
const CARE_WORKERS = [
  'a Black British woman in her forties',
  'a White British man in his thirties',
  'a South Asian man in his fifties',
  'a White British woman in her fifties',
  'a Black African man in his twenties',
  'an East Asian woman in her thirties',
  'a South Asian woman in her twenties',
  'a mixed heritage man in his forties',
  'a White British woman in her thirties',
  'a Black Caribbean woman in her fifties',
  'an East Asian man in his forties',
  'a South Asian woman in her forties',
]

const RESIDENTS = [
  'an older White British woman',
  'an older Black Caribbean man',
  'an older South Asian woman',
  'an older White British man',
  'an older Black African woman',
  'an older East Asian man',
  'an older mixed heritage woman',
  'an older South Asian man',
]

// A small stable hash, so the same key always draws the same cast.
function pick<T>(list: T[], key: string, offset = 0): T {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return list[(h + offset) % list.length]
}

function castFor(key: string): string {
  return '\n\nThe people in this scene: any member of care staff shown is '
    + `${pick(CARE_WORKERS, key)}, and anyone receiving care is ${pick(RESIDENTS, key, 5)}. `
    + 'Show their skin tone and presentation clearly through the flat illustration style, '
    + 'without drawing realistic facial detail. If the scene shows two colleagues rather '
    + 'than a carer and a resident, make them visibly different from one another.'
}


async function generate(template: string, topic: string, context: string, key: string): Promise<string> {
  const result = await openai.images.generate({
    model:  'gpt-image-1',
    prompt: build(template, topic, context) + castFor(key),
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
                             product.title, context, slug)
  await (prisma as any).policyProduct.update({ where: { id: product.id }, data: { image_key: key } })
  return key
}

// One image per regulation, shared by every policy that cites it.
export async function generateRegulationImage(referenceKey: string): Promise<string> {
  const reg = await (prisma as any).externalRegulation.findUnique({
    where:  { reference_key: referenceKey },
    select: { id: true, official_name: true, summary: true, care_home_context: true, required_elements: true },
  })
  if (!reg) throw new Error('Regulation not found')
  // required_elements is the concrete checklist of what a compliant policy DOES —
  // "designates a named safeguarding lead", "completes a DBS check before a new starter
  // has contact with residents". Those describe actions in a room, so they give the
  // model something to draw.
  //
  // care_home_context and summary are the legal analysis, and for some regulations they
  // open with an argument about the sector rather than anything visual at all. Feeding
  // those produced images 2.3x more saturated and with 27% fewer edges than the policy
  // heroes: nothing specific to draw, so a generic scene washed in amber. They are kept
  // only as the fallback for a regulation with no elements captured yet.
  const elements: string[] = Array.isArray(reg.required_elements) ? reg.required_elements : []
  const context = elements.length
    ? elements.slice(0, 3).map(humaniseElement).join(' ')
    : ([reg.care_home_context, reg.summary].filter(Boolean).join(' ')
       || `A UK care regulation: ${reg.official_name}.`)
  const key = await generate(await promptFor(POLICY_LAW_PROMPT_USAGE, DEFAULT_POLICY_LAW_PROMPT),
                             reg.official_name, context, referenceKey)
  await (prisma as any).externalRegulation.update({ where: { id: reg.id }, data: { image_key: key } })
  return key
}

// Public URL the marketing site loads a stored shop illustration from.
export function shopImageUrl(key?: string | null): string | null {
  if (!key) return null
  const file = key.split('/').pop()
  return file ? `/public/policy-shop/image/${file}` : null
}

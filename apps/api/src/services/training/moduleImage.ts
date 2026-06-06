// AI cover-illustration generation for annual training modules.
//
// One illustration per module, generated from the module's topic + learning
// summary. Style is a flat, warm vector illustration (NO realistic faces, NO
// text) so it's safe, on-brand and reusable. The image is stored privately in
// S3 and served through the public /public/training/image/:file endpoint.
//
// Platform standard modules generate images free (platform-side). Tenants
// trigger generation explicitly via a button that consumes one AI credit.

import OpenAI from 'openai'
import { prisma } from '../../db/client'
import { uploadTrainingImage } from '../storage/s3'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

// Editable in the Platform Console → AI Prompts ("Annual Training — Cover Image").
// {{topic}} and {{summary}} are substituted per module before the image is generated.
export const TRAINING_IMAGE_PROMPT_USAGE = 'training_image_generation'
export const DEFAULT_TRAINING_IMAGE_PROMPT = `Create a cover illustration for a UK care-home staff training module.
Topic: "{{topic}}".
Context: {{summary}}

Style: flat modern vector illustration, soft rounded shapes, warm and friendly, gentle teal and warm-neutral palette, plenty of clean negative space. A calm UK care-home setting.
Do NOT include any text, words, letters or logos.
Do NOT show realistic human faces — keep any people stylised, simple and abstract.
Professional, reassuring, suitable for staff training.`

async function getImagePrompt(): Promise<string> {
  try {
    const row = await (prisma as any).aiPrompt.findUnique({ where: { usage: TRAINING_IMAGE_PROMPT_USAGE } })
    if (row?.content) return row.content
  } catch { /* fall through */ }
  return DEFAULT_TRAINING_IMAGE_PROMPT
}

function buildPrompt(template: string, name: string, summary?: string | null): string {
  const ctx = (summary && summary.trim().length > 10)
    ? summary.trim().slice(0, 300)
    : `An annual refresher training module on ${name} for care-home staff.`
  return template.replace(/\{\{\s*topic\s*\}\}/g, name).replace(/\{\{\s*summary\s*\}\}/g, ctx)
}

// Generate an illustration for a module and persist its S3 key on the module.
// Returns the new illustration_key. Throws on generation/storage failure.
export async function generateModuleIllustration(moduleId: string): Promise<string> {
  const module = await (prisma as any).trainingModule.findUnique({
    where:  { id: moduleId },
    select: { id: true, name: true, learning_content: true },
  })
  if (!module) throw new Error('Module not found')

  const summary = (module.learning_content && typeof module.learning_content === 'object')
    ? (module.learning_content.summary as string | undefined)
    : undefined

  const template = await getImagePrompt()
  const result = await openai.images.generate({
    model:  'gpt-image-1',
    prompt: buildPrompt(template, module.name, summary),
    size:   '1024x1024',
  })

  const b64 = result.data?.[0]?.b64_json
  if (!b64) throw new Error('Image generation returned no data')
  const buffer = Buffer.from(b64, 'base64')

  const key = await uploadTrainingImage(buffer)
  await (prisma as any).trainingModule.update({ where: { id: moduleId }, data: { illustration_key: key } })
  return key
}

// Public URL the frontends use to load a stored illustration (served by the API).
export function illustrationUrl(key?: string | null): string | null {
  if (!key) return null
  const file = key.split('/').pop()
  return file ? `/public/training/image/${file}` : null
}

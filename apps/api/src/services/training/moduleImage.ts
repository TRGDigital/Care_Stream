// Cover and lesson images for standard and CPD training modules (see the notes below).
//
// They use the same generator as the blog and scenario pictures (house style: flat illustration, people
// with friendly faces and open eyes, a different and varied cast in each picture, wide frame, no text and no
// screens), so the training pages match the rest of the site. Each picture shows ONE moment from the
// section it sits on, written for that section by Claude from its teaching text and its care scenario.
// Platform standard modules generate images free (platform side). Only the image changes: the lesson text,
// questions and settings are never touched, and the previous image key is kept (cover_key_prev,
// image_key_prev) so a picture can be put back.

import { prisma } from '../../db/client'
import { uploadTrainingImage } from '../storage/s3'
import sharp from 'sharp'
import { callClaude, callClaudeWithImage } from '../ai/claude'
import { generateSceneBuffer } from '../policy-shop/shopImage'

// The AI Prompts console lists this usage. Training pictures now share the house style prompt used for blog
// and scenario pictures (edit it under "blog_image_generation"), so this default simply mirrors that one.
export const TRAINING_IMAGE_PROMPT_USAGE = 'training_image_generation'
export { DEFAULT_BLOG_IMAGE_PROMPT as DEFAULT_TRAINING_IMAGE_PROMPT } from '../policy-shop/shopImage'

const SCENE_SYSTEM = `You write the scene for ONE flat illustration in a UK care home training course.
Reply with ONE or TWO sentences only, no preamble. Describe ONE ordinary, believable moment that shows the lesson being applied in a care setting. Include the key object or action the section is about (for example the equipment, the call bell, the phone, the folder, the hand wash) so the picture clearly shows the topic: who is there (their roles and what they are doing, one to three people), where, and a few small props.
Never mention ethnicity, skin tone or age. No text, signs, labels, screens, charts, symbols or icons. Nothing distressing, coercive or undignified: people are calm, engaged and treated with dignity. Do not describe the picture style.`

function asText(v: unknown, max: number): string {
  if (!v) return ''
  const t = typeof v === 'string' ? v : JSON.stringify(v)
  return t.replace(/\s+/g, ' ').trim().slice(0, max)
}

async function sceneFor(courseName: string, label: string, teaching: string, scenario: string, idea: string): Promise<string> {
  const user = `Course: ${courseName}\nPicture for: ${label}\nWhat it teaches: ${teaching}\n${scenario ? `Care scenario in the lesson: ${scenario}\n` : ''}${idea ? `Earlier scene idea (improve it, keep what fits): ${idea}\n` : ''}Write the scene.`
  try {
    const out = (await callClaude(SCENE_SYSTEM, user, { maxTokens: 220, temperature: 0.7 })).replace(/^["'\s]+|["'\s]+$/g, '')
    if (out.length > 25) return out
  } catch { /* fall back to the teaching text */ }
  return `An everyday moment in a UK care home showing ${label.toLowerCase()}.`
}


const ALT_SYSTEM = `You write alt text for an illustration on a UK care home training page.
Look at the picture and write ONE plain sentence, 80 to 125 characters, saying what it actually shows: who is doing what, where, and the key objects. Be specific and accurate to what is visible, not to what the lesson is about. Do not start with "Image of", "Picture of" or "Illustration of". Do not mention ethnicity or skin tone. No dashes of any kind. No quotation marks. Reply with the sentence only.`

// Alt text written from the finished picture, so it describes what is really there.
async function altFor(buf: Buffer, courseName: string, label: string): Promise<string> {
  try {
    const small = await sharp(buf).resize({ width: 800, withoutEnlargement: true }).jpeg({ quality: 78 }).toBuffer()
    let alt = (await callClaudeWithImage(ALT_SYSTEM, `Training course: ${courseName}. This picture sits on the section: ${label}.`, small.toString('base64'), 'image/jpeg', { maxTokens: 120, temperature: 0.2 }))
      .replace(/[\u2013\u2014]/g, ' ').replace(/^["'\s]+|["'\s]+$/g, '').replace(/\s+/g, ' ')
    if (alt.length > 140) alt = alt.slice(0, 140).replace(/\s+\S*$/, '')
    if (alt.length >= 40) return alt
  } catch { /* the page falls back to the section heading */ }
  return ''
}

// The marketing site reads alt text from the central map keyed by the image address it renders.
async function saveAlt(key: string, alt: string): Promise<void> {
  if (!alt) return
  const base = (process.env.NEXT_PUBLIC_API_URL || process.env.API_PUBLIC_URL || 'https://api.carestreamai.com').replace(/\/$/, '')
  const file = key.split('/').pop()
  if (!file) return
  const src = `${base}/public/training/image/${file}`
  try {
    await (prisma as any).siteImageAlt.upsert({ where: { src }, create: { src, alt }, update: { alt } })
  } catch { /* alt text must never block an image */ }
}

// Writes to a module's lesson data run one at a time per module (a row lock), because every image of a module
// updates the same JSON and two finishing together would otherwise overwrite each other.
async function withModuleLock<T>(moduleId: string, fn: (tx: any) => Promise<T>): Promise<T> {
  return (prisma as any).$transaction(async (tx: any) => {
    await tx.$queryRaw`SELECT id FROM training_modules WHERE id::text = ${moduleId} FOR UPDATE`
    return fn(tx)
  }, { timeout: 30000, maxWait: 30000 })
}

async function sceneKey(courseName: string, scene: string, key: string, label: string): Promise<{ key: string; alt: string }> {
  const buf = await generateSceneBuffer(courseName, scene, key)
  const [stored, alt] = await Promise.all([uploadTrainingImage(buf), altFor(buf, courseName, label)])
  await saveAlt(stored, alt)
  return { key: stored, alt }
}

// Generate the module COVER illustration and persist its key on the module.
export async function generateModuleIllustration(moduleId: string): Promise<string> {
  const module = await (prisma as any).trainingModule.findUnique({
    where:  { id: moduleId },
    select: { id: true, name: true, illustration_key: true, learning_content: true },
  })
  if (!module) throw new Error('Module not found')
  const lc = (module.learning_content && typeof module.learning_content === 'object') ? { ...module.learning_content } : {}
  const summary = asText((lc as any).summary, 600)
  const scene = await sceneFor(module.name, 'the course cover: a welcoming, representative moment for the whole topic', summary, '', '')
  const { key, alt } = await sceneKey(module.name, scene, `trn-cover-${moduleId}`, 'the course cover')
  await withModuleLock(moduleId, async (tx) => {
    const fresh = await tx.trainingModule.findUnique({ where: { id: moduleId }, select: { illustration_key: true, learning_content: true } })
    const flc = (fresh?.learning_content && typeof fresh.learning_content === 'object') ? { ...fresh.learning_content } : {}
    if (fresh?.illustration_key && !(flc as any).cover_key_prev) (flc as any).cover_key_prev = fresh.illustration_key
    if (alt) (flc as any).cover_alt = alt
    await tx.trainingModule.update({ where: { id: moduleId }, data: { illustration_key: key, learning_content: flc } })
  })
  return key
}

// Generate an image for ONE lesson section and store it in that section.
export async function generateSectionImage(moduleId: string, sectionIndex: number): Promise<string> {
  const module = await (prisma as any).trainingModule.findUnique({
    where:  { id: moduleId },
    select: { id: true, name: true, learning_content: true },
  })
  if (!module) throw new Error('Module not found')
  const lc = (module.learning_content && typeof module.learning_content === 'object') ? { ...module.learning_content } : {}
  const sections = Array.isArray((lc as any).sections) ? [...(lc as any).sections] : []
  const sec = sections[sectionIndex]
  if (!sec) throw new Error('Section not found')

  const scene = await sceneFor(module.name, String(sec.heading || 'a lesson section'), asText(sec.body, 700), asText(sec.scenario, 500), asText(sec.image_prompt, 300))
  const heading = String(sec.heading || 'a lesson section')
  const { key, alt } = await sceneKey(module.name, scene, `trn-${moduleId}-${sectionIndex}`, heading)
  await withModuleLock(moduleId, async (tx) => {
    const fresh = await tx.trainingModule.findUnique({ where: { id: moduleId }, select: { learning_content: true } })
    const flc = (fresh?.learning_content && typeof fresh.learning_content === 'object') ? { ...fresh.learning_content } : {}
    const fsections = Array.isArray((flc as any).sections) ? [...(flc as any).sections] : []
    const fsec = fsections[sectionIndex]
    if (!fsec) throw new Error('Section not found')
    fsections[sectionIndex] = { ...fsec, image_key: key, ...(alt ? { image_alt: alt } : {}), ...(fsec.image_key && !fsec.image_key_prev ? { image_key_prev: fsec.image_key } : {}) }
    ;(flc as any).sections = fsections
    await tx.trainingModule.update({ where: { id: moduleId }, data: { learning_content: flc } })
  })
  return key
}

// Public URL the frontends use to load a stored illustration (served by the API).
export function illustrationUrl(key?: string | null): string | null {
  if (!key) return null
  const file = key.split('/').pop()
  return file ? `/public/training/image/${file}` : null
}

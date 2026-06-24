// Matching a training module to an already-generated illustration in the library,
// so My Training modules reuse the annual modules' images instead of showing a
// placeholder. Matching is by SHARED SIGNIFICANT WORDS (order-independent) so
// "Data Protection & GDPR" still matches "GDPR and Data Protection Annual Refresher".

import { prisma } from '../../db/client'

const STOP = new Set([
  'annual', 'refresher', 'refreshers', 'training', 'course', 'module', 'modules',
  'update', 'updates', 'awareness', 'level', 'part', 'staff', 'care', 'home',
  'and', 'the', 'for', 'of', 'to', 'in', 'a', 'an',
])

export function subjectTokens(s: string): Set<string> {
  return new Set(
    String(s ?? '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ')
      .split(/\s+/).filter(w => w.length >= 2 && !STOP.has(w)),
  )
}

function overlap(a: Set<string>, b: Set<string>): number {
  let n = 0
  for (const t of a) if (b.has(t)) n++
  return n
}

const hasSectionImg = (m: any) =>
  Array.isArray(m?.learning_content?.sections) && m.learning_content.sections.some((s: any) => s?.image_key)

// Pick the best imaged source module for a module name/topic, preferring one that
// actually carries images, then the same topic, then a fuller word match.
export function pickImageSource(name: string, topicId: string | null | undefined, candidates: any[]): any | null {
  const mtok = subjectTokens(name)
  const scored = candidates
    .map(c => {
      const o = overlap(mtok, subjectTokens(c.name))
      return { c, o, contained: mtok.size > 0 && o === mtok.size, hasImg: !!c.illustration_key || hasSectionImg(c) }
    })
    .filter(s => s.o >= 2 || (mtok.size <= 2 && s.o === mtok.size && s.o > 0))
  scored.sort((a, b) =>
    (Number(b.hasImg) - Number(a.hasImg)) ||
    (Number(!!topicId && b.c.topic_id === topicId) - Number(!!topicId && a.c.topic_id === topicId)) ||
    (Number(b.contained) - Number(a.contained)) ||
    (b.o - a.o),
  )
  return scored[0]?.c ?? null
}

// Modules (this tenant + the platform library) that carry a cover illustration —
// the pool we borrow images from. Includes learning_content for section-image reuse.
export async function imagedSourceModules(tenantId: string): Promise<any[]> {
  return (prisma as any).trainingModule.findMany({
    where:  { is_active: true, illustration_key: { not: null }, OR: [{ tenant_id: tenantId }, { tenant_id: null }] },
    select: { id: true, name: true, topic_id: true, illustration_key: true, learning_content: true },
  }).catch(() => [] as any[])
}

// Backfill / self-heal: give every module without a cover the hero image from its
// matching library module. Cheap once filled (only touches modules missing a cover);
// never overwrites an existing cover, and generates nothing (reuses existing keys).
export async function fillModuleCovers(tenantId: string): Promise<void> {
  const missing = await (prisma as any).trainingModule.findMany({
    where:  { tenant_id: tenantId, is_active: true, illustration_key: null },
    select: { id: true, name: true, topic_id: true },
  }).catch(() => [] as any[])
  if (!missing.length) return
  const sources = await imagedSourceModules(tenantId)
  if (!sources.length) return
  await Promise.all((missing as any[]).map(async m => {
    const src = pickImageSource(m.name, m.topic_id, sources)
    if (src?.illustration_key) {
      await (prisma as any).trainingModule.update({ where: { id: m.id }, data: { illustration_key: src.illustration_key } }).catch(() => {})
    }
  }))
}

// "This is me" resident profiles: sections, plan gate, archive access, and the link to the assistant's knowledge.
//
// A profile is what makes a person who they are (likes, routines, life story). It is NOT a clinical record, and the screens say so.
// Only LIVING residents reach the hub and the assistant. When someone dies or moves on, their knowledge entries and vectors are
// removed straight away, family links are cancelled, and the profile is archived for the retention period (seven years by default).

import { createHash, randomBytes } from 'crypto'
import { prisma } from '../db/client'
import { getPlanFeatures } from './plan-limits'

const db = prisma as any

export const RETENTION_YEARS = 7
export const INVITE_DAYS = 14
export const THIS_IS_ME_PREFIX = 'This is me:'

export interface SectionDef { key: string; label: string; help: string; family_prompt: string }

// One place for the wording. The admin screens and the family form both read it from GET /residents/meta
// and GET /public/family/:token, so a label is never out of step.
export const SECTIONS: SectionDef[] = [
  { key: 'about_me', label: 'Life story and background', help: 'Where they grew up, work, family, the big moments in their life.', family_prompt: 'Tell us about their life: where they grew up, what they did for work, the things they are proud of.' },
  { key: 'interests', label: 'Interests and hobbies', help: 'What they love doing, past and present.', family_prompt: 'What do they enjoy doing, or used to love doing?' },
  { key: 'likes', label: 'Likes', help: 'Little things that make their day better.', family_prompt: 'What are the little things they like? Music, TV, a cup of tea a certain way, a favourite chair?' },
  { key: 'dislikes', label: 'Dislikes', help: 'Things that upset or annoy them, so staff can avoid them.', family_prompt: 'What do they dislike, or what tends to upset them?' },
  { key: 'food_drink', label: 'Food and drink they enjoy', help: 'Favourites and treats. Dietary needs belong in the care plan, not here.', family_prompt: 'What food and drink do they enjoy? Any favourite treats?' },
  { key: 'routine', label: 'Daily routine', help: 'When they like to get up, go to bed, eat and rest.', family_prompt: 'What does a good day look like for them? Do they have habits or routines they like to keep?' },
  { key: 'comfort', label: 'What helps when they are upset or anxious', help: 'What calms and reassures them.', family_prompt: 'When they are worried or upset, what helps? Is there anything or anyone that calms them?' },
  { key: 'communication', label: 'How they like to communicate', help: 'Names they like to be called, how they show how they feel.', family_prompt: 'How do they like to be spoken to? What do they like to be called?' },
  { key: 'important_people', label: 'Important people and pets', help: 'Family, friends, neighbours and pets who matter to them.', family_prompt: 'Who and what matters most to them? Family, friends, pets, places?' },
  { key: 'faith_culture', label: 'Faith, culture and traditions', help: 'Anything we should respect or celebrate with them.', family_prompt: 'Are there any beliefs, traditions or customs we should respect or help them keep up?' },
  { key: 'other', label: 'Anything else', help: 'Anything else that helps staff get to know them.', family_prompt: 'Is there anything else you would like the care team to know about them?' },
]
export const SECTION_KEYS = new Set(SECTIONS.map(s => s.key))
export const labelFor = (key: string) => SECTIONS.find(s => s.key === key)?.label ?? key

// Professional and Enterprise. Reuses a Professional level plan flag (has_cqc_report is on for Professional and Enterprise and off
// below) so no plan column is needed. If the plans change, change it here.
export async function residentsEnabled(tenantId: string): Promise<boolean> {
  try { return !!(await getPlanFeatures(tenantId)).has_cqc_report } catch { return false }
}

/** True when the three tables exist (the SQL may not have been run yet). */
export async function tablesReady(): Promise<boolean> {
  try { await db.resident.findFirst({ select: { id: true } }); return true } catch { return false }
}

/** Splits long text into pieces the assistant can hold as separate knowledge entries, breaking at paragraphs, then sentences, then spaces. */
export function chunkText(text: string, max = 3800): string[] {
  const t = text.trim()
  if (t.length <= max) return t ? [t] : []
  const out: string[] = []
  let cur = ''
  const push = () => { if (cur.trim()) out.push(cur.trim()); cur = '' }
  const pieces = t.split(/\n{2,}/).flatMap(par => {
    if (par.length <= max) return [par]
    const sentences = par.match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g) ?? [par]
    return sentences.flatMap(s => {
      if (s.length <= max) return [s]
      const words = s.split(/\s+/); const parts: string[] = []; let w = ''
      for (const word of words) { if ((w + ' ' + word).length > max) { parts.push(w); w = word } else w = w ? `${w} ${word}` : word }
      if (w) parts.push(w); return parts
    })
  })
  for (const p of pieces) { if ((cur + '\n\n' + p).length > max) push(); cur = cur ? `${cur}\n\n${p}` : p }
  push()
  return out
}

export const cleanText = (s: unknown, max: number) =>
  String(s ?? '').replace(/<[^>]*>/g, '').replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').trim().slice(0, max)

export const displayName = (r: { first_name: string; last_name: string; preferred_name?: string | null }) =>
  `${(r.preferred_name || r.first_name).trim()} ${r.last_name}`.trim()

export function ageFrom(dob: Date | string | null | undefined, now = new Date()): number | null {
  if (!dob) return null
  const d = new Date(dob); if (isNaN(+d)) return null
  let a = now.getUTCFullYear() - d.getUTCFullYear()
  const m = now.getUTCMonth() - d.getUTCMonth()
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) a--
  return a >= 0 && a < 130 ? a : null
}

export const dateOnly = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null)
export const addYears = (d: Date, years: number) => { const x = new Date(d); x.setUTCFullYear(x.getUTCFullYear() + years); return x }

// ─── Invite tokens ─────────────────────────────────────────────────────────────
// 256 bits of randomness; only the SHA-256 is stored, so a database leak does not hand out working links.
export function newInviteToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: hashToken(token) }
}
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

// ─── Who can action archives ───────────────────────────────────────────────────
// tenant.training_settings.resident_archive_user_ids: when unset, every admin can; once set, only those admins.
// (Unset by default so a death never leaves an archive task with nobody able to action it.)
export async function archiveAccessIds(tenantId: string): Promise<string[] | null> {
  const t = await db.tenant.findUnique({ where: { id: tenantId }, select: { training_settings: true } })
  const v = (t?.training_settings as any)?.resident_archive_user_ids
  return Array.isArray(v) ? v.filter((x: unknown) => typeof x === 'string') : null
}

export async function saveArchiveAccessIds(tenantId: string, ids: string[]): Promise<void> {
  const t = await db.tenant.findUnique({ where: { id: tenantId }, select: { training_settings: true } })
  const cur = (t?.training_settings ?? {}) as Record<string, unknown>
  await db.tenant.update({ where: { id: tenantId }, data: { training_settings: { ...cur, resident_archive_user_ids: ids } } })
}

export async function canManageArchive(tenantId: string, userId: string, role: string): Promise<boolean> {
  if (role !== 'admin') return false
  const ids = await archiveAccessIds(tenantId)
  return ids === null || ids.includes(userId)
}

/** The admins who hold the archive permission (or every admin when it has not been narrowed). */
export async function archiveAdmins(tenantId: string): Promise<Array<{ id: string; name: string; email: string }>> {
  const admins = await db.user.findMany({
    where: { tenant_id: tenantId, role: 'admin', is_active: true }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' },
  })
  const ids = await archiveAccessIds(tenantId)
  return ids === null ? admins : admins.filter((a: any) => ids.includes(a.id))
}

// ─── The assistant's knowledge ─────────────────────────────────────────────────
// Each filled section becomes one approved manual knowledge entry ("This is me: Margaret Smith") so the assistant finds it the
// way it finds any home knowledge, and cites it by name. The entry ids are kept on the resident so archiving removes exactly these.
// Rebuilt from scratch on every change: simple and it cannot drift.
export async function syncResidentKnowledge(tenantId: string, residentId: string): Promise<{ ok: boolean; entries: number; error?: string }> {
  const r = await db.resident.findFirst({ where: { id: residentId, tenant_id: tenantId } })
  if (!r) return { ok: false, entries: 0, error: 'not found' }
  try {
    // Loaded on demand: these pull in the embedding and vector clients, which the pure helpers (and their tests) do not need.
    const { embedManualEntry } = await import('../services/knowledge/generator')
    const { deleteKnowledgeVectors } = await import('../services/vector/pinecone')
    const old: string[] = Array.isArray(r.entry_ids) ? r.entry_ids : []
    if (old.length) {
      await deleteKnowledgeVectors(tenantId, old).catch(() => undefined)
      await db.knowledgeEntry.deleteMany({ where: { id: { in: old }, tenant_id: tenantId } })
    }
    const ids: string[] = []
    if (r.status === 'living') {
      const name = displayName(r)
      const full = `${r.first_name} ${r.last_name}`.trim()
      const age = ageFrom(r.dob)
      const sections = (r.sections ?? {}) as Record<string, string>
      for (const def of SECTIONS) {
        const pieces = chunkText((sections[def.key] ?? '').trim())
        for (let i = 0; i < pieces.length; i++) {
          const part = pieces.length > 1 ? ` (part ${i + 1} of ${pieces.length})` : ''
          const question = `${full}${r.preferred_name && r.preferred_name !== r.first_name ? ` (${r.preferred_name})` : ''}: ${def.label}${part}`
          const answer = `${name}${age !== null ? `, aged ${age}` : ''}${r.room ? `, room ${r.room}` : ''}. ${def.label}${part}: ${pieces[i]}`
          const sourceName = `${THIS_IS_ME_PREFIX} ${full}`
          const e = await db.knowledgeEntry.create({
            data: {
              tenant_id: tenantId, question: question.slice(0, 500), answer: answer.slice(0, 5000), source_type: 'manual', source_name: sourceName,
              knowledge_category: 'resident', approved: true, approved_at: new Date(), approved_by: 'this-is-me',
            },
          })
          const vectorId = await embedManualEntry(tenantId, e.id, question.slice(0, 500), answer.slice(0, 5000), sourceName)
          await db.knowledgeEntry.update({ where: { id: e.id }, data: { vector_id: vectorId } })
          ids.push(e.id)
        }
      }
    }
    await db.resident.update({ where: { id: residentId }, data: { entry_ids: ids } })
    return { ok: true, entries: ids.length }
  } catch (e: any) {
    console.error('[residents] knowledge sync failed:', e)
    return { ok: false, entries: 0, error: String(e?.message ?? e).slice(0, 200) }
  }
}

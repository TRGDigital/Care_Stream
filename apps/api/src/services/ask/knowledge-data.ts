// Read only loaders for the Knowledge and Residents agents. Every query names the account (tenant_id) and only READS. Nothing here selects contact details,
// dates of birth, funding or health notes: a resident's profile sections are passed through withholdHealth() before the agent sees any of it, and the agent only
// ever sees one named resident at a time, at the administrator's request. Resident derived knowledge entries (category 'resident') are never returned by the
// Knowledge tools: they are profile content, which belongs to the Residents agent.
import { prisma } from '../../db/client'
import { writeAuditLog } from '../../lib/audit'
import { SECTIONS, displayName } from '../../lib/residents'

let db: any = prisma as any
let audit: typeof writeAuditLog = writeAuditLog
/** Tests only: replace the database, and the audit writer, with stubs. */
export function __setKnowledgeDb(fake: any | null, auditFake?: typeof writeAuditLog | null) { db = fake ?? (prisma as any); audit = auditFake ?? writeAuditLog }

const iso = (d: any) => (d ? new Date(d).toISOString().slice(0, 10) : null)
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)
const word = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2)

// ── Redaction ───────────────────────────────────────────────────────────────────
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const PHONE = /(?:\+?44\s?\(?0?\)?\s?|0)\d(?:[\s-]?\d){8,9}/g
/** Contact details (email addresses and phone numbers) are never shown. */
export function stripContact(text: string): string { return String(text ?? '').replace(EMAIL, '[email removed]').replace(PHONE, '[number removed]') }
const excerpt = (text: string, n: number) => { const t = stripContact(text).replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).trimEnd() + '...' : t }

// Words that mark health or medical detail. A sentence that contains one is withheld from a resident summary. This is deliberately cautious: it may withhold a harmless sentence,
// and the agent says so, rather than ever show a medical detail.
const MEDICAL = /\b(diagnos\w*|dementia|alzheimer\w*|diabet\w*|medicat\w*|medicine\w*|tablets?|\d+\s?mg\b|dose|prescri\w*|insulin|epilep\w*|seizure\w*|stroke|parkinson\w*|cancer|chemo\w*|dialysis|catheter|incontinen\w*|pressure (?:sore|ulcer|area)\w*|wound\w*|allerg\w*|illness|disease|condition|symptom\w*|hospital\w*|\bGP\b|doctor|nurse visit|surgery|operation|treatment|therapy|mental health|depress\w*|anxiety disorder|psychiat\w*|pain|mobility aid|hoist|swallow\w*|PEG|oxygen|blood pressure|infection|MRSA|covid|NHS)\b/i
/** Splits text into sentences and drops any that mention health or medical detail. Returns the safe text and how many sentences were withheld. */
export function withholdHealth(text: string): { text: string; withheld: number } {
  const sentences = stripContact(text).replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/).filter(Boolean)
  let withheld = 0
  const keep = sentences.filter(s => { if (MEDICAL.test(s)) { withheld++; return false } return true })
  return { text: keep.join(' '), withheld }
}

// ── Knowledge base ────────────────────────────────────────────────────────────────
export const KNOWLEDGE_CATEGORIES: Array<{ key: string; label: string }> = [
  { key: 'general', label: 'General' }, { key: 'business_continuity', label: 'Business continuity' }, { key: 'policies_procedures', label: 'Policies and procedures' },
  { key: 'hr_staff', label: 'HR and staff handbook' }, { key: 'health_safety', label: 'Health and safety' }, { key: 'medication', label: 'Medication' }, { key: 'infection_control', label: 'Infection control' },
]
const catLabel = (k: string) => KNOWLEDGE_CATEGORIES.find(c => c.key === k)?.label ?? k.replace(/_/g, ' ')

interface Entry { id: string; question: string; answer: string; source_type: string; source_name: string; category: string; approved: boolean; approved_at: string | null; created: string; updated: string }
/** The home's own entries (manual and policy derived), never the resident profile entries. */
async function loadEntries(tenantId: string): Promise<{ entries: Entry[]; resident_entries: number }> {
  const rows: any[] = await db.knowledgeEntry.findMany({
    where: { tenant_id: tenantId }, orderBy: { updated_at: 'desc' }, take: 4000,
    select: { id: true, question: true, answer: true, source_type: true, source_name: true, knowledge_category: true, approved: true, approved_at: true, created_at: true, updated_at: true },
  })
  const own = rows.filter(r => r.knowledge_category !== 'resident')
  return {
    resident_entries: rows.length - own.length,
    entries: own.map(r => ({ id: r.id, question: String(r.question), answer: String(r.answer), source_type: String(r.source_type), source_name: String(r.source_name), category: String(r.knowledge_category ?? 'general'), approved: !!r.approved, approved_at: iso(r.approved_at), created: iso(r.created_at)!, updated: iso(r.updated_at)! })),
  }
}

export async function knowledgeOverview(tenantId: string) {
  const { entries, resident_entries } = await loadEntries(tenantId)
  const by = new Map<string, { total: number; approved: number; pending: number; manual: number; from_policies: number; last_updated: string | null }>()
  for (const c of KNOWLEDGE_CATEGORIES) by.set(c.key, { total: 0, approved: 0, pending: 0, manual: 0, from_policies: 0, last_updated: null })
  for (const e of entries) {
    const x = by.get(e.category) ?? { total: 0, approved: 0, pending: 0, manual: 0, from_policies: 0, last_updated: null }
    x.total++; e.approved ? x.approved++ : x.pending++; e.source_type === 'policy' ? x.from_policies++ : x.manual++
    if (!x.last_updated || e.updated > x.last_updated) x.last_updated = e.updated
    by.set(e.category, x)
  }
  const pending = entries.filter(e => !e.approved).length
  return {
    total_entries: entries.length, question_and_answer_pairs: entries.length, approved: entries.length - pending, waiting_for_approval: pending,
    from_your_own_policies: entries.filter(e => e.source_type === 'policy').length, written_by_hand: entries.filter(e => e.source_type !== 'policy').length,
    by_category: [...by].map(([key, v]) => ({ category: catLabel(key), ...v })).sort((a, b) => b.total - a.total),
    last_updated: entries.map(e => e.updated).sort().pop() ?? null,
    resident_profile_entries_not_counted: resident_entries,
  }
}

export async function knowledgeSearch(tenantId: string, topic: string, limit = 8) {
  const words = [...new Set(word(topic))]
  const { entries } = await loadEntries(tenantId)
  if (!words.length) return { matched: 0, entries: [], note: 'No searchable words in the topic.' }
  const scored = entries.map(e => {
    const q = word(e.question), a = word(e.answer)
    const score = words.reduce((s, w) => s + (q.includes(w) ? 3 : 0) + (a.includes(w) ? 1 : 0), 0)
    return { e, score }
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score || b.e.updated.localeCompare(a.e.updated))
  return {
    matched: scored.length,
    entries: scored.slice(0, Math.max(1, Math.min(15, limit))).map(({ e }) => ({ question: excerpt(e.question, 200), category: catLabel(e.category), from: e.source_type === 'policy' ? 'a policy' : 'written by hand', source_name: excerpt(e.source_name, 120), status: e.approved ? 'approved' : 'waiting for approval', last_updated: e.updated, excerpt: excerpt(e.answer, 260) })),
  }
}

export async function knowledgeStale(tenantId: string, months: number, today: string) {
  const { entries } = await loadEntries(tenantId)
  const cutoff = new Date(today + 'T00:00:00Z'); cutoff.setUTCMonth(cutoff.getUTCMonth() - months)
  const limit = cutoff.toISOString().slice(0, 10)
  const old = entries.filter(e => e.updated < limit).sort((a, b) => a.updated.localeCompare(b.updated))
  return {
    months, updated_before: limit, count: old.length, of_total: entries.length,
    entries: old.slice(0, 40).map(e => ({ question: excerpt(e.question, 160), category: catLabel(e.category), from: e.source_type === 'policy' ? 'a policy' : 'written by hand', last_updated: e.updated, months_old: Math.round(daysBetween(e.updated, today) / 30.4) })),
  }
}

export async function knowledgePending(tenantId: string, today: string) {
  const { entries } = await loadEntries(tenantId)
  const p = entries.filter(e => !e.approved).sort((a, b) => a.created.localeCompare(b.created))
  return { count: p.length, entries: p.slice(0, 40).map(e => ({ question: excerpt(e.question, 160), category: catLabel(e.category), from: e.source_type === 'policy' ? 'a policy' : 'written by hand', added: e.created, days_waiting: daysBetween(e.created, today) })) }
}

/** Categories with few entries, and the questions staff asked that found no answer (most common first). Question text has contact details removed; it is not otherwise filtered. */
export async function knowledgeGaps(tenantId: string, days: number, today: string) {
  const { entries } = await loadEntries(tenantId)
  const counts = new Map<string, number>(); for (const c of KNOWLEDGE_CATEGORIES) counts.set(c.key, 0)
  for (const e of entries) counts.set(e.category, (counts.get(e.category) ?? 0) + 1)
  const thin = [...counts].map(([k, n]) => ({ category: catLabel(k), entries: n })).filter(c => c.entries < 3).sort((a, b) => a.entries - b.entries)
  const since = new Date(today + 'T00:00:00Z'); since.setUTCDate(since.getUTCDate() - days)
  let rows: any[] = []
  try { rows = await db.queryRecord.findMany({ where: { tenant_id: tenantId, no_match: true, created_at: { gte: since } }, select: { query_text: true, created_at: true }, take: 3000 }) } catch { rows = [] }
  const norm = new Map<string, { text: string; n: number; last: string }>()
  for (const r of rows) {
    const t = stripContact(String(r.query_text)).replace(/\s+/g, ' ').trim().slice(0, 160)
    const k = t.replace(/\[(?:number|email) removed\]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
    if (!k) continue
    const e = norm.get(k) ?? { text: t, n: 0, last: '' }
    e.n++; const d = iso(r.created_at) ?? ''; if (d > e.last) e.last = d
    norm.set(k, e)
  }
  const top = [...norm.values()].sort((a, b) => b.n - a.n || b.last.localeCompare(a.last)).slice(0, 25)
  return { days, unanswered_total: rows.length, distinct_questions: norm.size, top_unanswered: top.map(t => ({ question: t.text, times_asked: t.n, last_asked: t.last })), thin_categories: thin }
}

// ── Residents ─────────────────────────────────────────────────────────────────────
const SECTION_KEYS = SECTIONS.map(s => s.key)
const labelOf = (key: string) => SECTIONS.find(s => s.key === key)?.label ?? key
const filledKeys = (sections: any): string[] => SECTION_KEYS.filter(k => typeof sections?.[k] === 'string' && sections[k].trim().length > 0)
const shortName = (r: { first_name: string; last_name: string; preferred_name?: string | null }) => `${(r.preferred_name || r.first_name).trim()}${r.last_name ? ` ${r.last_name.trim().charAt(0).toUpperCase()}.` : ''}`

async function loadResidents(tenantId: string) {
  const rows: any[] = await db.resident.findMany({
    where: { tenant_id: tenantId }, orderBy: { created_at: 'asc' }, take: 2000,
    select: { id: true, first_name: true, last_name: true, preferred_name: true, room: true, status: true, status_at: true, sections: true, archived_at: true, retention_until: true, created_at: true },
  })
  return rows
}

export async function residentsOverview(tenantId: string) {
  const all = await loadResidents(tenantId)
  const living = all.filter(r => r.status === 'living')
  const total = SECTION_KEYS.length
  const per = living.map(r => filledKeys(r.sections).length)
  const filledTotal = per.reduce((s, n) => s + n, 0)
  const sectionRates = SECTION_KEYS.map(k => ({ section: labelOf(k), residents_filled: living.filter(r => filledKeys(r.sections).includes(k)).length }))
  return {
    living: living.length, left: all.filter(r => r.status === 'left').length, deceased: all.filter(r => r.status === 'deceased').length, archived: all.filter(r => r.archived_at).length,
    sections_in_a_profile: total,
    average_sections_filled: living.length ? Math.round((filledTotal / living.length) * 10) / 10 : 0,
    overall_completeness_percent: living.length ? Math.round((filledTotal / (living.length * total)) * 1000) / 10 : 0,
    fully_complete: per.filter(n => n === total).length, empty_profiles: per.filter(n => n === 0).length,
    by_section: sectionRates.sort((a, b) => a.residents_filled - b.residents_filled),
  }
}

export async function residentsProfileGaps(tenantId: string, limit = 10) {
  const living = (await loadResidents(tenantId)).filter(r => r.status === 'living')
  const total = SECTION_KEYS.length
  const rows = living.map(r => { const f = filledKeys(r.sections); return { name: shortName(r), room: r.room ?? null, sections_filled: f.length, of: total, missing: SECTION_KEYS.filter(k => !f.includes(k)).map(labelOf) } })
    .sort((a, b) => a.sections_filled - b.sections_filled || a.name.localeCompare(b.name))
  return { living: living.length, shown: Math.min(rows.length, limit), least_complete: rows.slice(0, Math.max(1, Math.min(40, limit))) }
}

export async function residentsPendingApprovals(tenantId: string, today: string) {
  const res = new Map((await loadResidents(tenantId)).filter(r => r.status === 'living').map(r => [r.id, r]))
  const safe = async (fn: () => Promise<any[]>) => { try { return await fn() } catch { return [] } }
  const [contrib, photos, videos] = await Promise.all([
    safe(() => db.residentContribution.findMany({ where: { tenant_id: tenantId, status: 'pending' }, select: { resident_id: true, submitted_at: true } })),
    safe(() => db.residentPhoto.findMany({ where: { tenant_id: tenantId, status: 'pending' }, select: { resident_id: true, submitted_at: true } })),
    safe(() => db.residentVideo.findMany({ where: { tenant_id: tenantId, status: 'pending', state: 'ready' }, select: { resident_id: true, submitted_at: true, media_kind: true } })),
  ])
  const per = new Map<string, { answers: number; photos: number; videos: number; voice_notes: number; oldest: string }>()
  const bump = (rid: string, key: 'answers' | 'photos' | 'videos' | 'voice_notes', when: any) => {
    const x = per.get(rid) ?? { answers: 0, photos: 0, videos: 0, voice_notes: 0, oldest: '9999-12-31' }
    x[key]++; const d = iso(when) ?? '9999-12-31'; if (d < x.oldest) x.oldest = d
    per.set(rid, x)
  }
  for (const c of contrib) bump(c.resident_id, 'answers', c.submitted_at)
  for (const p of photos) bump(p.resident_id, 'photos', p.submitted_at)
  for (const v of videos) bump(v.resident_id, v.media_kind === 'audio' ? 'voice_notes' : 'videos', v.submitted_at)
  const list = [...per].filter(([id]) => res.has(id)).map(([id, x]) => ({ name: shortName(res.get(id)), room: res.get(id).room ?? null, family_answers: x.answers, photos: x.photos, video_messages: x.videos, voice_notes: x.voice_notes, waiting_since: x.oldest, days_waiting: daysBetween(x.oldest, today) })).sort((a, b) => b.days_waiting - a.days_waiting)
  const sum = (k: 'family_answers' | 'photos' | 'video_messages' | 'voice_notes') => list.reduce((s, r) => s + r[k], 0)
  return { residents_with_items_waiting: list.length, totals: { family_answers: sum('family_answers'), photos: sum('photos'), video_messages: sum('video_messages'), voice_notes: sum('voice_notes') }, longest_wait_days: list[0]?.days_waiting ?? 0, residents: list.slice(0, 30) }
}

export async function residentsFamilyEngagement(tenantId: string, today: string) {
  let invites: any[] = [], settings: any[] = []
  try { invites = await db.residentInvite.findMany({ where: { tenant_id: tenantId, revoked_at: null }, select: { id: true, sent_at: true, expires_at: true, opened_at: true, submitted_at: true } }) } catch { invites = [] }
  try { settings = await db.residentReminderSetting.findMany({ where: { tenant_id: tenantId }, select: { cadence: true, stopped_at: true, next_due_at: true, unanswered_count: true } }) } catch { settings = [] }
  const sent = invites.length, opened = invites.filter(i => i.opened_at).length, replied = invites.filter(i => i.submitted_at).length
  const expired = invites.filter(i => !i.submitted_at && i.expires_at && iso(i.expires_at)! < today).length
  const cadences: Record<string, number> = {}
  for (const s of settings) { const k = s.stopped_at ? 'stopped' : String(s.cadence || 'off'); cadences[k] = (cadences[k] ?? 0) + 1 }
  const due = settings.filter(s => !s.stopped_at && s.cadence && s.cadence !== 'off' && s.next_due_at && iso(s.next_due_at)! <= today).length
  return {
    invitations_sent: sent, opened, replied, link_expired_without_reply: expired,
    open_rate_percent: sent ? Math.round((opened / sent) * 1000) / 10 : 0, reply_rate_percent: sent ? Math.round((replied / sent) * 1000) / 10 : 0,
    reminders_by_setting: cadences, reminders_due_now: due,
    contacts_who_have_not_replied_after_reminders: settings.filter(s => !s.stopped_at && (s.unanswered_count ?? 0) >= 3).length,
  }
}

export async function residentsRetentionDue(tenantId: string, today: string) {
  const all = await loadResidents(tenantId)
  const gone = all.filter(r => r.status !== 'living')
  const plus90 = new Date(today + 'T00:00:00Z'); plus90.setUTCDate(plus90.getUTCDate() + 90)
  const soon = plus90.toISOString().slice(0, 10)
  const toArchive = gone.filter(r => !r.archived_at).map(r => ({ name: shortName(r), room: r.room ?? null, status: r.status === 'deceased' ? 'died' : 'moved on', status_date: iso(r.status_at), days_since: r.status_at ? daysBetween(iso(r.status_at)!, today) : null }))
  const retention = gone.filter(r => r.retention_until).map(r => ({ name: shortName(r), status: r.status === 'deceased' ? 'died' : 'moved on', retention_until: iso(r.retention_until)!, days_left: daysBetween(today, iso(r.retention_until)!) }))
  return {
    archives_to_action: toArchive.length, archive_list: toArchive.slice(0, 30),
    retention_passed: retention.filter(r => r.retention_until < today).sort((a, b) => a.retention_until.localeCompare(b.retention_until)).slice(0, 30),
    retention_within_90_days: retention.filter(r => r.retention_until >= today && r.retention_until <= soon).sort((a, b) => a.retention_until.localeCompare(b.retention_until)).slice(0, 30),
    note: 'The profile is kept for seven years after archiving, then it should be deleted.',
  }
}

/** One named resident's APPROVED profile in plain text, with contact details removed and any sentence about health withheld. Audit logged (resident id only). */
export async function residentProfileSummary(tenantId: string, userId: string, nameOrId: string) {
  const q = String(nameOrId ?? '').trim().toLowerCase()
  if (!q) return { found: 0, matches: [], error: 'Say which resident.' }
  const living = (await loadResidents(tenantId)).filter(r => r.status === 'living')
  // A name must match whole words (or the start of a word of three letters or more), so a stray letter never opens a profile.
  const qWords = q.split(/\s+/).filter(Boolean)
  const hits = living.filter(r => r.id === nameOrId || (() => { const nameWords = `${r.first_name} ${r.last_name} ${r.preferred_name ?? ''}`.toLowerCase().split(/\s+/).filter(Boolean); return qWords.every(w => nameWords.some(n => n === w || (w.length >= 3 && n.startsWith(w)))) })())
  if (hits.length === 0) return { found: 0, matches: [], error: 'No living resident matched that name.' }
  if (hits.length > 1) return { found: hits.length, matches: hits.slice(0, 8).map(r => ({ name: shortName(r), room: r.room ?? null })), error: 'More than one resident matches. Ask which one (name and room).' }
  const r = hits[0]
  let withheld = 0
  const sections: Array<{ section: string; text: string }> = []
  for (const k of SECTION_KEYS) {
    const raw = typeof r.sections?.[k] === 'string' ? r.sections[k].trim() : ''
    if (!raw) continue
    const safe = withholdHealth(raw); withheld += safe.withheld
    if (safe.text) sections.push({ section: labelOf(k), text: safe.text.length > 900 ? safe.text.slice(0, 899).trimEnd() + '...' : safe.text })
  }
  void audit({ tenant_id: tenantId, user_id: userId, event_type: 'ask_resident_profile_viewed', entity_type: 'resident', entity_id: r.id, metadata: { via: 'ask_carestream' } })
  return {
    found: 1, name: displayName(r), room: r.room ?? null, sections_with_content: sections.length, sections,
    health_sentences_withheld: withheld,
    note: withheld ? 'Some sentences mentioning health or medical details are not shown here. They stay in the profile for the care team.' : null,
  }
}

// Interactive lesson activities — the tap-first exercises that sit between the
// teaching sections of a course. CPD's assessors look for more than text and
// multiple choice, so a course can carry a handful of these alongside (never
// instead of) its existing sections, quick checks and assessment.
//
// Three types today:
//   order — put the steps of a procedure into sequence
//   sort  — put each item into the right bin/category
//   match — match a term to its meaning
//
// They live inside training_modules.learning_content.activities, so authoring
// one is an edit in the platform module editor — no migration, and the module
// PATCH already accepts learning_content wholesale.

export type ActivityType = 'order' | 'sort' | 'match'

export type ActivityBin = { id: string; name: string; note: string }

export type Activity = {
  id: string
  type: ActivityType
  title: string
  instructions: string
  /** 0-based index of the section this follows. null = after the last section. */
  after_section: number | null
  /** order: the steps in their CORRECT sequence (the client shuffles for display). */
  steps?: string[]
  /** sort: the bins, and the items with the bin each belongs in. */
  bins?: ActivityBin[]
  items?: Array<{ text: string; bin: string }>
  /** match: term/definition pairs (the client shuffles the definitions). */
  pairs?: Array<{ term: string; definition: string }>
}

const str = (v: any): string => String(v ?? '').trim()
const strs = (v: any): string[] => (Array.isArray(v) ? v.map(str).filter(Boolean) : [])

// A 0-based section index, or null for "after the last section".
const sectionIndex = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isInteger(n) && n >= 0 ? n : null
}

// Models are asked for 0-based indexes but often answer 1-based. If nothing is
// pinned to section 0 and something is pinned one past the end, the whole set is
// off by one — shift it back rather than dropping activities to the end of the
// lesson. Anything still out of range is pinned to the last section.
export function alignActivitySections(activities: Activity[], sectionCount: number): Activity[] {
  if (!sectionCount) return activities
  const pinned = activities.map(a => a.after_section).filter((n): n is number => n != null)
  const looksOneBased = pinned.length > 0 && Math.min(...pinned) >= 1 && Math.max(...pinned) >= sectionCount
  return activities.map(a => {
    if (a.after_section == null) return a
    const shifted = looksOneBased ? a.after_section - 1 : a.after_section
    return { ...a, after_section: Math.max(0, Math.min(shifted, sectionCount - 1)) }
  })
}

// Answers travel to the client because these are formative — they are not part
// of the graded assessment, which still has its `correct` fields stripped.
export function normaliseActivities(raw: any): Activity[] {
  if (!Array.isArray(raw)) return []
  const out: Activity[] = []

  raw.forEach((a: any, i: number) => {
    const type = str(a?.type) as ActivityType
    if (type !== 'order' && type !== 'sort' && type !== 'match') return

    const base = {
      id:            str(a?.id) || `act${i + 1}`,
      type,
      title:         str(a?.title),
      instructions:  str(a?.instructions),
      // Coerce, don't just test: a model returning "2" as a string would otherwise
      // fall through to null and the activity would drift to the end of the lesson
      // instead of following its section.
      after_section: sectionIndex(a?.after_section),
    }

    if (type === 'order') {
      const steps = strs(a?.steps).slice(0, 8)
      if (steps.length < 3) return                       // too short to be a sequence
      out.push({ ...base, steps })
      return
    }

    if (type === 'sort') {
      const bins: ActivityBin[] = (Array.isArray(a?.bins) ? a.bins : [])
        .map((b: any, bi: number) => ({ id: str(b?.id) || `bin${bi + 1}`, name: str(b?.name), note: str(b?.note) }))
        .filter((b: ActivityBin) => b.name)
        .slice(0, 4)
      if (bins.length < 2) return
      const binIds = new Set(bins.map(b => b.id))
      const items = (Array.isArray(a?.items) ? a.items : [])
        .map((it: any) => ({ text: str(it?.text), bin: str(it?.bin) }))
        .filter((it: { text: string; bin: string }) => it.text && binIds.has(it.bin))
        .slice(0, 8)
      if (items.length < 3) return                       // every item must name a real bin
      out.push({ ...base, bins, items })
      return
    }

    const pairs = (Array.isArray(a?.pairs) ? a.pairs : [])
      .map((p: any) => ({ term: str(p?.term), definition: str(p?.definition) }))
      .filter((p: { term: string; definition: string }) => p.term && p.definition)
      .slice(0, 6)
    if (pairs.length < 3) return
    out.push({ ...base, pairs })
  })

  return out
}

// Every learner-visible string in an activity, in a fixed order. Bin ids and
// the item→bin links are structural and never translated.
export function collectActivityTexts(a: Activity): string[] {
  const t: string[] = [a.title, a.instructions]
  if (a.type === 'order') t.push(...(a.steps ?? []))
  if (a.type === 'sort') {
    for (const b of a.bins ?? []) t.push(b.name, b.note)
    for (const it of a.items ?? []) t.push(it.text)
  }
  if (a.type === 'match') for (const p of a.pairs ?? []) t.push(p.term, p.definition)
  return t
}

// Rebuild an activity from a translated run of strings, consuming them in the
// same order collectActivityTexts produced them.
export function applyActivityTexts(a: Activity, translated: string[], cursor: { i: number }): Activity {
  const next = () => translated[cursor.i++] ?? ''
  const out: Activity = { ...a, title: next(), instructions: next() }
  if (a.type === 'order') out.steps = (a.steps ?? []).map(next)
  if (a.type === 'sort') {
    out.bins  = (a.bins ?? []).map(b => ({ ...b, name: next(), note: next() }))
    out.items = (a.items ?? []).map(it => ({ ...it, text: next() }))
  }
  if (a.type === 'match') out.pairs = (a.pairs ?? []).map(p => ({ ...p, term: next(), definition: next() }))
  return out
}

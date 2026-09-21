// Where did each part of a generated ad-hoc lesson come from?
//
// After a lesson is generated, every section and every assessment question is checked
// against the exact passages the generator read (the home's policies, the curated training
// seed, the example policies). An AI reviewer names the ONE passage that supports the item's
// key fact / correct answer and copies a short verbatim quote from it. The quote is then
// checked in code: it must really appear in that passage, or the item is marked
// "unverified" rather than trusting the model's word. Items no passage supports are
// "none" (written from general good practice).
//
// Platform-internal audit data: stored in training_lesson_provenance, never shown to homes.

import { prisma } from '../../db/client'
import { callClaude } from '../ai/claude'
import type { SourcePassage } from './moduleGenerator'

export type AttributionStatus = 'verified' | 'none' | 'unverified'
export type SourceKind = SourcePassage['kind']

export type AttributedItem = {
  ref:           string                 // L1.. for lesson sections, Q1.. for assessment questions
  kind:          'section' | 'question'
  index:         number                 // 0-based position in the lesson / question bank
  label:         string                 // section heading or question text (shortened)
  status:        AttributionStatus
  source_id:     string | null          // H1 / S1 / E1 …
  source_kind:   SourceKind | null
  source_title:  string | null
  source_section: string | null
  quote:         string | null
}

type Counts = { total: number; home: number; training_seed: number; example: number; none: number; unverified: number }
export type AttributionSummary = { questions: Counts; sections: Counts; by_home_policy: Array<{ title: string; items: number }> }

const empty = (): Counts => ({ total: 0, home: 0, training_seed: 0, example: 0, none: 0, unverified: 0 })

// Case, whitespace, quote-mark and dash differences never make a real quote "not found".
const norm = (s: string) => String(s ?? '').toLowerCase()
  .replace(/[‘’`]/g, "'").replace(/[“”]/g, '"').replace(/[–—‐-]/g, '-')
  .replace(/\s+/g, ' ').trim()
const trimQuote = (s: string) => norm(s).replace(/^["'.…\s]+|["'.…\s]+$/g, '')

function quoteIn(quote: string, passage: string): boolean {
  const q = trimQuote(quote)
  return q.length >= 12 && norm(passage).includes(q)
}

const SYSTEM = 'You audit where each part of a care-staff training lesson came from. You are strict and literal: you only credit a source passage that actually states the fact an item relies on. Respond only with valid JSON.'

function buildPrompt(sources: SourcePassage[], items: Array<{ ref: string; text: string }>): string {
  const kindLabel = (k: SourceKind) => k === 'home' ? "This home's own policy" : k === 'training_seed' ? 'Curated training guidance' : 'Example policy (not this home)'
  return [
    'SOURCE PASSAGES (the only text the lesson writer was given):',
    ...sources.map(s => `[${s.id}] ${kindLabel(s.kind)}: ${s.title}${s.section ? `, ${s.section}` : ''}\n${s.text}`),
    '',
    'LESSON ITEMS TO CHECK:',
    ...items.map(i => `${i.ref}: ${i.text}`),
    '',
    'For EACH item, decide which single source passage supports its key fact. For a question, that is the fact that makes the correct answer correct. For a section, it is the main rule or procedure it teaches.',
    '- Give the passage id (e.g. H2, S1, E1). If a home policy passage and a reference passage both support it, choose the home policy passage.',
    '- Copy a quote of 8 to 40 words EXACTLY from that passage, character for character. No ellipses, no paraphrase, no joining of separate sentences.',
    '- If no passage states the fact (it comes from general knowledge or good practice), give "none" and an empty quote. Do not stretch: a passage that merely mentions the topic does not support a specific rule.',
    '',
    'Return ONLY JSON: {"items":[{"ref":"Q1","source":"H2","quote":"..."}]} with one entry per item, in the same order.',
  ].join('\n')
}

// Check a generated lesson against its sources. Pure apart from the one model call.
export async function attributeLesson(
  draft: { learning_content: { sections: any[] }; questions: Array<{ text: string; options: string[]; correct: number }> },
  sources: SourcePassage[],
): Promise<{ items: AttributedItem[]; summary: AttributionSummary }> {
  const sections = Array.isArray(draft.learning_content?.sections) ? draft.learning_content.sections : []
  const questions = Array.isArray(draft.questions) ? draft.questions : []
  const answer = (opts: any[], i: number) => (Array.isArray(opts) ? String(opts[i] ?? '') : '')

  const pending: Array<Omit<AttributedItem, 'status' | 'source_id' | 'source_kind' | 'source_title' | 'source_section' | 'quote'> & { text: string }> = [
    ...sections.map((s: any, i: number) => ({
      ref: `L${i + 1}`, kind: 'section' as const, index: i, label: String(s?.heading ?? `Section ${i + 1}`).slice(0, 160),
      text: [
        `Section "${s?.heading ?? ''}". ${s?.body ?? ''}`,
        s?.scenario?.answer ? `Scenario answer: ${s.scenario.answer}` : '',
        s?.check?.question ? `Check: ${s.check.question} Correct answer: ${answer(s.check.options, Number(s.check.correct))}` : '',
      ].filter(Boolean).join(' '),
    })),
    ...questions.map((q, i) => ({
      ref: `Q${i + 1}`, kind: 'question' as const, index: i, label: String(q?.text ?? '').slice(0, 200),
      text: `${q?.text ?? ''} Correct answer: ${answer(q?.options, Number(q?.correct))}`,
    })),
  ]

  const byId = new Map(sources.map(s => [s.id, s]))
  let answers = new Map<string, { source: string; quote: string }>()
  if (sources.length && pending.length) {
    const raw = await callClaude(SYSTEM, buildPrompt(sources, pending.map(p => ({ ref: p.ref, text: p.text }))), {
      maxTokens: 6000, temperature: 0, feature: 'training_attribution',
    })
    const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1))
    answers = new Map((Array.isArray(parsed?.items) ? parsed.items : []).map((a: any) => [String(a?.ref ?? ''), { source: String(a?.source ?? '').trim(), quote: String(a?.quote ?? '').trim() }]))
  }

  const items: AttributedItem[] = pending.map(p => {
    const base = { ref: p.ref, kind: p.kind, index: p.index, label: p.label }
    const a = answers.get(p.ref)
    const none = { ...base, status: 'none' as const, source_id: null, source_kind: null, source_title: null, source_section: null, quote: null }
    if (!sources.length) return none
    if (!a) return { ...none, status: 'unverified' as const }
    if (!a.source || a.source.toLowerCase() === 'none') return none

    // The quote must really be in the cited passage. If it is in a different passage, credit
    // that one instead (preferring the home's policies); if it is nowhere, do not trust it.
    let src = byId.get(a.source)
    if (!src || !quoteIn(a.quote, src.text)) {
      const found = sources.filter(s => quoteIn(a.quote, s.text))
      src = found.find(s => s.kind === 'home') ?? found[0]
    }
    if (!src) {
      const claimed = byId.get(a.source)
      return { ...base, status: 'unverified' as const, source_id: claimed?.id ?? null, source_kind: claimed?.kind ?? null, source_title: claimed?.title ?? null, source_section: claimed?.section ?? null, quote: a.quote || null }
    }
    return { ...base, status: 'verified' as const, source_id: src.id, source_kind: src.kind, source_title: src.title, source_section: src.section, quote: a.quote.slice(0, 400) }
  })

  return { items, summary: summarise(items) }
}

export function summarise(items: AttributedItem[]): AttributionSummary {
  const questions = empty(), sections = empty()
  const byPolicy = new Map<string, number>()
  for (const it of items) {
    const c = it.kind === 'question' ? questions : sections
    c.total++
    if (it.status === 'verified' && it.source_kind) c[it.source_kind]++
    else if (it.status === 'none') c.none++
    else c.unverified++
    if (it.status === 'verified' && it.source_kind === 'home' && it.source_title) byPolicy.set(it.source_title, (byPolicy.get(it.source_title) ?? 0) + 1)
  }
  return {
    questions, sections,
    by_home_policy: [...byPolicy.entries()].map(([title, n]) => ({ title, items: n })).sort((a, b) => b.items - a.items),
  }
}

// Record what a lesson was built from and where each part is supported. Never throws: a
// failed check still stores the sources, so the record of what was read is never lost.
export async function recordLessonProvenance(
  tenantId: string, moduleId: string, version: number,
  draft: Parameters<typeof attributeLesson>[0] & { sources: SourcePassage[] },
): Promise<void> {
  let items: AttributedItem[] = []
  let summary: AttributionSummary | { error: string } = { error: 'not run' }
  try {
    const out = await attributeLesson(draft, draft.sources)
    items = out.items; summary = out.summary
  } catch (e: any) {
    console.error('[lesson-attribution] failed for', moduleId, e?.message ?? e)
    summary = { error: String(e?.message ?? e).slice(0, 300) }
  }
  await (prisma as any).trainingLessonProvenance.create({
    data: { tenant_id: tenantId, module_id: moduleId, version, sources: draft.sources as any, attribution: items as any, summary: summary as any },
  }).catch((e: any) => console.error('[lesson-attribution] could not store provenance for', moduleId, e?.message ?? e))
}

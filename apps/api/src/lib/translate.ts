// Training question translation helper.
// Translates a question's text and answer options into the target language using Claude Haiku.
// Returns original content unchanged if targetLang is 'eng' or unavailable.

import Anthropic from '@anthropic-ai/sdk'
import { createHash } from 'crypto'
import { recordUsage } from './token-usage'
import { languageNameForCode } from '../data/languages'
import { prisma } from '../db/client'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const LANG_NAMES: Record<string, string> = {
  eng: 'English',    pol: 'Polish',      ron: 'Romanian',   por: 'Portuguese',
  tgl: 'Tagalog',    yor: 'Yoruba',      ben: 'Bengali',    urd: 'Urdu',
  hin: 'Hindi',      spa: 'Spanish',     fra: 'French',     ara: 'Arabic',
  som: 'Somali',     swa: 'Swahili',     lit: 'Lithuanian', guj: 'Gujarati',
  pan: 'Punjabi',    tam: 'Tamil',       zho: 'Chinese',    sin: 'Sinhala',
  nep: 'Nepali',     cym: 'Welsh',       deu: 'German',     ita: 'Italian',
  bho: 'Bhojpuri',   kan: 'Kannada',     mal: 'Malayalam',  tel: 'Telugu',
  sna: 'Shona',
  // Creoles & related
  mfe: 'Mauritian Creole',  hat: 'Haitian Creole',  crs: 'Seychellois Creole',
  kea: 'Cape Verdean Creole', jam: 'Jamaican Patois', gcf: 'Antillean Creole',
  pcm: 'Nigerian Pidgin',
}

export function langName(code: string): string {
  // Local map first, then the shared catalog (covers added/custom languages).
  return LANG_NAMES[code] ?? languageNameForCode(code)
}

// ─── Translation glossary (term-locking) ──────────────────────────────────────
// A tenant can pin terms so translation stays consistent: keep them verbatim
// (care terms, drug names, the home's name, "CQC", role titles) and/or give the
// model a short note on what a term means. buildGlossary() turns the tenant's
// list into a prompt instruction plus a short signature used to partition the
// translation cache, so changing the glossary never serves a stale translation.
export type GlossaryTerm = { term: string; keep?: boolean; note?: string }

export function buildGlossary(terms?: GlossaryTerm[] | null): { instruction: string; sig: string } | null {
  const clean = (Array.isArray(terms) ? terms : [])
    .filter(t => t && typeof t.term === 'string' && t.term.trim())
    .map(t => ({ term: t.term.trim(), keep: t.keep !== false, note: (t.note ?? '').trim() }))
  if (!clean.length) return null

  const keeps = clean.filter(t => t.keep).map(t => `"${t.term}"`)
  const notes = clean.filter(t => t.note).map(t => `"${t.term}" — ${t.note}`)
  const lines: string[] = []
  if (keeps.length) lines.push(`Keep these terms EXACTLY as written in English, do not translate, transliterate or alter them: ${keeps.join(', ')}.`)
  if (notes.length) lines.push(`Follow this guidance for these terms: ${notes.join('; ')}.`)

  const instruction = `\n\nIMPORTANT GLOSSARY (must follow): ${lines.join(' ')}`
  const sig = createHash('sha256').update(JSON.stringify(clean)).digest('hex').slice(0, 12)
  return { instruction, sig }
}

// Decide the target language for a hub content request (training / induction / CQC /
// follow-ups). Honours a `?lang=2` (or `?lang=second`) override that flips a single set
// into the staff member's SECOND language — but only when an admin enabled switching for
// them and a second language is set. Otherwise the normal first-language logic applies.
export function hubContentLang(
  user: { first_language?: string | null; second_language?: string | null; comms_always_first_language?: boolean | null; allow_language_switching?: boolean | null } | null | undefined,
  query: { lang?: unknown } | undefined,
  customLangs?: any,
): { code: string; name: string } {
  const wantSecond = query?.lang === '2' || query?.lang === 'second'
  if (wantSecond && user?.allow_language_switching && user?.second_language) {
    return { code: user.second_language, name: languageNameForCode(user.second_language, customLangs) }
  }
  const code = user?.comms_always_first_language === false ? 'eng' : ((user?.first_language as string) ?? 'eng')
  return { code, name: languageNameForCode(code, customLangs) }
}

export async function translateTrainingQuestion(
  question: { text: string; options: string[] },
  targetLang: string,
  targetLangName?: string,   // explicit name (e.g. a tenant's custom language) — overrides code lookup
  glossary?: GlossaryTerm[],
): Promise<{ text: string; options: string[] }> {
  if (!targetLang || targetLang === 'eng') return question

  const name = targetLangName ?? langName(targetLang)
  const opts  = question.options ?? []
  const gloss = buildGlossary(glossary)

  const prompt = [
    `Translate the following care training question and its answer options into ${name}.`,
    `Return ONLY the translation — the question text on the first line, then each option on its own line prefixed with its number and a period.`,
    `Do NOT add any extra text, labels, or explanation.`,
    ``,
    `QUESTION:`,
    question.text,
    ``,
    `OPTIONS:`,
    ...opts.map((o, i) => `${i + 1}. ${o}`),
  ].join('\n') + (gloss?.instruction ?? '')

  try {
    const msg = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages:   [{ role: 'user', content: prompt }],
    })

    recordUsage('claude-haiku-4-5-20251001', msg.usage)

    const raw   = (msg.content[0] as any).text as string
    const lines = raw.trim().split('\n').filter((l: string) => l.trim())

    const translatedText = lines[0]?.trim() ?? question.text
    const translatedOpts = lines
      .slice(1)
      .map((l: string) => l.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean)

    return {
      text:    translatedText,
      options: translatedOpts.length === opts.length ? translatedOpts : opts,
    }
  } catch (e) {
    console.error('[translate] Failed to translate question:', e)
    return question
  }
}

// ─── Cached helpers for portal rendering (training & onboarding views) ─────────
// Two-tier cache so non-English portal loads are fast AND survive serverless cold
// starts (the in-memory Map alone is per-instance and wiped on recycle, which made
// every cold load re-call Haiku for every question and often time out to English):
//   L1  in-memory Map  — instant within a warm process
//   L2  translation_cache table — shared across all instances, persists forever
//   L3  Haiku          — only on a genuine first-ever miss; result is written to L2
// The *Batch helpers do L2 in a single IN-query and a single bulk insert, so a warm
// DB cache turns N per-question round-trips into one read with no model calls.

const _qCache = new Map<string, { text: string; options: string[] }>()
const _tCache = new Map<string, string>()

const qHash = (q: { text: string; options: string[] }) =>
  createHash('sha256').update(`q::${q.text}::${(q.options ?? []).join('|')}`).digest('hex')
const tHash = (text: string) => createHash('sha256').update(`t::${text}`).digest('hex')

// Batched L2 read: one query for many hashes. Returns hash → translated JSON.
async function cacheReadMany(langCode: string, hashes: string[]): Promise<Map<string, any>> {
  const out = new Map<string, any>()
  if (!hashes.length) return out
  try {
    const rows: any[] = await (prisma as any).translationCache.findMany({
      where:  { lang_code: langCode, source_hash: { in: [...new Set(hashes)] } },
      select: { source_hash: true, translated: true },
    })
    for (const r of rows) out.set(r.source_hash, r.translated)
  } catch { /* table/db unavailable → treat as all-miss, fall through to Haiku */ }
  return out
}

// Batched L2 write: one insert for all new entries, ignoring races (skipDuplicates).
async function cacheWriteMany(langCode: string, entries: Array<{ hash: string; translated: any }>): Promise<void> {
  if (!entries.length) return
  const seen = new Set<string>()
  const data = entries.filter(e => !seen.has(e.hash) && seen.add(e.hash))
    .map(e => ({ lang_code: langCode, source_hash: e.hash, translated: e.translated }))
  try { await (prisma as any).translationCache.createMany({ data, skipDuplicates: true }) }
  catch { /* best-effort cache; a failed write just means we re-translate next time */ }
}

// Batch-translate questions (text + options) into langCode. One L2 read for the
// whole set, Haiku only for entries missing from both caches, one L2 write back.
// Results are aligned to the input order; option order is preserved.
export async function translateQuestionsBatch(
  questions: Array<{ text: string; options: string[] }>,
  langCode: string,
  langName?: string,
  glossary?: GlossaryTerm[],
): Promise<Array<{ text: string; options: string[] }>> {
  if (!langCode || langCode === 'eng') return questions.map(q => ({ text: q.text, options: q.options ?? [] }))

  // Partition the cache per glossary version so a glossary change never serves a
  // previously-cached translation (real language is still passed to Haiku).
  const gloss = buildGlossary(glossary)
  const cacheLang = gloss ? `${langCode}#${gloss.sig}` : langCode

  const results = new Array<{ text: string; options: string[] }>(questions.length)
  const memKey  = (q: { text: string; options: string[] }) => `${cacheLang}::${q.text}::${(q.options ?? []).join('|')}`
  const need: number[] = []

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    if (!q.text) { results[i] = { text: q.text, options: q.options ?? [] }; continue }
    const hit = _qCache.get(memKey(q))
    if (hit) { results[i] = hit; continue }
    need.push(i)
  }
  if (!need.length) return results

  const hashes = new Map<number, string>(need.map(i => [i, qHash(questions[i])]))
  const fromDb = await cacheReadMany(cacheLang, need.map(i => hashes.get(i)!))
  const stillNeed: number[] = []
  for (const i of need) {
    const t = fromDb.get(hashes.get(i)!)
    if (t) { results[i] = t; _qCache.set(memKey(questions[i]), t) }
    else stillNeed.push(i)
  }

  if (stillNeed.length) {
    const fresh = await mapLimit(stillNeed, 6, async (i) => ({ i, t: await translateTrainingQuestion(questions[i], langCode, langName, glossary) }))
    const toWrite: Array<{ hash: string; translated: any }> = []
    for (const { i, t } of fresh) {
      results[i] = t
      _qCache.set(memKey(questions[i]), t)
      toWrite.push({ hash: hashes.get(i)!, translated: t })
    }
    await cacheWriteMany(cacheLang, toWrite)
  }
  return results
}

// Batch-translate short strings (step titles, module names) into langCode.
export async function translateTextsBatch(texts: string[], langCode: string, langName?: string, glossary?: GlossaryTerm[]): Promise<string[]> {
  if (!langCode || langCode === 'eng') return texts
  const name = langName ?? langName_internal(langCode)
  const gloss = buildGlossary(glossary)
  const cacheLang = gloss ? `${langCode}#${gloss.sig}` : langCode

  const results = new Array<string>(texts.length)
  const need: number[] = []
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i]
    if (!text) { results[i] = text; continue }
    const hit = _tCache.get(`${cacheLang}::${text}`)
    if (hit) { results[i] = hit; continue }
    need.push(i)
  }
  if (!need.length) return results

  const hashes = new Map<number, string>(need.map(i => [i, tHash(texts[i])]))
  const fromDb = await cacheReadMany(cacheLang, need.map(i => hashes.get(i)!))
  const stillNeed: number[] = []
  for (const i of need) {
    const t = fromDb.get(hashes.get(i)!)
    if (t) { results[i] = t.text ?? texts[i]; _tCache.set(`${cacheLang}::${texts[i]}`, results[i]) }
    else stillNeed.push(i)
  }

  if (stillNeed.length) {
    const fresh = await mapLimit(stillNeed, 6, async (i) => {
      try {
        const msg = await anthropic.messages.create({
          model:      'claude-haiku-4-5-20251001',
          max_tokens: 400,
          messages:   [{ role: 'user', content: `Translate the following short text into ${name}. Return ONLY the translation — no quotes, labels, or explanation.\n\n${texts[i]}${gloss?.instruction ?? ''}` }],
        })
        recordUsage('claude-haiku-4-5-20251001', msg.usage)
        const out = ((msg.content[0] as any).text as string).trim()
        return { i, v: out || texts[i] }
      } catch (e) {
        console.error('[translate] Failed to translate text:', e)
        return { i, v: texts[i] }
      }
    })
    const toWrite: Array<{ hash: string; translated: any }> = []
    for (const { i, v } of fresh) {
      results[i] = v
      _tCache.set(`${cacheLang}::${texts[i]}`, v)
      if (v !== texts[i]) toWrite.push({ hash: hashes.get(i)!, translated: { text: v } })
    }
    await cacheWriteMany(cacheLang, toWrite)
  }
  return results
}

// Single-item wrappers (kept for callers that translate one item at a time, e.g.
// the follow-up micro-lesson). Both are DB-backed via the batch helpers above.
export async function translateQuestionCached(
  question: { text: string; options: string[] },
  langCode: string,
  langName?: string,
  glossary?: GlossaryTerm[],
): Promise<{ text: string; options: string[] }> {
  if (!langCode || langCode === 'eng' || !question.text) return question
  return (await translateQuestionsBatch([question], langCode, langName, glossary))[0]
}

export async function translateText(text: string, langCode: string, langName?: string, glossary?: GlossaryTerm[]): Promise<string> {
  if (!text || !langCode || langCode === 'eng') return text
  return (await translateTextsBatch([text], langCode, langName, glossary))[0]
}

function langName_internal(code: string): string {
  return LANG_NAMES[code] ?? languageNameForCode(code)
}

// Translate already-formatted policy HTML into another language, chunk by chunk,
// preserving all HTML tags. Used after the English formatting pass so the two
// stages each stay within budget.
// Core HTML translator: chunk by chunk, preserving every tag, into a named
// language. Works for ANY target language (including English).
async function translateHtmlChunks(html: string, name: string, glossary?: GlossaryTerm[]): Promise<string> {
  const gloss = buildGlossary(glossary)
  const parts = html.split(/(?<=<\/(?:p|li|h2|h3|h4|ul|ol|div)>)/i)
  const chunks: string[] = []
  let cur = ''
  for (const part of parts) {
    if (cur && (cur.length + part.length) > 3000) { chunks.push(cur); cur = part }
    else cur += part
  }
  if (cur) chunks.push(cur)

  const out = await mapLimit(chunks, 4, async (chunk) => {
    try {
      const msg = await anthropic.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        messages:   [{ role: 'user', content:
          `Translate the human-readable text in this HTML fragment into ${name}. Keep EVERY HTML tag and attribute exactly as-is — only translate the text between tags. Do not add, remove, summarise or reformat anything. Return ONLY the HTML.${gloss?.instruction ?? ''}\n\n${chunk}` }],
      })
      recordUsage('claude-haiku-4-5-20251001', msg.usage)
      return ((msg.content[0] as any).text as string).replace(/^```html\s*/i, '').replace(/```\s*$/i, '').trim()
    } catch (e) {
      console.error('[translate] html chunk failed, keeping original:', e)
      return chunk
    }
  })
  return out.join('')
}

// Translate already-English HTML into another language (no-op for English, where
// the source is already English). Used after the English formatting pass.
export async function translateHtmlPreservingTags(html: string, langCode: string, langName?: string, glossary?: GlossaryTerm[]): Promise<string> {
  if (!html || !langCode || langCode === 'eng') return html
  return translateHtmlChunks(html, langName ?? langName_internal(langCode), glossary)
}

// Translate HTML into ANY language, including English — used to flip an already
// generated chat answer between a staff member's first and second language.
export async function translateHtmlToLanguage(html: string, langName: string, glossary?: GlossaryTerm[]): Promise<string> {
  if (!html || !langName) return html
  return translateHtmlChunks(html, langName, glossary)
}

// Generate a few short, practical questions a care worker might ask about a
// specific policy — used to seed a "Talk to this policy" chat. In the staff
// member's language when requested.
export async function generatePolicyQuestions(policyText: string, langCode: string, langName?: string): Promise<string[]> {
  const name = (langCode && langCode !== 'eng') ? (langName ?? langName_internal(langCode)) : null
  const trimmed = (policyText || '').slice(0, 6000)
  if (!trimmed.trim()) return []
  const langLine = name ? `Write the questions in ${name}.` : ''
  try {
    const msg = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages:   [{ role: 'user', content:
        `Below is a UK care-home policy. Write 4 short, practical questions a care worker might genuinely ask about it — about real situations the policy covers, not "what is this policy". Keep each under 12 words. ${langLine} Return ONLY a JSON array of 4 strings and nothing else.\n\n${trimmed}` }],
    })
    recordUsage('claude-haiku-4-5-20251001', msg.usage)
    const raw   = ((msg.content[0] as any).text as string).trim()
    const start = raw.indexOf('['), end = raw.lastIndexOf(']')
    const arr   = JSON.parse(raw.slice(start, end + 1))
    return Array.isArray(arr) ? arr.filter((q: any) => typeof q === 'string' && q.trim()).slice(0, 4) : []
  } catch (e) {
    console.error('[policy] question generation failed:', e)
    return []
  }
}

// Clean a raw extracted policy and format it as readable HTML for staff. Strips
// letterhead/contact details and Word image-descriptions, structures it with
// headings + lists, and translates into `langCode` when it isn't English.
// Output is HTML (h2/h3/p/ul/ol/li/strong only). Caller caches the result.
export async function formatPolicyHtml(rawText: string, langCode: string, langName?: string, glossary?: GlossaryTerm[]): Promise<string | null> {
  const name = (langCode && langCode !== 'eng') ? (langName ?? langName_internal(langCode)) : null
  const gloss = name ? buildGlossary(glossary) : null

  // Light deterministic pre-clean: drop Word auto image-description lines
  // (the rest of the letterhead is removed by the formatting pass below).
  const pre = rawText
    .split('\n')
    .filter(l => !/description automatically generated/i.test(l))
    .join('\n')
    .trim()

  const translateLine = name ? `Translate every piece of text into ${name}.` : ''
  const prompt = [
    'You are formatting a UK care-home policy so staff can read it easily on screen.',
    'First, REMOVE any letterhead or contact details: the organisation-name banner, "Registered Office", postal address, telephone number, website URL, email address, and any image descriptions (e.g. "A green house with a fence", "Description automatically generated").',
    'Then format the remaining content as clean HTML: the policy title as a single <h2>; section/sub-section headings as <h3>; lists of items or steps as <ul><li>…</li></ul> or <ol><li>…</li></ol>; normal text as <p>. Use <strong> for emphasised labels.',
    'Preserve ALL policy content, meaning, headings and wording exactly — do NOT summarise, shorten, reword, or omit anything substantive. Only restructure and tidy.',
    translateLine,
    gloss?.instruction ? gloss.instruction.trim() : '',
    'Return ONLY the HTML body — no <html>, <head> or <body> tags, and no markdown code fences.',
    '',
    'POLICY TEXT:',
    pre,
  ].filter(Boolean).join('\n')

  try {
    const msg = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 8000,
      messages:   [{ role: 'user', content: prompt }],
    })
    recordUsage('claude-haiku-4-5-20251001', msg.usage)
    let html = ((msg.content[0] as any).text as string).trim()
    html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    // Safety: strip script/style blocks and inline event handlers.
    html = html.replace(/<\/?(script|style)[^>]*>/gi, '').replace(/\son\w+\s*=\s*"[^"]*"/gi, '').replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    return html || null
  } catch (e) {
    console.error('[policy] format failed:', e)
    return null
  }
}

// Translate a full policy document into the target language, chunk by chunk so
// long policies don't blow the token budget. Preserves structure; falls back to
// the original text on any chunk failure. Caller is responsible for caching the
// result (it's expensive — see policy_translations).
export async function translatePolicyText(text: string, langCode: string, langName?: string, glossary?: GlossaryTerm[]): Promise<string> {
  if (!text || !langCode || langCode === 'eng') return text
  const name = langName ?? langName_internal(langCode)
  const gloss = buildGlossary(glossary)

  const chunks: string[] = []
  let cur = ''
  for (const para of text.split(/\n\n+/)) {
    if (cur && (cur.length + para.length + 2) > 3500) { chunks.push(cur); cur = para }
    else cur = cur ? `${cur}\n\n${para}` : para
  }
  if (cur) chunks.push(cur)

  const translated = await mapLimit(chunks, 4, async (chunk) => {
    try {
      const msg = await anthropic.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        messages:   [{ role: 'user', content:
          `Translate this UK care-home policy text into ${name}. Preserve all headings, structure, lists and line breaks, and keep the exact meaning. Do not summarise, add, or remove anything. Return ONLY the translation, no preamble.${gloss?.instruction ?? ''}\n\n${chunk}` }],
      })
      recordUsage('claude-haiku-4-5-20251001', msg.usage)
      return ((msg.content[0] as any).text as string).trim()
    } catch (e) {
      console.error('[translate] policy chunk failed, keeping English:', e)
      return chunk
    }
  })
  return translated.join('\n\n')
}

// Translate every VALUE of a flat string→string object in a single call, keeping
// keys and any {placeholders} intact. Used for whole-UI bundles (e.g. the staff
// "My Progress" page). Cached per language so it's translated once per process.
const _bundleCache = new Map<string, Record<string, string>>()

export async function translateBundle(strings: Record<string, string>, langCode: string, langName?: string, glossary?: GlossaryTerm[]): Promise<Record<string, string>> {
  if (!langCode || langCode === 'eng') return strings
  const name = langName ?? langName_internal(langCode)
  const gloss = buildGlossary(glossary)
  const keys = Object.keys(strings)
  const cacheKey = `${langCode}${gloss ? '#' + gloss.sig : ''}::${keys.join(',')}::${Object.values(strings).join('|').length}`
  const hit = _bundleCache.get(cacheKey)
  if (hit) return hit
  try {
    const msg = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1800,
      messages:   [{ role: 'user', content:
        `Translate the VALUES of this JSON object into ${name}. Keep every key exactly the same. Keep anything inside curly braces like {n} or {total} unchanged. Use warm, simple language a care worker would understand. Return ONLY valid minified JSON and nothing else.${gloss?.instruction ?? ''}\n\n${JSON.stringify(strings)}` }],
    })
    recordUsage('claude-haiku-4-5-20251001', msg.usage)
    const raw   = ((msg.content[0] as any).text as string)
    const start = raw.indexOf('{'), end = raw.lastIndexOf('}')
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>
    const out: Record<string, string> = {}
    for (const k of keys) out[k] = typeof parsed[k] === 'string' ? (parsed[k] as string) : strings[k]
    _bundleCache.set(cacheKey, out)
    return out
  } catch (e) {
    console.error('[translate] bundle failed, serving English:', e)
    return strings
  }
}

// Run async work over items with a bounded concurrency (avoids firing dozens of
// Anthropic calls at once, which stalls the request). Order is preserved.
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++
      if (i >= items.length) break
      results[i] = await fn(items[i], i)
    }
  })
  await Promise.all(workers)
  return results
}

// Resolve `work` but never wait longer than `ms` — fall back to `fallback` so an
// endpoint never hangs on translation. The in-flight work keeps populating the
// in-memory cache, so the next load is faster / fully translated.
export function withTranslationBudget<T>(work: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    work.catch(() => fallback),
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ])
}

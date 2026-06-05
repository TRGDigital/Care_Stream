// Training question translation helper.
// Translates a question's text and answer options into the target language using Claude Haiku.
// Returns original content unchanged if targetLang is 'eng' or unavailable.

import Anthropic from '@anthropic-ai/sdk'
import { recordUsage } from './token-usage'
import { languageNameForCode } from '../data/languages'

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

export async function translateTrainingQuestion(
  question: { text: string; options: string[] },
  targetLang: string,
  targetLangName?: string,   // explicit name (e.g. a tenant's custom language) — overrides code lookup
): Promise<{ text: string; options: string[] }> {
  if (!targetLang || targetLang === 'eng') return question

  const name = targetLangName ?? langName(targetLang)
  const opts  = question.options ?? []

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
  ].join('\n')

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
// Portal views re-fetch on every visit, so we memoise translations per warm
// process to avoid repeat Haiku calls for identical (language, source) pairs.

const _qCache = new Map<string, { text: string; options: string[] }>()
const _tCache = new Map<string, string>()

export async function translateQuestionCached(
  question: { text: string; options: string[] },
  langCode: string,
  langName?: string,
): Promise<{ text: string; options: string[] }> {
  if (!langCode || langCode === 'eng' || !question.text) return question
  const key = `${langCode}::${question.text}::${(question.options ?? []).join('|')}`
  const hit = _qCache.get(key)
  if (hit) return hit
  const result = await translateTrainingQuestion(question, langCode, langName)
  _qCache.set(key, result)
  return result
}

// Translate a single short string (e.g. a step title or module name).
export async function translateText(text: string, langCode: string, langName?: string): Promise<string> {
  if (!text || !langCode || langCode === 'eng') return text
  const name = langName ?? langName_internal(langCode)
  const key  = `${langCode}::${text}`
  const hit  = _tCache.get(key)
  if (hit) return hit
  try {
    const msg = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages:   [{ role: 'user', content: `Translate the following short text into ${name}. Return ONLY the translation — no quotes, labels, or explanation.\n\n${text}` }],
    })
    recordUsage('claude-haiku-4-5-20251001', msg.usage)
    const out = ((msg.content[0] as any).text as string).trim()
    const result = out || text
    _tCache.set(key, result)
    return result
  } catch (e) {
    console.error('[translate] Failed to translate text:', e)
    return text
  }
}

function langName_internal(code: string): string {
  return LANG_NAMES[code] ?? languageNameForCode(code)
}

// Clean a raw extracted policy and format it as readable HTML for staff. Strips
// letterhead/contact details and Word image-descriptions, structures it with
// headings + lists, and translates into `langCode` when it isn't English.
// Output is HTML (h2/h3/p/ul/ol/li/strong only). Caller caches the result.
export async function formatPolicyHtml(rawText: string, langCode: string, langName?: string): Promise<string | null> {
  const name = (langCode && langCode !== 'eng') ? (langName ?? langName_internal(langCode)) : null

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
export async function translatePolicyText(text: string, langCode: string, langName?: string): Promise<string> {
  if (!text || !langCode || langCode === 'eng') return text
  const name = langName ?? langName_internal(langCode)

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
          `Translate this UK care-home policy text into ${name}. Preserve all headings, structure, lists and line breaks, and keep the exact meaning. Do not summarise, add, or remove anything. Return ONLY the translation, no preamble.\n\n${chunk}` }],
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

export async function translateBundle(strings: Record<string, string>, langCode: string, langName?: string): Promise<Record<string, string>> {
  if (!langCode || langCode === 'eng') return strings
  const name = langName ?? langName_internal(langCode)
  const keys = Object.keys(strings)
  const cacheKey = `${langCode}::${keys.join(',')}::${Object.values(strings).join('|').length}`
  const hit = _bundleCache.get(cacheKey)
  if (hit) return hit
  try {
    const msg = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1800,
      messages:   [{ role: 'user', content:
        `Translate the VALUES of this JSON object into ${name}. Keep every key exactly the same. Keep anything inside curly braces like {n} or {total} unchanged. Use warm, simple language a care worker would understand. Return ONLY valid minified JSON and nothing else.\n\n${JSON.stringify(strings)}` }],
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

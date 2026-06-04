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

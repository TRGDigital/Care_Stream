// Training question translation helper.
// Translates a question's text and answer options into the target language using Claude Haiku.
// Returns original content unchanged if targetLang is 'eng' or unavailable.

import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const LANG_NAMES: Record<string, string> = {
  eng: 'English',    pol: 'Polish',      ron: 'Romanian',   por: 'Portuguese',
  tgl: 'Tagalog',    yor: 'Yoruba',      ben: 'Bengali',    urd: 'Urdu',
  hin: 'Hindi',      spa: 'Spanish',     fra: 'French',     ara: 'Arabic',
  som: 'Somali',     swa: 'Swahili',     lit: 'Lithuanian', guj: 'Gujarati',
  pan: 'Punjabi',    tam: 'Tamil',       zho: 'Chinese',    sin: 'Sinhala',
  nep: 'Nepali',     cym: 'Welsh',       deu: 'German',     ita: 'Italian',
  bho: 'Bhojpuri',   kan: 'Kannada',     mal: 'Malayalam',  tel: 'Telugu',
}

export function langName(code: string): string {
  return LANG_NAMES[code] ?? code
}

export async function translateTrainingQuestion(
  question: { text: string; options: string[] },
  targetLang: string,
): Promise<{ text: string; options: string[] }> {
  if (!targetLang || targetLang === 'eng') return question

  const name = langName(targetLang)
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

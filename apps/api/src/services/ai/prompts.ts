import fs from 'fs'
import path from 'path'

// §4.3.2 / §4.3.3 — Load production-validated prompts from /prompts/
// These must not be altered without regression testing (§4.3.5)
const PROMPTS_DIR = path.resolve(__dirname, '../../../../../prompts')

export const PROMPT_A = fs.readFileSync(path.join(PROMPTS_DIR, 'prompt-a-summary.txt'), 'utf8')
export const PROMPT_B = fs.readFileSync(path.join(PROMPTS_DIR, 'prompt-b-full-policy.txt'), 'utf8')

// §4.3.4 — Inject {{branding_signoff}} from tenant config at runtime
export function buildPromptA(brandingSignoff: string): string {
  return PROMPT_A.replace('{{branding_signoff}}', brandingSignoff)
}

// §5.3 — Append language instruction to system prompt
export function appendLanguageInstruction(prompt: string, pattern: 1 | 2 | 3, language?: string): string {
  if (pattern === 1) return prompt
  if (pattern === 2) return `${prompt}\n\nThe staff member has written in English but has explicitly requested a response in ${language}.\nYou must respond entirely in ${language}.\nTranslate all summaries, explanations, key points, and guidance into ${language}.\nDo not translate the full policy text if included — return policy wording as written.`
  return `${prompt}\n\nThe staff member has asked their question in ${language}.\nYou must respond entirely in ${language}.\nThe policy content provided to you is in English — use it as your source of truth but write your entire response in ${language}.\nDo not translate the full policy text if included — return policy wording as written.`
}

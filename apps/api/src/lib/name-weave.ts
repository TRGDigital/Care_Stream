// "Weave a name in": when an admin adopts suggested wording they can include a named person from Organisation details, and the wording is rewritten ONCE so the name sits in it naturally,
// instead of being pasted at the cursor. Switched on per account while it is tested: NAME_WEAVE_ACCOUNTS is a comma list of account numbers (default CS-1001), or * for everyone.
import { prisma } from '../db/client'

export const NAME_WEAVE_DEFAULT = ['CS-1001']
export function nameWeaveAccounts(env: string | undefined = process.env.NAME_WEAVE_ACCOUNTS): string[] {
  const list = String(env ?? '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
  return list.length ? list : NAME_WEAVE_DEFAULT
}
export const isNameWeaveAccount = (accountNumber: string | null | undefined, env?: string): boolean => {
  const list = nameWeaveAccounts(env)
  return list.includes('*') || list.includes('ALL') || (!!accountNumber && list.includes(String(accountNumber).trim().toUpperCase()))
}

const memo = new Map<string, { at: number; v: boolean }>()
/** Looked up once a minute; any failure means off (never the new behaviour by accident). */
export async function nameWeaveEnabled(tenantId: string): Promise<boolean> {
  const list = nameWeaveAccounts()
  if (list.includes('*') || list.includes('ALL')) return true
  const hit = memo.get(tenantId)
  if (hit && Date.now() - hit.at < 60_000) return hit.v
  let v = false
  try { v = isNameWeaveAccount((await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { account_number: true } }))?.account_number) } catch { v = false }
  memo.set(tenantId, { at: Date.now(), v })
  return v
}

export const WEAVE_SYSTEM = 'You edit policy wording for a UK care service. Use British English. Never use dashes as punctuation (no em dashes or en dashes). Reply with the wording only: no quotation marks, no commentary, no markdown.'

export function weavePrompt(input: { text: string; name: string; role: string; policy_name?: string | null }): string {
  return [
    `This wording is about to be added to ${input.policy_name ? `the "${input.policy_name}" policy` : 'a policy'}:`,
    '"""', input.text, '"""',
    '',
    `Rewrite it so that ${input.name}, who is the ${input.role}, is named naturally in the sentence: where that role is already mentioned, or where the responsibility sits.`,
    `- Keep every fact, duty, timeframe and instruction exactly as given. Do not add duties, promises or detail that is not already there.`,
    `- If the wording already names someone for this role, replace that name with ${input.name}.`,
    `- If the role is not mentioned, add a short natural clause so the responsibility sits with ${input.name}, rather than putting the name at the start.`,
    '- Keep the same structure, including any heading and paragraph breaks, and about the same length.',
    `- Use the name exactly as written: ${input.name}.`,
    '',
    'Return only the rewritten wording.',
  ].join('\n')
}

/** The rewrite is only used when it really names the person, is not empty, has not run away in length, and is not the same words with the name stuck on the front. */
export function weaveResult(original: string, out: string, name: string): { ok: true; text: string } | { ok: false; reason: string } {
  const text = String(out ?? '').trim().replace(/^```[a-z]*\s*|\s*```$/gi, '').replace(/^["“]|["”]$/g, '').trim()
  if (!text) return { ok: false, reason: 'empty' }
  if (!text.toLowerCase().includes(name.trim().toLowerCase())) return { ok: false, reason: 'name missing' }
  if (text.length > original.length * 1.6 + 240) return { ok: false, reason: 'too long' }
  if (text.toLowerCase().startsWith(name.trim().toLowerCase()) && text.slice(name.length).trim() === original.trim()) return { ok: false, reason: 'just prefixed' }
  return { ok: true, text }
}

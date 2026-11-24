// How a letter is to be shared: in the staff member's hub, by email, or print only (or hub and email together). The Letters agent asks the administrator and saves the answer on the draft
// (ask_documents.data.share_intent). Print only is exclusive: that letter stays with the administrator and is never visible to the staff member. Pure rules, easy to test.
import { getTemplate } from '../letters'

export interface ShareIntent { hub: boolean; email: boolean; print_only: boolean }
export type IntentResult = { ok: true; intent: ShareIntent } | { ok: false; reason: string }

const asBool = (v: unknown) => v === true || v === 'true'

/** Reads an intent from loose input (a tool call or a request body). Returns null when nothing was given at all, so the caller can ask. */
export function readShareIntent(v: unknown): ShareIntent | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  if (!('hub' in o) && !('email' in o) && !('print_only' in o)) return null
  return { hub: asBool(o.hub), email: asBool(o.email), print_only: asBool(o.print_only) }
}

/** Valid means: at least one choice, and print only is not mixed with the others. */
export function checkShareIntent(i: ShareIntent | null): IntentResult {
  if (!i) return { ok: false, reason: 'How should this letter be shared? Choose in their hub, by email, print only, or hub and email together.' }
  if (!i.hub && !i.email && !i.print_only) return { ok: false, reason: 'Choose at least one way to share it: in their hub, by email, or print only.' }
  if (i.print_only && (i.hub || i.email)) return { ok: false, reason: 'Print only cannot be combined with the hub or email. Print only means it stays with you and nobody else sees it.' }
  return { ok: true, intent: i }
}

/** The channels the "Share now" button will use. Print only has none: it is downloaded and printed by the administrator. */
export const channelsFor = (i: ShareIntent | null | undefined): Array<'hub' | 'email'> => (!i || i.print_only ? [] : [...(i.hub ? ['hub' as const] : []), ...(i.email ? ['email' as const] : [])])

/** Plain words for the document panel and the agent. */
export function describeIntent(i: ShareIntent | null | undefined): string {
  if (!i) return 'Not chosen yet'
  if (i.print_only) return 'Print only (stays with you, the staff member does not see it)'
  const parts = [i.hub ? 'in their hub' : '', i.email ? 'by email' : ''].filter(Boolean)
  return parts.length ? `Shared ${parts.join(' and ')}` : 'Not chosen yet'
}

/** Whether a letter should ask the person to acknowledge it by default: when its template carries an acknowledgement block (and its condition holds for these values). The administrator can switch it at share time. */
export function defaultNeedsAcknowledgement(templateId: string, values: Record<string, unknown> = {}): boolean {
  const t = getTemplate(templateId)
  const a = t?.acknowledgement
  if (!a) return false
  if (!a.when) return true
  const m = /^\s*(!)?\s*([a-z0-9_]+)\s*(?:=\s*([^\s&|]+))?\s*$/i.exec(a.when)
  if (!m) return true
  const v = values[m[2]]
  if (m[3] != null) return String(v ?? '') === m[3]
  return m[1] ? !v : !!v
}

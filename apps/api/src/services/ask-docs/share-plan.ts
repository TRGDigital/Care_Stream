// HOUSE RULE 5, DISTRIBUTION CHOICE. Whenever an agent has made a letter, newsletter, report or other document, the administrator chooses in ONE place HOW it goes (email, a hub
// notification, or both) and WHO gets it (one person, chosen staff, or all staff), sees a summary of exactly what will happen, and sends it only by pressing Send. Nothing is ever sent from
// chat text. This module is the pure part: it checks the combination, counts the people, applies the Ask settings limits and the approval workflow, and writes the summary. The
// route then runs the existing sharing code (emailLetter, shareInHub, shareAsNotification) for a plan that is allowed AND confirmed. Letters stay one person at a time, and a print only letter is never sent.
import { canShare, needsApproval } from './workflow'

export type How = 'email' | 'hub' | 'both'
export type Who = 'one' | 'selected' | 'all'
export const HOWS: How[] = ['email', 'hub', 'both']
export const WHOS: Who[] = ['one', 'selected', 'all']
export type Channel = 'email' | 'hub' | 'notification'

export interface PlanDoc { id?: string; type: string; title: string; status: string; created_by?: string; data?: any }
export interface PlanPerson { id: string; name: string; has_email: boolean }
export interface PlanSettings { max_recipients: number; min_gap_minutes: number; emails_enabled: boolean }
export interface PlanInput { how: unknown; who: unknown; user_ids?: unknown }
export interface Plan {
  ok: boolean
  blockers: string[]
  what: string
  how: How | null
  who: Who | null
  how_text: string
  who_text: string
  count: number
  names: string[]
  more: number
  left_out: number
  channels: Channel[]
  /** For a newsletter or report: the notification goes by email as well as the hub. */
  notification_email: boolean
  audience: 'all' | 'selected' | null
  user_ids: string[]
  needs_approval: boolean
  preview: { doc_id: string | null; kind: string }
}

export const NAMES_SHOWN = 10
const KIND: Record<string, string> = { letter: 'letter', newsletter: 'newsletter', report: 'report' }
export const WHO_ALLOWED: Record<string, Who[]> = { letter: ['one'], newsletter: ['one', 'selected', 'all'], report: ['one', 'selected'] }
const asHow = (v: unknown): How | null => (HOWS as unknown[]).includes(v) ? (v as How) : null
const asWho = (v: unknown): Who | null => (WHOS as unknown[]).includes(v) ? (v as Who) : null

export function planShare(doc: PlanDoc, input: PlanInput, eligible: PlanPerson[], settings: PlanSettings, o: { lastShareAt?: Date | null; now?: Date } = {}): Plan {
  const blockers: string[] = []
  const how = asHow(input.how), who = asWho(input.who)
  const kind = KIND[doc.type] ?? doc.type
  const base: Plan = { ok: false, blockers, what: `${kind}: ${doc.title}`.slice(0, 160), how, who, how_text: '', who_text: '', count: 0, names: [], more: 0, left_out: 0, channels: [], notification_email: false, audience: null, user_ids: [], needs_approval: needsApproval(doc.type), preview: { doc_id: doc.id ?? null, kind } }
  if (!(doc.type in WHO_ALLOWED)) { blockers.push('This kind of document is not shared from here.'); return base }
  if (!how) blockers.push('Choose how it goes: email, a hub notification, or both.')
  if (!who) blockers.push('Choose who gets it: one person, chosen staff, or all staff.')
  if (needsApproval(doc.type)) { const v = canShare({ type: doc.type, status: doc.status, created_by: doc.created_by ?? '' } as any); if (!v.ok) blockers.push(v.reason ?? 'It has to be approved before it can be shared.') }
  if (doc.type === 'report' && doc.data?.internal_only === true) blockers.push('An internal only report may name people, so it can never go to staff.')
  if (doc.type === 'letter' && doc.data?.share_intent?.print_only === true) blockers.push('This letter is marked print only: it stays with you and nothing is sent. Change how it is shared first.')
  if (who && !WHO_ALLOWED[doc.type].includes(who)) blockers.push(doc.type === 'letter' ? 'A letter goes to one person at a time. It cannot be sent to selected staff or to everyone.' : 'A report goes to one person or chosen staff. It cannot be sent to everyone.')

  // who exactly
  let people: PlanPerson[] = []
  const byId = new Map(eligible.map(p => [p.id, p]))
  if (who === 'one' && doc.type === 'letter') {
    const id = String(doc.data?.staff_user_id ?? '')
    const p = byId.get(id)
    if (p) people = [p]; else blockers.push('The person this letter is for is not an active member of staff, so it cannot be sent.')
  } else if (who === 'one' || who === 'selected') {
    const ids = [...new Set((Array.isArray(input.user_ids) ? input.user_ids : []).map(String))]
    if (!ids.length) blockers.push(who === 'one' ? 'Choose the person from your staff list.' : 'Choose at least one person from your staff list.')
    if (who === 'one' && ids.length > 1) blockers.push('Choose just one person, or choose selected staff.')
    people = ids.map(i => byId.get(i)).filter((p): p is PlanPerson => !!p)
    if (ids.length && people.length < ids.length) base.left_out += ids.length - people.length
  } else if (who === 'all') people = eligible

  // anyone without an email address cannot be reached by the notification path (it needs one); they are named in the count, never silently dropped
  const reachable = doc.type === 'letter' && how === 'hub' ? people : people.filter(p => p.has_email)
  base.left_out += people.length - reachable.length
  const send = reachable
  base.count = send.length
  base.names = send.length <= NAMES_SHOWN ? send.map(p => p.name) : []
  base.more = send.length > NAMES_SHOWN ? send.length : 0
  if (who && how && !send.length && !blockers.length) blockers.push('Nobody on that list can be reached. Check the staff list and email addresses.')
  if (send.length > settings.max_recipients) blockers.push(`One send can reach up to ${settings.max_recipients} people. Choose fewer, or change the limit in Ask settings.`)
  if (how && how !== 'hub' && send.length > 1 && !settings.emails_enabled) blockers.push('Emailing several people from Ask CareStream is switched off. Turn it on in Ask settings, or choose a hub notification.')
  if (settings.min_gap_minutes > 0 && o.lastShareAt) {
    const wait = Math.ceil(settings.min_gap_minutes - ((o.now ?? new Date()).getTime() - o.lastShareAt.getTime()) / 60_000)
    if (wait > 0) blockers.push(`Please wait ${wait} more ${wait === 1 ? 'minute' : 'minutes'} since the last send.`)
  }

  // how, in channels
  if (how && doc.type === 'letter') base.channels = how === 'email' ? ['email'] : how === 'hub' ? ['hub'] : ['email', 'hub']
  else if (how) { base.channels = ['notification']; base.notification_email = how !== 'hub' }
  base.audience = who === 'all' ? 'all' : (who ? 'selected' : null)
  base.user_ids = send.map(p => p.id)
  base.how_text = !how ? '' : doc.type === 'letter'
    ? (how === 'email' ? 'By email, as a PDF' : how === 'hub' ? 'In their hub, under My letters, with a hub notification' : 'By email as a PDF, and in their hub under My letters')
    : (how === 'hub' ? 'As a hub notification with the document attached (no email)' : 'By email, and as a hub notification, with the document attached')
  base.who_text = !who ? '' : who === 'all' ? 'All staff' : who === 'one' ? 'One person' : 'Chosen staff'
  base.ok = blockers.length === 0
  return base
}

/** The line shown above the Send button: what, how, to how many (names for ten or fewer). */
export function summaryLine(p: Plan): string {
  if (!p.ok) return ''
  const who = p.names.length ? `${p.count} ${p.count === 1 ? 'person' : 'people'}: ${p.names.join(', ')}` : `${p.count} people`
  return `Send ${p.what}. ${p.how_text}. To ${who}.${p.left_out ? ` ${p.left_out} left out (no email address or not eligible).` : ''}`
}

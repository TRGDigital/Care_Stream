// Starting values for a letter's merge fields, worked out from facts the service already holds. The data is INJECTED (LetterDataSource), so this file has no database in
// it and is tested on its own; loader.ts is the real source.
//
// ADMIN ONLY DATA: pay rates and holiday figures are locked from staff. resolveDefaults will not read them unless the caller passes adminVerified: true, and the callers
// must be admin guarded routes. A staff member must never be able to reach this.

import { TEMPLATES, type FieldDef } from './templates'
import { fmtNumber } from './format'

export interface StaffFacts { name: string; jobRole: string | null; startDate: string | null; contractedHours: number | null }
export interface ServiceFacts { name: string; address?: string | null }
export interface ActorFacts { name: string; jobRole: string | null }
export interface PayFacts { weekday: number | null; weekend: number | null }
export interface HolidayFacts { yearStart: string; yearEnd: string; unit: 'hours' | 'days'; allowance: number | null; carriedIn: number; taken: number; booked: number; remaining: number }
export interface ReferenceFact { value: number | null; asOf?: string | null; stale?: boolean }

export interface LetterDataSource {
  staff(tenantId: string, userId: string): Promise<StaffFacts | null>
  service(tenantId: string): Promise<ServiceFacts | null>
  actor(userId: string): Promise<ActorFacts | null>
  /** ADMIN ONLY. */
  pay(tenantId: string, userId: string): Promise<PayFacts | null>
  /** ADMIN ONLY. */
  holiday(tenantId: string, userId: string, asOf: string): Promise<HolidayFacts | null>
  /** The National Living Wage for people aged 21 and over, from the Data sources register. Null when it is missing, failed or needs review. */
  reference(key: 'nlw_21_plus'): Promise<ReferenceFact | null>
}

export interface ResolveInput { templateId: string; tenantId: string; userId: string; actorUserId: string; today: string; adminVerified: boolean }
export interface Resolved {
  /** Starting values by field key: strings and numbers ready to put in the form. */
  values: Record<string, string | number>
  /** Where each value came from, for a small note in the form (for example "From the holiday matrix"). */
  notes: Record<string, string>
  /** Admin only fields that were left out because the caller was not verified, or that had no data. */
  skipped: string[]
}

const SENSITIVE_PREFIX = ['pay.', 'holiday.']
const isSensitive = (f: FieldDef) => !!f.from && SENSITIVE_PREFIX.some(p => f.from!.startsWith(p))

export async function resolveDefaults(input: ResolveInput, src: LetterDataSource): Promise<Resolved> {
  const t = TEMPLATES.find(x => x.id === input.templateId)
  if (!t) throw new Error(`Unknown letter: ${input.templateId}`)
  const out: Resolved = { values: {}, notes: {}, skipped: [] }
  const wants = (prefix: string) => t.fields.some(f => f.from?.startsWith(prefix))

  // Only read what this letter needs.
  const [staff, service, actor, pay, holiday, nlw] = await Promise.all([
    wants('staff.') ? src.staff(input.tenantId, input.userId) : null,
    wants('service.') ? src.service(input.tenantId) : null,
    wants('actor.') ? src.actor(input.actorUserId) : null,
    wants('pay.') && input.adminVerified ? src.pay(input.tenantId, input.userId) : null,
    wants('holiday.') && input.adminVerified ? src.holiday(input.tenantId, input.userId, input.today) : null,
    wants('ref.nlw_21_plus') ? src.reference('nlw_21_plus') : null,
  ])

  const facts: Record<string, string | number | null | undefined> = {
    'staff.name': staff?.name, 'staff.jobRole': staff?.jobRole, 'staff.startDate': staff?.startDate, 'staff.contractedHours': staff?.contractedHours,
    'service.name': service?.name,
    'actor.name': actor?.name, 'actor.jobRole': actor?.jobRole,
    'today': input.today,
    'pay.weekday': pay?.weekday, 'pay.weekend': pay?.weekend,
    'holiday.yearStart': holiday?.yearStart, 'holiday.yearEnd': holiday?.yearEnd, 'holiday.unit': holiday?.unit, 'holiday.allowance': holiday?.allowance,
    'holiday.carriedIn': holiday && holiday.carriedIn > 0 ? holiday.carriedIn : null,
    'holiday.taken': holiday?.taken, 'holiday.booked': holiday?.booked, 'holiday.remaining': holiday?.remaining,
    'ref.nlw_21_plus': nlw && nlw.value != null && !nlw.stale ? nlw.value : null,
  }

  for (const f of t.fields) {
    if (isSensitive(f) && !input.adminVerified) { out.skipped.push(f.key); continue }
    let v: string | number | null | undefined = f.from ? facts[f.from] : undefined
    if (v === undefined || v === null || v === '') v = f.default
    if (v === undefined || v === null || v === '') { if (f.from) out.skipped.push(f.key); continue }
    out.values[f.key] = v
    if (f.from?.startsWith('holiday.')) out.notes[f.key] = 'From the holiday records'
    else if (f.from?.startsWith('pay.')) out.notes[f.key] = 'From the staff record (locked, admins only)'
    else if (f.from === 'ref.nlw_21_plus') out.notes[f.key] = `From the Data sources register${nlw?.asOf ? `, as of ${nlw.asOf}` : ''}`
    else if (f.from?.startsWith('staff.')) out.notes[f.key] = 'From the staff record'
  }
  // Numbers read tidily in the form (224, not 224.00).
  for (const [k, v] of Object.entries(out.values)) if (typeof v === 'number') out.values[k] = Number(fmtNumber(v))
  return out
}

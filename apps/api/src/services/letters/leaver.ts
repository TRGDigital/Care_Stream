// Defaults for the leaving letters from the holiday entitlement calculator: the holiday pay letter and the resignation letter use the same figures as the Holiday agent.
// ADMIN ONLY data (holiday and pay): callers are admin guarded.
import type { Values } from './render'
import { parseDate, fmtNumber } from './format'
import { loadLeaverInputs, leaverFigures } from '../../lib/holiday-leaver'

export async function withHolidayLeaverDefaults(o: { templateId: string; tenantId: string; userId: string; today: string; values: Values }): Promise<{ values: Values; notes: Record<string, string>; working: string[] }> {
  const out = { values: {} as Values, notes: {} as Record<string, string>, working: [] as string[] }
  if (o.templateId !== 'holiday-pay-on-leaving' && o.templateId !== 'resignation-acknowledged') return out
  const last = parseDate(o.values.last_day)
  if (!last) return out   // the last day is typed by the administrator; nothing to work out until it is known
  let inputs
  try { inputs = await loadLeaverInputs(o.tenantId, o.userId, last) } catch { inputs = null }
  if (!inputs) return out
  const f = leaverFigures(inputs)
  const note = 'Worked out with the holiday entitlement calculator (GOV.UK rules)'
  const set = (k: string, v: string | number | null | undefined) => { if (v != null && v !== '' && (o.values[k] === undefined || o.values[k] === '')) { out.values[k] = typeof v === 'number' ? Number(fmtNumber(v)) : v; out.notes[k] = note } }
  if (o.templateId === 'holiday-pay-on-leaving') {
    set('accrued', f.earned); set('taken', f.taken); set('balance', f.balance); set('unit', inputs.unit)
    if (f.hourlyRate != null && inputs.unit === 'hours') set('hourly_rate', f.hourlyRate)
    if (f.owedPounds != null && f.owed > 0) set('payment', f.owedPounds)
  } else {
    set('holiday_left', Math.max(0, f.balance)); set('unit', inputs.unit)
  }
  out.working = f.working
  return out
}

// Each person's OWN figures for the personalised fields, worked out in code. Only the person's own balance and training are read, and only for the people who will
// receive the message.
import { prisma } from '../../../db/client'
import { holidayYearRows, ukToday, addDays } from '../data'
import { personalValues, type PersonalValues } from './fields'
const p = () => prisma as any

export async function loadPersonalValues(tenantId: string, people: Array<{ id: string; name: string }>, today = ukToday()): Promise<Map<string, PersonalValues>> {
  const out = new Map<string, PersonalValues>()
  let rows: any[] = [], yearEnd: string | null = null
  try { const y = await holidayYearRows(tenantId, today); rows = y.rows; yearEnd = y.to } catch { rows = [] }
  const hol = new Map<string, any>(rows.map((r: any) => [String(r.user_id), r]))
  const counts = new Map<string, number>()
  try {
    const due = await p().trainingEnrollment.findMany({ where: { tenant_id: tenantId, user_id: { in: people.map(x => x.id) }, status: { not: 'complete' }, due_date: { lte: new Date(addDays(today, 30) + 'T23:59:59Z') } }, select: { user_id: true } })
    for (const d of due) counts.set(d.user_id, (counts.get(d.user_id) ?? 0) + 1)
  } catch { /* training tables unavailable: no courses due */ }
  for (const x of people) {
    const h = hol.get(x.id)
    out.set(x.id, personalValues({ name: x.name, unit: h?.unit === 'days' ? 'days' : 'hours', remaining: h ? Number(h.remaining) : null, taken: h ? Number(h.taken) : null, yearEnd, trainingDue: counts.get(x.id) ?? 0 }))
  }
  return out
}

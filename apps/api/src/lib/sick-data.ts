// Sickness recording: reading and writing (holiday pilot, administrators only). Plain SQL against two new tables (sick_spells, sick_days), so nothing existing is
// touched and the code works before the SQL is run: a missing table throws, and the route says "not switched on yet".
import { randomUUID } from 'crypto'
import { prisma } from '../db/client'
import type { CleanSpell, SickSpell, SickDayRow, SickKind, Certificate } from './sick-math'

const p = () => prisma as any
const D = (s: string) => `${s}`

export async function sickTablesReady(): Promise<boolean> {
  try { await p().$queryRawUnsafe('select 1 from sick_spells limit 1'); await p().$queryRawUnsafe('select 1 from sick_days limit 1'); return true } catch { return false }
}

function shapeSpells(rows: any[], dayRows: any[]): SickSpell[] {
  const days = new Map<string, SickDayRow[]>()
  for (const d of dayRows) days.set(d.spell_id, [...(days.get(d.spell_id) ?? []), { day: d.day, hours: Number(d.hours), part: d.part }])
  return rows.map(r => ({
    id: r.id, user_id: r.user_id, first_day: r.first_day, last_day: r.last_day ?? null, note: r.note ?? null, kind: (r.kind ?? 'sick') as SickKind,
    certificate: (r.certificate ?? null) as Certificate | null, return_to_work_done: !!r.return_to_work_done, hours_default: Number(r.hours_default ?? 8),
    days: (days.get(r.id) ?? []).sort((a, b) => a.day.localeCompare(b.day)),
  }))
}

const SPELL_COLS = `id, user_id, to_char(first_day,'YYYY-MM-DD') as first_day, to_char(last_day,'YYYY-MM-DD') as last_day, note, kind, certificate, return_to_work_done, hours_default`

/** Spells that touch the dates (any day inside them, or still open and started before the end), with their stored days. Throws if the tables do not exist. */
export async function loadSpells(tenantId: string, o: { from: string; to: string; userId?: string | null }): Promise<SickSpell[]> {
  const rows: any[] = await p().$queryRawUnsafe(
    `select ${SPELL_COLS} from sick_spells where tenant_id = $1 and first_day <= $3::date and (last_day is null or last_day >= $2::date)${o.userId ? ' and user_id = $4' : ''} order by first_day`,
    ...(o.userId ? [tenantId, o.from, o.to, o.userId] : [tenantId, o.from, o.to]))
  if (!rows.length) return []
  const dayRows: any[] = await p().$queryRawUnsafe(`select spell_id, to_char(day,'YYYY-MM-DD') as day, hours, part from sick_days where spell_id = any($1::text[])`, rows.map(r => r.id))
  return shapeSpells(rows, dayRows)
}

export async function loadSpell(tenantId: string, id: string): Promise<SickSpell | null> {
  const rows: any[] = await p().$queryRawUnsafe(`select ${SPELL_COLS} from sick_spells where tenant_id = $1 and id = $2`, tenantId, id)
  if (!rows.length) return null
  const dayRows: any[] = await p().$queryRawUnsafe(`select spell_id, to_char(day,'YYYY-MM-DD') as day, hours, part from sick_days where spell_id = $1`, id)
  return shapeSpells(rows, dayRows)[0]
}

async function writeDays(tx: any, tenantId: string, userId: string, spellId: string, days: SickDayRow[]) {
  await tx.$executeRawUnsafe('delete from sick_days where spell_id = $1', spellId)
  for (const d of days) {
    await tx.$executeRawUnsafe('insert into sick_days (id, spell_id, tenant_id, user_id, day, hours, part) values ($1,$2,$3,$4,$5::date,$6,$7)', randomUUID(), spellId, tenantId, userId, D(d.day), d.hours, d.part ?? 'full')
  }
}

export async function createSpell(tenantId: string, userId: string, actorId: string, s: CleanSpell): Promise<string> {
  const id = randomUUID()
  await p().$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe(
      `insert into sick_spells (id, tenant_id, user_id, first_day, last_day, note, kind, certificate, return_to_work_done, hours_default, created_by) values ($1,$2,$3,$4::date,$5::date,$6,$7,$8,$9,$10,$11)`,
      id, tenantId, userId, s.first_day, s.last_day, s.note, s.kind, s.certificate, s.return_to_work_done, s.hours_default, actorId)
    await writeDays(tx, tenantId, userId, id, s.days)
  })
  return id
}

export async function updateSpell(tenantId: string, id: string, userId: string, s: CleanSpell): Promise<void> {
  await p().$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe(
      `update sick_spells set first_day=$3::date, last_day=$4::date, note=$5, kind=$6, certificate=$7, return_to_work_done=$8, hours_default=$9, updated_at=now() where tenant_id=$1 and id=$2`,
      tenantId, id, s.first_day, s.last_day, s.note, s.kind, s.certificate, s.return_to_work_done, s.hours_default)
    await writeDays(tx, tenantId, userId, id, s.days)
  })
}

export async function deleteSpell(tenantId: string, id: string): Promise<void> {
  await p().$transaction(async (tx: any) => {
    await tx.$executeRawUnsafe('delete from sick_days where spell_id = $1 and tenant_id = $2', id, tenantId)
    await tx.$executeRawUnsafe('delete from sick_spells where id = $1 and tenant_id = $2', id, tenantId)
  })
}

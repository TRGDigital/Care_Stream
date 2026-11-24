// The database side of the Data sources register: plain SQL on two new tables (data_sources, data_source_history), so no existing query can be affected.
// Written to cope with the tables not existing yet (the SQL is run by the owner after the code ships): callers get a clear "not switched on yet".

import { prisma } from '../db/client'
import type { Db, Row, SourceStatus } from './data-sources'

const q = prisma as any
const iso = (v: any): string | null => (v == null ? null : new Date(v).toISOString())
const day = (v: any): string | null => (v == null ? null : new Date(v).toISOString().slice(0, 10))

const fromDb = (r: any): Row => ({
  key: r.key, name: r.name, publisher: r.publisher ?? '', source_url: r.source_url ?? '', update_frequency: r.update_frequency ?? '',
  effective_from: day(r.effective_from), value: r.value ?? null, previous_value: r.previous_value ?? null,
  fetched_at: iso(r.fetched_at), last_checked_at: iso(r.last_checked_at), last_changed_at: iso(r.last_changed_at), next_check_due: day(r.next_check_due),
  status: r.status as SourceStatus, last_error: r.last_error ?? null, note: r.note ?? null,
})

export const notReady = (e: any) => /data_sources|data_source_history|does not exist|42P01|P2010/i.test(String(e?.message ?? e))

export const dataSourcesDb: Db = {
  async all() {
    const rows: any[] = await q.$queryRawUnsafe('select * from public.data_sources order by key')
    return rows.map(fromDb)
  },
  async save(r: Row) {
    await q.$executeRawUnsafe(
      `insert into public.data_sources (key, name, publisher, source_url, update_frequency, effective_from, value, previous_value, fetched_at, last_checked_at, last_changed_at, next_check_due, status, last_error, note)
       values ($1,$2,$3,$4,$5,$6::date,$7::jsonb,$8::jsonb,$9::timestamptz,$10::timestamptz,$11::timestamptz,$12::date,$13,$14,$15)
       on conflict (key) do update set name=excluded.name, publisher=excluded.publisher, source_url=excluded.source_url, update_frequency=excluded.update_frequency,
         effective_from=excluded.effective_from, value=excluded.value, previous_value=excluded.previous_value, fetched_at=excluded.fetched_at,
         last_checked_at=excluded.last_checked_at, last_changed_at=excluded.last_changed_at, next_check_due=excluded.next_check_due,
         status=excluded.status, last_error=excluded.last_error, note=excluded.note`,
      r.key, r.name, r.publisher, r.source_url, r.update_frequency, r.effective_from, r.value == null ? null : JSON.stringify(r.value), r.previous_value == null ? null : JSON.stringify(r.previous_value),
      r.fetched_at, r.last_checked_at, r.last_changed_at, r.next_check_due, r.status, r.last_error, r.note)
  },
  async history(key: string, r: Row, status: string, note?: string | null) {
    await q.$executeRawUnsafe(
      `insert into public.data_source_history (key, fetched_at, effective_from, value, status, note) values ($1, coalesce($2::timestamptz, now()), $3::date, $4::jsonb, $5, $6)`,
      key, r.fetched_at, r.effective_from, r.value == null ? null : JSON.stringify(r.value), status, note ?? null)
  },
}

export async function historyOf(key: string, limit = 30) {
  const rows: any[] = await q.$queryRawUnsafe('select id, key, fetched_at, effective_from, value, status, note from public.data_source_history where key = $1 order by fetched_at desc limit $2', key, limit)
  return rows.map(r => ({ id: r.id, key: r.key, fetched_at: iso(r.fetched_at), effective_from: day(r.effective_from), value: r.value, status: r.status, note: r.note ?? null }))
}
export async function oneRow(key: string): Promise<Row | null> {
  const rows: any[] = await q.$queryRawUnsafe('select * from public.data_sources where key = $1', key)
  return rows[0] ? fromDb(rows[0]) : null
}

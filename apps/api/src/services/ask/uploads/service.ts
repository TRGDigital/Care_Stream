// The upload workflow in one place: read and clean a file, keep the cleaned copy, show the match table, accept the administrator's choices, and hand ready files to the tools.
import { loadStaff } from '../data'
import { createConversation, getConversation } from '../store'
import * as store from './store'
import { ingest, columnSummary, type Stored } from './ingest'
import { matchPeople, resolveChoices, type MatchRow } from './match'
import { loadRetention, retentionNote, type Retention } from './settings'
import { toNumber } from './sheet'
import type { PayRow, StaffLite, Mapping } from './calc'
import { ukToday } from '../../../lib/holiday-math'

export const MAX_UPLOADS_PER_CHAT = 3
export const MAX_UPLOADS_PER_DAY = 20

export interface Names { rows: Array<{ row: number; name: string }>; hasPeople: boolean }
export function namesOf(s: Stored): Names {
  const i = s.roles.name
  if (s.doc_kind !== 'payroll' || i == null) return { rows: [], hasPeople: false }
  return { hasPeople: true, rows: s.rows.map((r, row) => ({ row, name: r[i] ?? '' })).filter(x => x.name.trim() !== '') }
}
export function payRowsOf(s: Stored): PayRow[] {
  const { roles } = s
  if (roles.name == null) return []
  return s.rows.map((r, row) => ({ row, name: r[roles.name!] ?? '', rate: roles.rate != null ? toNumber(r[roles.rate]) : null, hours: roles.hours != null ? toNumber(r[roles.hours]) : null })).filter(r => r.name.trim() !== '')
}
const lite = (s: Awaited<ReturnType<typeof loadStaff>>[number]): StaffLite => ({ id: s.id, name: s.name, job_role: s.job_role, age: s.age, weekday_rate: s.weekday_rate, weekend_rate: s.weekend_rate, contracted: s.contracted })

export interface View {
  id: string; filename: string; agent_id: string; conversation_id: string; doc_kind: string; kind: string; row_count: number; status: string
  columns: Array<{ name: string; meaning: string | null }>; dropped: Array<{ column: string; reason: string }>; sheet_name: string | null; sheets_found: number | null
  text_totals?: Array<{ label: string; amount: number }>; created_at: string | null; expires_at: string | null; retention_note: string
  match: null | { confirmed: boolean; matched: number; total: number; ambiguous: number; unmatched: number; rows: Array<MatchRow & { chosen: string | null | undefined }>; staff: Array<{ id: string; name: string }> }
}

export async function viewOf(u: store.UploadRow, stored: Stored, retention: Retention): Promise<View> {
  const base: View = {
    id: u.id, filename: u.filename, agent_id: u.agent_id, conversation_id: u.conversation_id, doc_kind: u.doc_kind, kind: u.kind, row_count: u.row_count, status: u.status,
    columns: columnSummary(stored), dropped: stored.dropped, sheet_name: stored.sheet_name ?? null, sheets_found: stored.sheets_found ?? null, text_totals: stored.text_totals,
    created_at: u.created_at, expires_at: u.expires_at, retention_note: u.expires_at ? `Deleted automatically on ${u.expires_at.slice(0, 10)}.` : retentionNote(retention), match: null,
  }
  const n = namesOf(stored)
  if (!n.hasPeople) return base
  const staff = await loadStaff(u.tenant_id, ukToday())
  const rows = matchPeople(n.rows.map(x => x.name), staff.map(s => ({ id: s.id, name: s.name }))).map((m, i) => ({ ...m, row: n.rows[i].row }))
  const saved: Mapping | null = u.match?.mapping ?? null
  const view = rows.map(r => ({ ...r, chosen: saved ? (saved[String(r.row)] ?? null) : undefined }))
  return { ...base, match: { confirmed: !!u.match?.confirmed_at, matched: rows.filter(r => r.status === 'matched').length, ambiguous: rows.filter(r => r.status === 'ambiguous').length, unmatched: rows.filter(r => r.status === 'unmatched').length, total: rows.length, rows: view, staff: staff.map(s => ({ id: s.id, name: s.name })).sort((a, b) => a.name.localeCompare(b.name)) } }
}

export async function addUpload(o: { tenantId: string; userId: string; agentId: string; conversationId?: string | null; buf: Buffer; filename: string }): Promise<{ ok: true; view: View } | { ok: false; code: string; reason: string; status: number }> {
  let convId = o.conversationId ?? ''
  if (convId) {
    const c = await getConversation(o.tenantId, o.userId, convId)
    if (!c || c.agent_id !== o.agentId) return { ok: false, code: 'NOT_FOUND', reason: 'That chat was not found.', status: 404 }
    if ((await store.listFor(o.tenantId, o.userId, convId)).length >= MAX_UPLOADS_PER_CHAT) return { ok: false, code: 'LIMIT', reason: `A chat can hold ${MAX_UPLOADS_PER_CHAT} files. Delete one first, or start a new chat.`, status: 429 }
  }
  if ((await store.countToday(o.tenantId, o.userId)) >= MAX_UPLOADS_PER_DAY) return { ok: false, code: 'LIMIT', reason: 'That is the limit of files for one day. Please try again tomorrow.', status: 429 }
  const r = await ingest(o.buf, o.filename)
  if (!r.ok) return { ok: false, code: 'INVALID_FILE', reason: r.reason, status: 400 }
  if (!convId) convId = await createConversation(o.tenantId, o.userId, o.agentId, `File: ${o.filename}`.slice(0, 80))
  const retention = await loadRetention(o.tenantId)
  const needsMatch = namesOf(r.stored).hasPeople
  const row = await store.create({ tenantId: o.tenantId, userId: o.userId, conversationId: convId, agentId: o.agentId, filename: o.filename, sizeBytes: o.buf.length, stored: r.stored, retention, needsMatch, columns: { columns: columnSummary(r.stored), dropped: r.stored.dropped, sheet: r.stored.sheet_name ?? null } })
  return { ok: true, view: await viewOf(row, r.stored, retention) }
}

/** Saves the administrator's choices. With confirm true and nothing left open, the file becomes ready and the tools may use it. Nothing in CareStream is changed. */
export async function saveChoices(o: { tenantId: string; userId: string; id: string; choices: Record<string, string | null | undefined>; confirm: boolean }): Promise<{ ok: true; view: View } | { ok: false; code: string; reason: string; status: number; open?: number[] }> {
  const u = await store.get(o.tenantId, o.userId, o.id)
  if (!u) return { ok: false, code: 'NOT_FOUND', reason: 'That file was not found.', status: 404 }
  const stored = await store.readStored(u)
  const n = namesOf(stored)
  if (!n.hasPeople) return { ok: false, code: 'INVALID', reason: 'This file has no people to match.', status: 400 }
  const staff = await loadStaff(o.tenantId, ukToday())
  const rows = matchPeople(n.rows.map(x => x.name), staff.map(s => ({ id: s.id, name: s.name }))).map((m, i) => ({ ...m, row: n.rows[i].row }))
  const prior: Mapping = u.match?.mapping ?? {}
  const res = resolveChoices(rows, { ...prior, ...o.choices }, new Set(staff.map(s => s.id)))
  if (res.invalid.length) return { ok: false, code: 'INVALID', reason: 'One of the people chosen is not on your staff list.', status: 400 }
  if (o.confirm && res.open.length) return { ok: false, code: 'OPEN_ROWS', reason: `${res.open.length} ${res.open.length === 1 ? 'name still needs' : 'names still need'} a choice: pick a person, or leave the name out.`, status: 400, open: res.open }
  const merged: Mapping = { ...prior, ...Object.fromEntries(Object.entries(o.choices).filter(([k]) => rows.some(r => String(r.row) === k)).map(([k, v]) => [k, v === 'skip' ? null : (v ?? null)])) }
  const mapping = o.confirm ? res.mapping : merged
  const match = { mapping, confirmed_at: o.confirm ? new Date().toISOString() : null, matched: Object.values(mapping).filter(Boolean).length, left_out: Object.values(mapping).filter(v => v === null).length }
  await store.saveMatch(o.tenantId, o.userId, o.id, match, o.confirm ? 'ready' : 'needs_match')
  const fresh = await store.get(o.tenantId, o.userId, o.id)
  return { ok: true, view: await viewOf(fresh!, stored, await loadRetention(o.tenantId)) }
}

export interface Loaded { upload: store.UploadRow; stored: Stored; mapping: Mapping | null }
/** The ready files in one chat for the tools. A payroll that has not been matched and confirmed is reported, never used. */
export async function loadForChat(tenantId: string, userId: string, conversationId: string | null | undefined, id?: string): Promise<{ files: Loaded[]; waiting: Array<{ id: string; filename: string; why: string }> }> {
  if (!conversationId) return { files: [], waiting: [] }
  const list = (await store.listFor(tenantId, userId, conversationId)).filter(u => !id || u.id === id)
  const files: Loaded[] = [], waiting: Array<{ id: string; filename: string; why: string }> = []
  for (const u of list) {
    if (u.status === 'needs_match') { waiting.push({ id: u.id, filename: u.filename, why: 'The names in this file have not been matched and confirmed yet. Ask the administrator to complete the match table in the chat panel.' }); continue }
    files.push({ upload: u, stored: await store.readStored(u), mapping: u.match?.mapping ?? null })
  }
  return { files, waiting }
}
export { lite as staffLite }

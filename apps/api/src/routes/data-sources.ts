// The Data sources register over HTTP.
//   Platform console (platform token), mounted at /admin/data-sources:  list, history, check now (all or one), enter a figure by hand, hand it back to the automatic check.
//   Admins (any plan), mounted at /data-sources:  GET /figures?keys=a,b  the figures with "as of" and out of date flags, for the Ask CareStream agents.
// The rules live in lib/data-sources.ts; the SQL is in prisma/sql/2026-11-25_data_sources.sql (until it is run, these answer "not switched on yet").

import { Router, Request, Response, NextFunction } from 'express'
import { ok, err } from '../lib/response'
import { requireAdmin, requirePlatformAdmin } from '../middleware/auth'
import { sendDataSourcesEmail } from '../services/email/outbound'
import { SOURCES, sourceByKey, checkAll, toFigure, applyManual, ymd, asOfText } from '../lib/data-sources'
import { dataSourcesDb, historyOf, oneRow, notReady } from '../lib/data-sources-db'

const wrap = (fn: (req: Request, res: Response) => Promise<void>) => async (req: Request, res: Response, next: NextFunction) => {
  try { await fn(req, res) } catch (e: any) {
    if (notReady(e)) { err(res, 'NOT_SET_UP', 'The data sources are not switched on yet.', 503); return }
    next(e)
  }
}
const get = async (url: string) => { const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'CareStream data check (support@carestreamai.com)' } }); if (!r.ok) throw new Error(`HTTP ${r.status} from ${new URL(url).host}`); return r.json() }
const deps = () => ({ db: dataSourcesDb, get, now: () => new Date(), notify: (o: { subject: string; lines: string[] }) => sendDataSourcesEmail(o) })

// ─── Platform console ───────────────────────────────────────────────────────────────────
export const dataSourcesAdminRouter = Router()
dataSourcesAdminRouter.use(requirePlatformAdmin)

dataSourcesAdminRouter.get('/', wrap(async (_req, res) => {
  const today = ymd(new Date()), rows = new Map((await dataSourcesDb.all()).map(r => [r.key, r]))
  ok(res, { today, sources: SOURCES.map(d => {
    const r = rows.get(d.key) ?? null, f = toFigure(d, r, today)
    return {
      ...f, update_frequency: d.update_frequency, fetch_url: d.fetch_url, auto: !!d.fetch, stale_after_days: d.stale_after_days,
      next_check_due: r?.next_check_due ?? null, last_changed_at: r?.last_changed_at ?? null, last_error: r?.last_error ?? null, previous_value: r?.previous_value ?? null, as_of_text: asOfText(f),
    }
  }) })
}))
dataSourcesAdminRouter.post('/check', wrap(async (_req, res) => { ok(res, await checkAll(deps(), { force: true })) }))
dataSourcesAdminRouter.get('/:key/history', wrap(async (req, res) => {
  if (!sourceByKey(String(req.params.key))) { err(res, 'NOT_FOUND', 'No such source.', 404); return }
  ok(res, { history: await historyOf(String(req.params.key)) })
}))
dataSourcesAdminRouter.post('/:key/check', wrap(async (req, res) => {
  const def = sourceByKey(String(req.params.key)); if (!def) { err(res, 'NOT_FOUND', 'No such source.', 404); return }
  if (!def.fetch) { err(res, 'MANUAL_ONLY', 'This figure is entered by hand: there is nothing to check.', 400); return }
  // "Check now" on one source never overwrites a figure that was entered by hand: hand it back first, so it is never lost by accident.
  const row = await oneRow(def.key)
  if (row?.status === 'manual') { err(res, 'MANUAL', 'This figure was entered by hand. Hand it back to the automatic check first.', 409); return }
  ok(res, await checkAll(deps(), { force: true, only: def.key }))
}))
dataSourcesAdminRouter.post('/:key/manual', wrap(async (req, res) => {
  const def = sourceByKey(String(req.params.key)); if (!def) { err(res, 'NOT_FOUND', 'No such source.', 404); return }
  const prev = await oneRow(def.key)
  const r = applyManual(def, prev, { value: req.body?.value, effective_from: req.body?.effective_from, note: req.body?.note }, new Date().toISOString())
  if ('error' in r) { err(res, 'INVALID', r.error, 400); return }
  await dataSourcesDb.save(r.row)
  await dataSourcesDb.history(def.key, r.row, 'manual', `Entered by hand. ${r.row.note ?? ''}`.trim())
  ok(res, { saved: true })
}))
dataSourcesAdminRouter.post('/:key/clear-manual', wrap(async (req, res) => {
  const def = sourceByKey(String(req.params.key)); if (!def) { err(res, 'NOT_FOUND', 'No such source.', 404); return }
  if (!def.fetch) { err(res, 'MANUAL_ONLY', 'This figure can only be entered by hand.', 400); return }
  const prev = await oneRow(def.key); if (!prev || prev.status !== 'manual') { err(res, 'NOT_MANUAL', 'This figure is not entered by hand.', 409); return }
  await dataSourcesDb.save({ ...prev, status: 'needs_review', note: null, last_error: 'Handed back to the automatic check.', next_check_due: null })
  await dataSourcesDb.history(def.key, prev, 'ok', 'Handed back to the automatic check.')
  ok(res, await checkAll(deps(), { force: true, only: def.key }))
}))

// ─── Admins: figures for the agents ─────────────────────────────────────────────────────
export const dataSourcesFiguresRouter = Router()
dataSourcesFiguresRouter.use(requireAdmin)
dataSourcesFiguresRouter.get('/figures', wrap(async (req, res) => {
  const want = String(req.query.keys ?? '').split(',').map(s => s.trim()).filter(Boolean)
  const defs = want.length ? SOURCES.filter(s => want.includes(s.key)) : SOURCES
  const today = ymd(new Date()), rows = new Map((await dataSourcesDb.all()).map(r => [r.key, r]))
  const figures = defs.map(d => { const f = toFigure(d, rows.get(d.key) ?? null, today); return { ...f, as_of_text: asOfText(f) } })
  res.setHeader('Cache-Control', 'private, max-age=300')
  ok(res, { today, figures })
}))

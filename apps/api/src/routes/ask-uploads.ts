// Files attached to an Ask CareStream chat. Mounted at /ask/uploads after the Ask guard. ADMINISTRATORS ONLY: a manager cannot reach any of this (managerMayReach says no).
//   GET  /config           the retention choice and the limits
//   PUT  /config           { retention } administrators choose how long the cleaned copy is kept
//   GET  /?conversation_id the files in one chat
//   POST /                 multipart: file, agent_id, conversation_id? -> the cleaned file and, for a payroll, the match table
//   GET  /:id              one file with its match table
//   POST /:id/match        { choices: { "<row>": staffId | null }, confirm } the administrator completes the match and confirms
//   DELETE /:id            delete the cleaned copy now
// The original file is never stored. Sensitive columns are removed as the file is read (services/ask/uploads/sensitive.ts).
import { Router, Request, Response, NextFunction } from 'express'
import { ok, err } from '../lib/response'
import { writeAuditLog } from '../lib/audit'
import { askUploadMiddleware } from '../middleware/upload'
import { scanBuffer, scannerConfigured } from '../services/security/malware-scan'
import { agentById } from '../services/ask/agents'
import * as store from '../services/ask/uploads/store'
import { addUpload, saveChoices, viewOf, MAX_UPLOADS_PER_CHAT } from '../services/ask/uploads/service'
import { loadRetention, saveRetention, isRetention, RETENTIONS } from '../services/ask/uploads/settings'
import { UPLOAD_AGENTS } from '../services/ask/agents-uploads'

export const askUploadsRouter = Router()
const tenantOf = (req: Request): string => (req as any).user.tenant_id   // not getTenantId(): the multipart parser runs outside the request context on this runtime
const userOf = (req: Request): string => (req as any).user.sub
const noTable = (res: Response) => err(res, 'NOT_READY', 'File uploads are not switched on yet.', 503)

/** Only an administrator (a real one, on the Ask pilot) may use uploads, whatever the Ask guard let through. */
export function adminOnly(req: Request, res: Response, next: NextFunction) {
  if ((req as any).askRole !== 'admin') { err(res, 'NOT_FOUND', 'Not found.', 404); return }
  next()
}
askUploadsRouter.use(adminOnly)

const audit = (req: Request, event: 'ask_upload_added' | 'ask_upload_matched' | 'ask_upload_deleted', id: string, meta: Record<string, unknown> = {}) =>
  void writeAuditLog({ tenant_id: tenantOf(req), user_id: userOf(req), event_type: event, entity_type: 'ask_upload', entity_id: id, metadata: meta })   // never the file name or its content

const wrap = (fn: (req: Request, res: Response) => Promise<void>) => async (req: Request, res: Response) => {
  try { await fn(req, res) } catch (e: any) {
    if (store.notReady(e)) { noTable(res); return }
    console.error('[ask-uploads]', String(e?.message ?? e).slice(0, 200))
    err(res, 'ERROR', 'Something went wrong with that file. Please try again.', 500)
  }
}

askUploadsRouter.get('/config', wrap(async (req, res) => {
  ok(res, { retention: await loadRetention(tenantOf(req)), retentions: RETENTIONS, max_mb: 5, accept: '.xlsx,.csv,.docx,.pdf', per_chat: MAX_UPLOADS_PER_CHAT, agents: Object.keys(UPLOAD_AGENTS) })
}))
askUploadsRouter.put('/config', wrap(async (req, res) => {
  const r = req.body?.retention
  if (!isRetention(r)) { err(res, 'INVALID', 'Choose when uploaded files are deleted.', 400); return }
  await saveRetention(tenantOf(req), r)
  void writeAuditLog({ tenant_id: tenantOf(req), user_id: userOf(req), event_type: 'ask_settings_changed', entity_type: 'ask_action', entity_id: 'upload_retention', metadata: { upload_retention: r } })
  ok(res, { retention: r })
}))

askUploadsRouter.get('/', wrap(async (req, res) => {
  const t = tenantOf(req), u = userOf(req), conv = String(req.query.conversation_id ?? '')
  if (!conv) { ok(res, { uploads: [] }); return }
  void store.sweepExpired(10, t).catch(() => undefined)
  const retention = await loadRetention(t)
  const rows = await store.listFor(t, u, conv)
  const out = []
  for (const r of rows) out.push(await viewOf(r, await store.readStored(r), retention))
  ok(res, { uploads: out })
}))

askUploadsRouter.post('/', askUploadMiddleware, wrap(async (req, res) => {
  const t = tenantOf(req), u = userOf(req)
  const file = (req as any).file as Express.Multer.File | undefined
  if (!file) { err(res, 'NO_FILE', 'No file was attached.', 400); return }
  const agent = agentById(String(req.body?.agent_id ?? ''))
  if (!agent || agent.status !== 'ready' || !agent.uploads) { err(res, 'INVALID', 'That agent does not take files.', 400); return }
  const scan = await scanBuffer(file.buffer, file.originalname)
  if (scan.status === 'infected') { err(res, 'MALWARE_DETECTED', 'That file was flagged by the virus scanner and was not used.', 400); return }
  if (scan.status === 'error' && scannerConfigured()) { err(res, 'SCAN_FAILED', 'The file could not be virus scanned just now, so it was not used. Please try again.', 503); return }
  void store.sweepExpired(10, t).catch(() => undefined)
  const r = await addUpload({ tenantId: t, userId: u, agentId: agent.id, conversationId: String(req.body?.conversation_id ?? '') || null, buf: file.buffer, filename: file.originalname })
  if (!r.ok) { err(res, r.code, r.reason, r.status); return }
  audit(req, 'ask_upload_added', r.view.id, { agent: agent.id, kind: r.view.doc_kind, rows: r.view.row_count, dropped_columns: r.view.dropped.length })
  ok(res, { upload: r.view }, 201)
}))

askUploadsRouter.get('/:id', wrap(async (req, res) => {
  const t = tenantOf(req), u = await store.get(t, userOf(req), String(req.params.id))
  if (!u) { err(res, 'NOT_FOUND', 'That file was not found. It may have been deleted.', 404); return }
  ok(res, { upload: await viewOf(u, await store.readStored(u), await loadRetention(t)) })
}))

askUploadsRouter.post('/:id/match', wrap(async (req, res) => {
  const choices = req.body?.choices && typeof req.body.choices === 'object' ? req.body.choices as Record<string, string | null> : {}
  const r = await saveChoices({ tenantId: tenantOf(req), userId: userOf(req), id: String(req.params.id), choices, confirm: req.body?.confirm === true })
  if (!r.ok) { err(res, r.code, r.reason, r.status); return }
  if (r.view.match?.confirmed) audit(req, 'ask_upload_matched', r.view.id, { matched: r.view.match.matched, total: r.view.match.total })
  ok(res, { upload: r.view })
}))

askUploadsRouter.delete('/:id', wrap(async (req, res) => {
  const u = await store.get(tenantOf(req), userOf(req), String(req.params.id))
  if (!u) { err(res, 'NOT_FOUND', 'That file was not found.', 404); return }
  await store.remove(u)
  audit(req, 'ask_upload_deleted', u.id, { by: 'administrator' })
  ok(res, { deleted: true })
}))

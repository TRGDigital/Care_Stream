// A saved Ask document as a formal, headed Word document, a preview, and the little status the panel needs. Mounted at /ask-docs after requireAuth.
//   GET /status            is the letterhead set up, what is missing, and do I have a signature (never the picture)
//   GET /:id/preview       the headed page as HTML (works on a draft; gaps in a letter show as [Label])
//   GET /:id/docx          the finished Word file (approved or shared documents only, like the PDF); ?sign=1 adds MY signature
// The PDF stays at /ask/documents/:id/pdf (now also on the letterhead, and ?sign=1 adds MY signature).
// A signature is used only for the signed in person, and only when they ask for it in this request. Pilot account and administrators only.

import { Router, Request, Response, NextFunction } from 'express'
import { getTenantId } from '../db/tenant-context'
import { ok, err } from '../lib/response'
import { writeAuditLog } from '../lib/audit'
import { askPilotEnabled } from '../lib/ask-pilot'
import * as store from '../services/ask/store'
import { canShare } from '../services/ask-docs/workflow'
import { docxFor } from '../services/ask-docs/share'
import { previewHtml } from '../services/ask-docs/render-doc'
import { loadLetterhead } from '../services/letters/letterhead'
import { getMeta } from '../services/letters/signatures'

export const askDocsRouter = Router()
const notFound = (res: Response) => err(res, 'NOT_FOUND', 'Not found.', 404)

async function guard(req: Request, res: Response, next: NextFunction) {
  try { if (req.user?.role === 'admin' && !(req.user as any)?.dev && (await askPilotEnabled(getTenantId()))) { next(); return } } catch { /* fall through */ }
  notFound(res)
}
askDocsRouter.use(guard)

const wantsSignature = (req: Request) => req.query.sign === '1' || req.query.sign === 'true'

askDocsRouter.get('/status', async (req: Request, res: Response) => {
  const t = getTenantId()
  const l = await loadLetterhead(t)
  ok(res, { letterhead_ready: l.ready, trading_name: l.head.name, missing: l.missing, signature: (await getMeta(t, req.user!.sub)).has })
})

askDocsRouter.get('/:id/preview', async (req: Request, res: Response) => {
  const t = getTenantId(), u = req.user!.sub
  const d = await store.getDocumentFor(t, u, String(req.params.id)); if (!d) { notFound(res); return }
  try {
    const { html, css } = await previewHtml({ tenantId: t, doc: d, signerUserId: wantsSignature(req) ? u : null })
    res.setHeader('Cache-Control', 'private, no-store')
    ok(res, { html, css })
  } catch (e: any) { err(res, 'PREVIEW_FAILED', 'The preview could not be made just now.', 500) }
})

askDocsRouter.get('/:id/docx', async (req: Request, res: Response) => {
  const t = getTenantId(), u = req.user!.sub
  const d = await store.getDocumentFor(t, u, String(req.params.id)); if (!d) { notFound(res); return }
  const v = canShare(d); if (!v.ok) { err(res, 'NOT_ALLOWED', v.reason, 409); return }
  try {
    const { buffer, filename, mime } = await docxFor(t, d, wantsSignature(req) ? u : null)
    void writeAuditLog({ tenant_id: t, user_id: u, event_type: 'ask_document_docx_downloaded', entity_type: 'ask_document', entity_id: d.id, metadata: { type: d.type, signed: wantsSignature(req) } })
    await store.appendShareRecord(t, d.id, { method: 'word', by: u, at: new Date().toISOString() }); await store.setDocumentStatus(t, d.id, ['approved'], 'shared')
    res.setHeader('Content-Type', mime); res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}"`)
    res.send(buffer)
  } catch (e: any) { err(res, 'DOCX_FAILED', 'The Word document could not be made just now. Please try again.', 500) }
})

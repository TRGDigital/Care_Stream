// A saved Ask document as a formal, headed Word document, a preview, and the little status the panel needs. Mounted at /ask-docs after requireAuth.
//   GET /status            is the letterhead set up, what is missing, and do I have a signature (never the picture)
//   GET /:id/preview       the headed page as HTML (works on a draft; gaps in a letter show as [Label])
//   GET /:id/docx          the finished Word file (approved or shared documents only, like the PDF); ?sign=1 adds MY signature
// The PDF stays at /ask/documents/:id/pdf (now also on the letterhead, and ?sign=1 adds MY signature).
// A signature is used only for the signed in person, and only when they ask for it in this request. Pilot account and administrators only.

import { photoAllowedFor, photoChoice, resolvePerson, staffHasPicture } from '../services/ask-docs/newsletter-photo'
import { Router, Request, Response, NextFunction } from 'express'
import { getTenantId } from '../db/tenant-context'
import { ok, err } from '../lib/response'
import { writeAuditLog } from '../lib/audit'
import { askPilotEnabled } from '../lib/ask-pilot'
import * as store from '../services/ask/store'
import { canShare, canEdit } from '../services/ask-docs/workflow'
import { docxFor } from '../services/ask-docs/share'
import { previewHtml } from '../services/ask-docs/render-doc'
import { loadLetterhead } from '../services/letters/letterhead'
import { prisma } from '../db/client'
import { sampleDesignsFor } from '../services/ask-docs/newsletter-design-doc'
import { getMeta } from '../services/letters/signatures'
import { cleanRequest, renderOptionPreview } from '../services/ask-docs/option-preview'

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
    const { html, css } = await previewHtml({ tenantId: t, doc: d, signerUserId: wantsSignature(req) ? u : null, sentByUserId: u })
    res.setHeader('Cache-Control', 'private, no-store')
    ok(res, { html, css })
  } catch (e: any) { err(res, 'PREVIEW_FAILED', 'The preview could not be made just now.', 500) }
})

// The designed newsletter for text that has not been saved yet, so the preview follows the edits as they are typed. Nothing is stored.
askDocsRouter.post('/:id/preview-draft', async (req: Request, res: Response) => {
  const t = getTenantId(), u = req.user!.sub
  const d = await store.getDocumentFor(t, u, String(req.params.id)); if (!d || d.type !== 'newsletter') { notFound(res); return }
  try {
    const draft = { title: typeof req.body?.title === 'string' ? req.body.title.slice(0, 160) : undefined, body: typeof req.body?.body === 'string' ? req.body.body.slice(0, 20000) : undefined }
    const { html } = await previewHtml({ tenantId: t, doc: d, sentByUserId: u, draft })
    res.setHeader('Cache-Control', 'private, no-store')
    ok(res, { html })
  } catch (e: any) { err(res, 'PREVIEW_FAILED', 'The preview could not be made just now.', 500) }
})

// A photo of one person in the newsletter (employee of the month, a staff story, new starters, leavers): only when the administrator chooses a person here AND confirms the person agrees,
// and only their staff picture. user_id null removes it. Email never carries a photo (initials and a note instead); the hub, the preview and the PDF do.
askDocsRouter.post('/:id/newsletter-photo', async (req: Request, res: Response) => {
  const t = getTenantId(), u = req.user!.sub
  const d = await store.getDocumentFor(t, u, String(req.params.id)); if (!d || d.type !== 'newsletter') { notFound(res); return }
  const ed = canEdit(d, u); if (!ed.ok) { err(res, 'NOT_ALLOWED', ed.reason, 409); return }
  const uid = req.body?.user_id == null || req.body.user_id === '' ? null : String(req.body.user_id)
  let photo: Record<string, unknown> | null = null
  if (uid) {
    if (!photoAllowedFor(d.data?.template_id)) { err(res, 'INVALID', 'A person\'s picture can only go in an employee of the month, staff story, new starters or leavers newsletter.', 400); return }
    const who = await resolvePerson(t, { user_id: uid })
    if (!who.ok) { err(res, 'INVALID', 'That person was not found.', 400); return }
    const ch = photoChoice({ userId: who.id, consent: req.body?.consent, actorId: u })
    if (!ch.ok) { err(res, 'CONSENT_REQUIRED', ch.reason, 400); return }
    photo = ch.photo as unknown as Record<string, unknown>
  }
  const data = { ...(d.data ?? {}), photo }
  await store.updateDocumentContent(t, d.id, { data })
  void writeAuditLog({ tenant_id: t, user_id: u, event_type: 'ask_newsletter_photo_set', entity_type: 'ask_document', entity_id: d.id, metadata: { included: !!uid, consent: !!uid } })
  ok(res, { saved: true, photo_user_id: uid, has_picture: uid ? await staffHasPicture(t, uid) : false })
})
// Who the picture is of and whether they have one yet (so the screen can say so plainly).
askDocsRouter.get('/:id/newsletter-photo', async (req: Request, res: Response) => {
  const t = getTenantId(), u = req.user!.sub
  const d = await store.getDocumentFor(t, u, String(req.params.id)); if (!d || d.type !== 'newsletter') { notFound(res); return }
  const ph = d.data?.photo
  if (!ph?.user_id) { ok(res, { chosen: false }); return }
  const who = await resolvePerson(t, { user_id: String(ph.user_id) })
  ok(res, { chosen: true, name: who.ok ? who.name : null, consent: ph.consent === true, has_picture: who.ok ? await staffHasPicture(t, who.id) : false })
})

// A SAMPLE of one option an agent offers (a newsletter layout, a letter, a report, a notification, an email), with the organisation's own logo and colour and placeholder words only.
// Never reads staff or resident records and never calls the model.
askDocsRouter.get('/option-preview', async (req: Request, res: Response) => {
  const q = cleanRequest(req.query)
  if (!q) { err(res, 'INVALID', 'That option cannot be previewed.', 400); return }
  try { res.setHeader('Cache-Control', 'private, max-age=120'); ok(res, await renderOptionPreview(getTenantId(), q)) } catch { err(res, 'PREVIEW_FAILED', 'The preview could not be made just now.', 500) }
})

// Sample designs (marked SAMPLE) of every layout of one newsletter type, for the thumbnails when choosing a layout.
askDocsRouter.get('/newsletter-samples/:type', async (req: Request, res: Response) => {
  const type = String(req.params.type).replace(/[^a-z0-9-]/g, '').slice(0, 60)
  try { res.setHeader('Cache-Control', 'private, max-age=300'); ok(res, { designs: await sampleDesignsFor(getTenantId(), type) }) } catch { err(res, 'PREVIEW_FAILED', 'The samples could not be made just now.', 500) }
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

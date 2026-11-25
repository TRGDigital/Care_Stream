// A saved Ask document as a formal, headed Word document, a preview, and the little status the panel needs. Mounted at /ask-docs after requireAuth.
//   GET /status            is the letterhead set up, what is missing, and do I have a signature (never the picture)
//   GET /:id/preview       the headed page as HTML (works on a draft; gaps in a letter show as [Label])
//   GET /:id/docx          the finished Word file (approved or shared documents only, like the PDF); ?sign=1 adds MY signature
// The PDF stays at /ask/documents/:id/pdf (now also on the letterhead, and ?sign=1 adds MY signature).
// A signature is used only for the signed in person, and only when they ask for it in this request. Pilot account and administrators only.

import { photoAllowedFor, photoChoice, resolvePerson, staffHasPicture, featuredOf, featuredFromChoices, detectGiftImage, giftAllowedFor, lintGift, giftKey, GIFT_IMAGE_ID } from '../services/ask-docs/newsletter-photo'
import { randomUUID } from 'crypto'
import { listItems, applyOp, PALETTES, BLOCK_TYPES, CALLOUT_ICONS, MAX_CUSTOM, blockImageKey, type Op } from '../services/ask-docs/newsletter-edit'
import { lintForTemplate } from '../services/ask/newsletter-tools'
import { newsletterTemplate } from '../services/ask-docs/newsletter-templates'
import { LOOKS } from '../services/ask-docs/newsletter-design'
import { putPrivateObject } from '../services/storage/s3'
import { giftImageMiddleware } from '../middleware/upload'
import { Router, Request, Response, NextFunction } from 'express'
import { getTenantId } from '../db/tenant-context'
import { ok, err } from '../lib/response'
import { writeAuditLog } from '../lib/audit'
import { askPilotEnabled } from '../lib/ask-pilot'
import * as store from '../services/ask/store'
import { canShare, canEdit } from '../services/ask-docs/workflow'
import { docxFor } from '../services/ask-docs/share'
import { previewHtml, DRAFT_STAMP } from '../services/ask-docs/render-doc'
import { loadLetterhead } from '../services/letters/letterhead'
import { prisma } from '../db/client'
import { sampleDesignsFor } from '../services/ask-docs/newsletter-design-doc'
import { getMeta } from '../services/letters/signatures'
import { cleanRequest, renderOptionPreview, renderOptionPreviewPdf } from '../services/ask-docs/option-preview'

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
    const { html, css, sheet, orientation, pages } = await previewHtml({ tenantId: t, doc: d, signerUserId: wantsSignature(req) ? u : null, sentByUserId: u, stamp: ['approved', 'shared'].includes(String(d.status)) ? null : DRAFT_STAMP })
    res.setHeader('Cache-Control', 'private, no-store')
    ok(res, { html, css, ...(sheet ? { sheet, orientation, pages } : {}) })
  } catch (e: any) { err(res, 'PREVIEW_FAILED', 'The preview could not be made just now.', 500) }
})

// The designed newsletter for text that has not been saved yet, so the preview follows the edits as they are typed. Nothing is stored.
askDocsRouter.post('/:id/preview-draft', async (req: Request, res: Response) => {
  const t = getTenantId(), u = req.user!.sub
  const d = await store.getDocumentFor(t, u, String(req.params.id)); if (!d || d.type !== 'newsletter') { notFound(res); return }
  try {
    const draft = { title: typeof req.body?.title === 'string' ? req.body.title.slice(0, 160) : undefined, body: typeof req.body?.body === 'string' ? req.body.body.slice(0, 20000) : undefined }
    const { html, sheet, orientation, pages } = await previewHtml({ tenantId: t, doc: d, sentByUserId: u, draft, stamp: ['approved', 'shared'].includes(String(d.status)) ? null : DRAFT_STAMP })
    res.setHeader('Cache-Control', 'private, no-store')
    ok(res, { html, ...(sheet ? { sheet, orientation, pages } : {}) })
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
  const data = { ...(d.data ?? {}), photo, photos: photo ? [photo] : [] }   // the old single choice is a list of one
  await store.updateDocumentContent(t, d.id, { data })
  void writeAuditLog({ tenant_id: t, user_id: u, event_type: 'ask_newsletter_photo_set', entity_type: 'ask_document', entity_id: d.id, metadata: { included: !!uid, consent: !!uid } })
  ok(res, { saved: true, photo_user_id: uid, has_picture: uid ? await staffHasPicture(t, uid) : false })
})
// Who the picture is of and whether they have one yet (so the screen can say so plainly).
askDocsRouter.get('/:id/newsletter-photo', async (req: Request, res: Response) => {
  const t = getTenantId(), u = req.user!.sub
  const d = await store.getDocumentFor(t, u, String(req.params.id)); if (!d || d.type !== 'newsletter') { notFound(res); return }
  const list = featuredOf(d.data)
  if (!list.length) { ok(res, { chosen: false }); return }
  const people: Array<{ name: string | null; has_picture: boolean }> = []
  for (const ph of list) { const who = await resolvePerson(t, { user_id: String(ph.user_id) }); people.push({ name: who.ok ? who.name : null, has_picture: who.ok ? await staffHasPicture(t, who.id) : false }) }
  ok(res, { chosen: true, name: people[0].name, consent: true, has_picture: people[0].has_picture, people })
})

// Everyone featured in the newsletter, with whether each has a staff picture, and the way to change the group: the whole list is sent, someone already featured keeps their recorded agreement,
// someone new needs the tick, and removing one person removes only that person.
askDocsRouter.get('/:id/newsletter-people', async (req: Request, res: Response) => {
  const t = getTenantId(), u = req.user!.sub
  const d = await store.getDocumentFor(t, u, String(req.params.id)); if (!d || d.type !== 'newsletter') { notFound(res); return }
  const people: Array<{ user_id: string; name: string | null; has_picture: boolean; agreed_at: string }> = []
  for (const ph of featuredOf(d.data)) { const who = await resolvePerson(t, { user_id: String(ph.user_id) }); people.push({ user_id: String(ph.user_id), name: who.ok ? who.name : null, has_picture: who.ok ? await staffHasPicture(t, who.id) : false, agreed_at: ph.consent_at }) }
  ok(res, { allowed: photoAllowedFor(d.data?.template_id), people })
})
askDocsRouter.post('/:id/newsletter-people', async (req: Request, res: Response) => {
  const t = getTenantId(), u = req.user!.sub
  const d = await store.getDocumentFor(t, u, String(req.params.id)); if (!d || d.type !== 'newsletter') { notFound(res); return }
  const ed = canEdit(d, u); if (!ed.ok) { err(res, 'NOT_ALLOWED', ed.reason, 409); return }
  if (!photoAllowedFor(d.data?.template_id)) { err(res, 'INVALID', 'People can only be featured in an employee of the month, staff story, new starters or leavers newsletter.', 400); return }
  const choices = Array.isArray(req.body?.people) ? req.body.people.slice(0, 16) : []
  const ids: string[] = []
  for (const c of choices) {
    const who = await resolvePerson(t, { user_id: String(c?.user_id ?? '') })
    if (!who.ok) { err(res, 'INVALID', 'One of those people was not found.', 400); return }
    ids.push(who.id)
  }
  const r = featuredFromChoices(featuredOf(d.data), choices.map((c: any, i: number) => ({ user_id: ids[i], consent: c?.consent })), u)
  if (!r.ok) { err(res, 'CONSENT_REQUIRED', r.reason, 400); return }
  const data = { ...(d.data ?? {}), photos: r.list, photo: r.list[0] ?? null }
  await store.updateDocumentContent(t, d.id, { data })
  void writeAuditLog({ tenant_id: t, user_id: u, event_type: 'ask_newsletter_photo_set', entity_type: 'ask_document', entity_id: d.id, metadata: { included: r.list.length, consent: r.list.length } })
  ok(res, { saved: true, count: r.list.length })
})

// The optional GIFT picture for an Employee of the month style newsletter: png, jpg or webp, at most 1 MB, checked on its real bytes, kept privately for this account only. Returns the id to
// use in the newsletter. Without a picture the newsletter shows a gift icon.
askDocsRouter.post('/gift-image', giftImageMiddleware, async (req: Request, res: Response) => {
  const t = getTenantId(), u = req.user!.sub
  const file = (req as any).file as Express.Multer.File | undefined
  if (!file) { err(res, 'NO_FILE', 'No picture was sent.', 400); return }
  const kind = detectGiftImage(file.buffer)
  if (!kind) { err(res, 'INVALID_FILE', 'That is not a png, jpg or webp picture.', 400); return }
  const image_id = `${randomUUID()}.${kind.ext}`
  try { await putPrivateObject(giftKey(t, image_id), file.buffer, kind.mime) } catch { err(res, 'UPLOAD_FAILED', 'The picture could not be stored just now. Please try again.', 500); return }
  void writeAuditLog({ tenant_id: t, user_id: u, event_type: 'ask_gift_image_uploaded', entity_type: 'ask_document', entity_id: image_id, metadata: { size: file.size, type: kind.ext } })
  ok(res, { image_id }, 201)
})
// Sets or clears the gift on a newsletter draft: words (a pound value is allowed here) and the picture id from the upload above. Both empty removes the gift.
askDocsRouter.put('/:id/gift', async (req: Request, res: Response) => {
  const t = getTenantId(), u = req.user!.sub
  const d = await store.getDocumentFor(t, u, String(req.params.id)); if (!d || d.type !== 'newsletter') { notFound(res); return }
  const ed = canEdit(d, u); if (!ed.ok) { err(res, 'NOT_ALLOWED', ed.reason, 409); return }
  const text = String(req.body?.text ?? '').trim(), imageId = req.body?.image_id == null ? '' : String(req.body.image_id)
  if ((text || imageId) && !giftAllowedFor(d.data?.template_id)) { err(res, 'INVALID', 'A gift can only go in an employee of the month, staff story or recognition newsletter.', 400); return }
  const problems = lintGift(text); if (problems.length) { err(res, 'INVALID', problems[0], 400); return }
  if (imageId && !GIFT_IMAGE_ID.test(imageId)) { err(res, 'INVALID', 'That picture id is not valid.', 400); return }
  const data = { ...(d.data ?? {}) }
  if (text || imageId) data.gift = { text, image_id: imageId || null }; else delete data.gift
  await store.updateDocumentContent(t, d.id, { data })
  void writeAuditLog({ tenant_id: t, user_id: u, event_type: 'ask_newsletter_gift_set', entity_type: 'ask_document', entity_id: d.id, metadata: { gift: !!(text || imageId), picture: !!imageId } })
  ok(res, { saved: true, gift: data.gift ?? null })
})

// ── Changing a newsletter in the panel: colours (overall and per block) and the blocks a tenant adds, moves, copies or deletes. Admins who may edit the draft only. ──
// Reading: the blocks in order with their looks, the ready made palettes, the account's brand colour and the colour in use. Writing: one change at a time, checked by the same
// code the agent uses, and the words are checked against the newsletter house rules before anything is stored.
askDocsRouter.get('/:id/newsletter-edit', async (req: Request, res: Response) => {
  const t = getTenantId(), u = req.user!.sub
  const d = await store.getDocumentFor(t, u, String(req.params.id)); if (!d || d.type !== 'newsletter') { notFound(res); return }
  const tpl = newsletterTemplate(String(d.data?.template_id ?? ''))
  let brand: string | null = null; try { brand = (await loadLetterhead(t)).head.brandColour ?? null } catch { brand = null }
  const category = (LOOKS[tpl?.category ?? 'whole-team'] ?? LOOKS['whole-team']).accent
  ok(res, { can_edit: canEdit(d, u).ok, items: listItems(d.body, d.data), accent: typeof d.data?.accent === 'string' ? d.data.accent : null, brand_colour: brand, category_colour: category, palettes: PALETTES,
    block_types: BLOCK_TYPES, callout_icons: CALLOUT_ICONS, styles: ['soft', 'bold', 'outline', 'none'], max_custom: MAX_CUSTOM })
})
askDocsRouter.post('/:id/newsletter-edit', async (req: Request, res: Response) => {
  const t = getTenantId(), u = req.user!.sub
  const d = await store.getDocumentFor(t, u, String(req.params.id)); if (!d || d.type !== 'newsletter') { notFound(res); return }
  const ed = canEdit(d, u); if (!ed.ok) { err(res, 'NOT_ALLOWED', ed.reason, 409); return }
  const op = req.body as Op
  if (!op || typeof (op as any).op !== 'string') { err(res, 'INVALID', 'Say what to change.', 400); return }
  const r = applyOp({ body: d.body, data: d.data ?? {} }, op)
  if (!r.ok) { err(res, 'INVALID', r.message, 400); return }
  if (r.texts.some(x => x.trim())) { const problems = await lintForTemplate(r.texts.filter(Boolean).join('\n'), String(d.data?.template_id ?? ''), { allowMoney: true }); if (problems.length) { err(res, 'INVALID', problems[0], 400); return } }
  if (op.op === 'add' && op.type === 'picture_text') { try { await (await import('../services/storage/s3')).downloadFile(blockImageKey(t, String((op.content as any)?.image_id ?? ''))) } catch { err(res, 'INVALID', 'That picture was not found for this account. Please add it again.', 400); return } }
  await store.updateDocumentContent(t, d.id, { ...(r.state.body !== d.body ? { body: r.state.body } : {}), data: r.state.data })
  void writeAuditLog({ tenant_id: t, user_id: u, event_type: 'ask_newsletter_edited', entity_type: 'ask_document', entity_id: d.id, metadata: { op: op.op, type: (op as any).type ?? null } })
  ok(res, { saved: true, id: r.id ?? null, items: listItems(r.state.body, r.state.data), accent: typeof r.state.data?.accent === 'string' ? r.state.data.accent : null })
})
// The picture of a picture block: png, jpg or webp, at most 1 MB, checked on its real bytes, kept privately for this account only. Returns the id to use in the block.
askDocsRouter.post('/block-image', giftImageMiddleware, async (req: Request, res: Response) => {
  const t = getTenantId(), u = req.user!.sub
  const file = (req as any).file as Express.Multer.File | undefined
  if (!file) { err(res, 'NO_FILE', 'No picture was sent.', 400); return }
  const kind = detectGiftImage(file.buffer)
  if (!kind) { err(res, 'INVALID_FILE', 'That is not a png, jpg or webp picture.', 400); return }
  const image_id = `${randomUUID()}.${kind.ext}`
  try { await putPrivateObject(blockImageKey(t, image_id), file.buffer, kind.mime) } catch { err(res, 'UPLOAD_FAILED', 'The picture could not be stored just now. Please try again.', 500); return }
  void writeAuditLog({ tenant_id: t, user_id: u, event_type: 'ask_block_image_uploaded', entity_type: 'ask_document', entity_id: image_id, metadata: { size: file.size, type: kind.ext } })
  ok(res, { image_id }, 201)
})

// A SAMPLE of one option an agent offers (a newsletter layout, a letter, a report, a notification, an email), with the organisation's own logo and colour and placeholder words only.
// Never reads staff or resident records and never calls the model.
askDocsRouter.get('/option-preview', async (req: Request, res: Response) => {
  const q = cleanRequest(req.query)
  if (!q) { err(res, 'INVALID', 'That option cannot be previewed.', 400); return }
  try { res.setHeader('Cache-Control', q.kind === 'newsletter_palette' ? 'private, no-store' : 'private, max-age=120'); ok(res, await renderOptionPreview(getTenantId(), q, {}, req.user!.sub)) } catch { err(res, 'PREVIEW_FAILED', 'The preview could not be made just now.', 500) }
})

// The same sample as a PDF (SAMPLE printed on every page), for Save PDF and Print on a preview. Never reads staff or resident records, never calls the model.
askDocsRouter.get('/option-preview/pdf', async (req: Request, res: Response) => {
  const q = cleanRequest(req.query)
  if (!q || q.kind === 'newsletter_palette') { err(res, 'INVALID', 'That option cannot be previewed.', 400); return }
  try {
    const { buffer, filename } = await renderOptionPreviewPdf(getTenantId(), q)
    void writeAuditLog({ tenant_id: getTenantId(), user_id: req.user!.sub, event_type: 'ask_option_preview_pdf', entity_type: 'ask_document', entity_id: 'option-preview', metadata: { kind: q.kind } })
    res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}"`)
    res.send(buffer)
  } catch { err(res, 'PDF_FAILED', 'The PDF could not be made just now. Please try again.', 500) }
})

// Sample designs (marked SAMPLE) of every layout of one newsletter type, for the thumbnails when choosing a layout.
askDocsRouter.get('/newsletter-samples/:type', async (req: Request, res: Response) => {
  const type = String(req.params.type).replace(/[^a-z0-9-]/g, '').slice(0, 60)
  try { res.setHeader('Cache-Control', 'private, max-age=300'); ok(res, { designs: await sampleDesignsFor(getTenantId(), type) }) } catch { err(res, 'PREVIEW_FAILED', 'The samples could not be made just now.', 500) }
})

askDocsRouter.get('/:id/docx', async (req: Request, res: Response) => {
  const t = getTenantId(), u = req.user!.sub
  const d = await store.getDocumentFor(t, u, String(req.params.id)); if (!d) { notFound(res); return }
  const v = canShare(d), draft = !v.ok
  if (draft && req.query.draft !== '1') { err(res, 'NOT_ALLOWED', v.ok ? '' : v.reason, 409); return }
  try {
    const { buffer, filename, mime } = await docxFor(t, d, wantsSignature(req) ? u : null, draft ? DRAFT_STAMP : undefined)
    if (draft) void writeAuditLog({ tenant_id: t, user_id: u, event_type: 'ask_document_draft_copy', entity_type: 'ask_document', entity_id: d.id, metadata: { type: d.type, format: 'docx' } })
    else { void writeAuditLog({ tenant_id: t, user_id: u, event_type: 'ask_document_docx_downloaded', entity_type: 'ask_document', entity_id: d.id, metadata: { type: d.type, signed: wantsSignature(req) } }); await store.appendShareRecord(t, d.id, { method: 'word', by: u, at: new Date().toISOString() }); await store.setDocumentStatus(t, d.id, ['approved'], 'shared') }
    res.setHeader('Content-Type', mime); res.setHeader('Cache-Control', 'private, no-store'); res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}"`)
    res.send(buffer)
  } catch (e: any) { err(res, 'DOCX_FAILED', 'The Word document could not be made just now. Please try again.', 500) }
})

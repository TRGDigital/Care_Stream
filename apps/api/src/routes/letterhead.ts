// The organisation's letterhead and company details (Settings > Letterhead and company details).
//   GET  /letterhead           the saved details (or sensible empty ones), what is still missing, and whether the SQL has been run
//   POST /letterhead/preview   the letterhead and footer as they will print, for the details in the request (nothing is saved)
//   PUT  /letterhead           save (administrators only)
// Pilot: shown only to accounts in the Ask CareStream pilot (CS-1001) for now; every other account gets a plain 404. The letterhead CODE (services/letters/letterhead.ts) is generic.

import { Router, Request, Response, NextFunction } from 'express'
import { getTenantId } from '../db/tenant-context'
import { ok, err } from '../lib/response'
import { writeAuditLog } from '../lib/audit'
import { askPilotEnabled } from '../lib/ask-pilot'
import { cleanDetails, EMPTY_DETAILS, getDetails, saveDetails, letterheadTableReady, loadLetterhead, toLetterhead, missingChecklist, REGISTERED_IN } from '../services/letters/letterhead'
import { layoutToHtml, PREVIEW_CSS, type LayoutDoc } from '../services/letters/layout'

export const letterheadRouter = Router()
const notFound = (res: Response) => err(res, 'NOT_FOUND', 'Not found.', 404)

async function guard(req: Request, res: Response, next: NextFunction) {
  try { if (await askPilotEnabled(getTenantId()) && req.user?.role === 'admin') { next(); return } } catch { /* fall through */ }
  notFound(res)
}
letterheadRouter.use(guard)

/** A sample letter, so the preview shows the whole page: header, body, a place to sign and the footer. No real person or figure. */
export function sampleLetter(head: ReturnType<typeof toLetterhead>): LayoutDoc {
  return {
    kind: 'letter', head, date: '1 December 2026', confidential: true,
    recipient: { name: 'Alex Example', role: 'Care Assistant' },
    subject: 'A sample letter',
    blocks: [
      { t: 'p', text: 'This is how a letter from your organisation will look when it is printed or saved as a PDF or a Word document.' },
      { t: 'p', text: 'Your logo, name and address are at the top of every page, and your company details are at the bottom.' },
    ],
    closing: 'Yours sincerely,',
    signer: { name: 'Sam Manager', role: 'Registered Manager', signature: null },
  }
}

letterheadRouter.get('/', async (_req: Request, res: Response) => {
  const t = getTenantId()
  const ready = await letterheadTableReady()
  const l = await loadLetterhead(t)
  ok(res, { table_ready: ready, details: l.details ?? EMPTY_DETAILS, display_name: l.displayName, has_logo: !!l.head.logoDataUrl, missing: l.missing, registered_in_options: REGISTERED_IN })
})

letterheadRouter.post('/preview', async (req: Request, res: Response) => {
  const t = getTenantId()
  const l = await loadLetterhead(t)
  const details = cleanDetails(req.body ?? {})
  const head = toLetterhead(details, l.displayName, l.head.logoDataUrl ?? null)
  ok(res, { html: layoutToHtml(sampleLetter(head), l.head.logoDataUrl ?? null), css: PREVIEW_CSS, missing: missingChecklist(details, !!l.head.logoDataUrl) })
})

letterheadRouter.put('/', async (req: Request, res: Response) => {
  const t = getTenantId()
  if (!(await letterheadTableReady())) { err(res, 'NOT_READY', 'Letterhead details are not switched on yet.', 503); return }
  const d = cleanDetails(req.body ?? {})
  try {
    await saveDetails(t, d, req.user!.sub)
    void writeAuditLog({ tenant_id: t, user_id: req.user!.sub, event_type: 'letterhead_updated', entity_type: 'letterhead', entity_id: t, metadata: {} })
    const l = await loadLetterhead(t)
    ok(res, { saved: true, details: (await getDetails(t)) ?? d, missing: l.missing })
  } catch (e: any) { console.error('[letterhead] save failed:', String(e?.message ?? e).slice(0, 160)); err(res, 'ERROR', 'The details could not be saved just now. Please try again.', 500) }
})

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
import { withOrgAddress, cleanDetails, EMPTY_DETAILS, getDetails, saveDetails, letterheadTableReady, loadLetterhead, toLetterhead, missingChecklist, REGISTERED_IN, brandColumnReady, saveBrandColour } from '../services/letters/letterhead'
import { validateBrandColour, usableBrand, SWATCHES, DEFAULT_BRAND } from '../lib/brand-colour'
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
  ok(res, { organisation_address: l.orgAddress, address_from_organisation: l.addressFromOrg, table_ready: ready, brand_ready: await brandColumnReady(), brand_colour: l.head.brandColour ?? null, brand_default: DEFAULT_BRAND, brand_swatches: SWATCHES, details: l.details ?? EMPTY_DETAILS, display_name: l.displayName, has_logo: !!l.head.logoDataUrl, missing: l.missing, registered_in_options: REGISTERED_IN })
})

letterheadRouter.post('/preview', async (req: Request, res: Response) => {
  const t = getTenantId()
  const l = await loadLetterhead(t)
  const details = cleanDetails(req.body ?? {})
  const head = toLetterhead(details, l.displayName, l.head.logoDataUrl ?? null)
  head.brandColour = 'brand_colour' in (req.body ?? {}) ? usableBrand(req.body.brand_colour) : (l.head.brandColour ?? null)   // the colour in the form, before it is saved
  const eff = withOrgAddress(details, l.orgAddress).details ?? details
  head.addressLines = toLetterhead(eff, l.displayName, null).addressLines; head.address = (head.addressLines ?? []).join(', ') || null
  ok(res, { html: layoutToHtml(sampleLetter(head), l.head.logoDataUrl ?? null), css: PREVIEW_CSS, missing: missingChecklist(eff, !!l.head.logoDataUrl) })
})

letterheadRouter.put('/', async (req: Request, res: Response) => {
  const t = getTenantId()
  if (!(await letterheadTableReady())) { err(res, 'NOT_READY', 'Letterhead details are not switched on yet.', 503); return }
  const d = cleanDetails(req.body ?? {})
  // The brand colour is checked first, so a bad colour changes nothing. A missing column never stops the rest being saved.
  const wantsBrand = 'brand_colour' in (req.body ?? {})
  const brand = wantsBrand ? validateBrandColour(req.body.brand_colour) : null
  if (brand && !brand.ok) { err(res, 'VALIDATION_ERROR', brand.message, 400); return }
  try {
    await saveDetails(t, d, req.user!.sub)
    let brandNote: string | null = null
    if (brand && brand.ok) {
      if (await brandColumnReady()) await saveBrandColour(t, brand.value, req.user!.sub)
      else if (brand.value) brandNote = 'The brand colour needs a database update before it can be saved. Everything else was saved.'
    }
    void writeAuditLog({ tenant_id: t, user_id: req.user!.sub, event_type: 'letterhead_updated', entity_type: 'letterhead', entity_id: t, metadata: {} })
    const l = await loadLetterhead(t)
    ok(res, { saved: true, details: (await getDetails(t)) ?? d, missing: l.missing, brand_colour: l.head.brandColour ?? null, brand_note: brandNote })
  } catch (e: any) { console.error('[letterhead] save failed:', String(e?.message ?? e).slice(0, 160)); err(res, 'ERROR', 'The details could not be saved just now. Please try again.', 500) }
})

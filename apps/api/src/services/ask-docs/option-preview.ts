// SAMPLE previews of the things an agent offers as options (a newsletter layout, a letter, a report, a notification, an email). Used by the options block in the Ask panel:
// each option has a Preview button that opens the design with clearly marked placeholder words and NONE of the person's real information, but WITH the organisation's own look:
// the logo uploaded in Settings, the letterhead details (letters and reports) and the brand colour when the account has one.
// Nothing here calls a model, reads staff or resident records, or changes anything: the same option always gives the same sample. Admin only (the route guards it).
import { prisma } from '../../db/client'
import { loadLetterhead } from '../letters/letterhead'
import { getTemplate as getLetterTemplate } from '../letters/render'
import { layout as letterLayout } from '../letters'
import { layoutToHtml, PREVIEW_CSS, type LayoutDoc } from '../letters/layout'
import { reportTemplate } from '../ask/report-templates'
import { renderNewsletterHtml, sampleBody, contrast } from './newsletter-design'
import { newsletterTemplate, NEWSLETTER_TEMPLATES } from './newsletter-templates'

export const PREVIEW_KINDS = ['newsletter', 'letter', 'report', 'notification', 'email', 'other'] as const
export type PreviewKind = (typeof PREVIEW_KINDS)[number]
export interface PreviewRequest { kind: PreviewKind; template_id?: string | null; layout?: string | null }
export interface PreviewResult { kind: PreviewKind; title: string; html: string; css: string; sample: true; has_logo: boolean; brand_colour: string | null; note: string | null }

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
export const SAMPLE_LINE = 'SAMPLE: placeholder words only. Your real names and details are not shown here.'
const SANS = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif"

export function cleanRequest(q: any): PreviewRequest | null {
  const kind = String(q?.kind ?? '').toLowerCase() as PreviewKind
  if (!(PREVIEW_KINDS as readonly string[]).includes(kind)) return null
  const id = String(q?.template_id ?? '').trim(); const layout = String(q?.layout ?? '').trim().toLowerCase()
  if (id && !/^[a-z0-9][a-z0-9_-]{0,80}$/.test(id)) return null
  if (layout && !['short', 'standard', 'detailed'].includes(layout)) return null
  return { kind, template_id: id || null, layout: layout || null }
}

/** The organisation's brand colour when one is saved and readable on white. Defensive: the column may not exist yet (the brand colour setting is a separate update), then there is none. */
export async function brandColourFor(tenantId: string): Promise<string | null> {
  try {
    const rows: any[] = await (prisma as any).$queryRawUnsafe('select brand_colour from public.tenant_letterhead where tenant_id = $1 limit 1', tenantId)
    const c = String(rows?.[0]?.brand_colour ?? '').trim()
    if (!/^#[0-9a-f]{6}$/i.test(c)) return null
    return contrast(c, '#FFFFFF') >= 3 ? c : null
  } catch { return null }
}

const sampleBanner = (accent: string) => `<div style="font:700 11px/1.4 ${SANS};letter-spacing:.06em;text-transform:uppercase;color:${accent};background:#FFF;border:1px dashed ${accent};border-radius:6px;padding:6px 10px;margin:0 0 12px;text-align:center">${esc(SAMPLE_LINE)}</div>`

/** A letter's placeholder values: each field shows its own label in square brackets, so the layout and wording are real but nothing is. */
export function sampleLetterValues(fields: Array<{ key: string; label: string; type: string; choices?: Array<{ value: string; label: string }> }>): Record<string, unknown> {
  const v: Record<string, unknown> = {}
  for (const f of fields) {
    if (f.type === 'choice') v[f.key] = f.choices?.[0]?.value ?? `[${f.label}]`
    else if (f.type === 'list') v[f.key] = [`[${f.label}, first]`, `[${f.label}, second]`]
    else if (f.type === 'number' || f.type === 'money') v[f.key] = `[${f.label}]`
    else v[f.key] = `[${f.label}]`
  }
  v.recipient_name = '[Name]'   // the greeting uses the first word, so it reads "Dear [Name],"
  return v
}

/** `deps` lets a test supply the letterhead and the brand colour instead of the database. */
export interface PreviewDeps { letterhead?: (tenantId: string) => Promise<{ head: Awaited<ReturnType<typeof loadLetterhead>>['head'] }>; brand?: (tenantId: string) => Promise<string | null> }
export async function renderOptionPreview(tenantId: string, req: PreviewRequest, deps: PreviewDeps = {}): Promise<PreviewResult> {
  const l = await (deps.letterhead ?? loadLetterhead)(tenantId)
  const logo = l.head.logoDataUrl ?? null
  const accent = (await (deps.brand ?? brandColourFor)(tenantId)) ?? '#0F766E'
  const brand = accent !== '#0F766E' ? accent : null
  const base = { sample: true as const, has_logo: !!logo, brand_colour: brand }

  if (req.kind === 'newsletter') {
    const tpl = (req.template_id && newsletterTemplate(req.template_id))
      || (req.template_id && NEWSLETTER_TEMPLATES.find(t => t.type === req.template_id && t.layout === (req.layout ?? 'standard')))
      || null
    if (!tpl) return { ...base, kind: 'newsletter', title: 'Newsletter (sample)', css: '', html: plain(accent, 'Newsletter', 'This newsletter template could not be found, so here is a plain sample.', logo, l.head.name), note: 'Template not found.' }
    const html = renderNewsletterHtml({ templateId: tpl.id, title: tpl.type_title, body: sampleBody(tpl), brand: { name: l.head.name || 'Your service', accent: brand, logo, contact: [] }, sentBy: 'Your name', sample: true }, 'web')
    return { ...base, kind: 'newsletter', title: `${tpl.title} (sample)`, css: '', html: sampleBanner(accent) + html, note: null }
  }
  if (req.kind === 'letter') {
    const t = req.template_id ? getLetterTemplate(req.template_id) : undefined
    if (!t) return { ...base, kind: 'letter', title: 'Letter (sample)', css: PREVIEW_CSS, html: plain(accent, 'Letter', 'This letter template could not be found, so here is a plain sample.', logo, l.head.name), note: 'Template not found.' }
    const values = { ...sampleLetterValues(t.fields as any), service_name: l.head.name || '[Service name]' }
    let doc: LayoutDoc
    try { doc = letterLayout(t.id, values as any, l.head, null) } catch { doc = { kind: 'letter', head: l.head, subject: t.title, date: '[Date]', recipient: { name: '[Staff member]' }, blocks: [{ t: 'p', text: t.description }], closing: 'Yours sincerely,' } }
    doc = { ...doc, date: '[Date]', recipient: { name: '[Staff member name]', role: '[Job title]' }, signer: { name: '[Your name]', role: '[Your role]' } }
    return { ...base, kind: 'letter', title: `${t.title} (sample)`, css: PREVIEW_CSS, html: sampleBanner(accent) + layoutToHtml(doc, logo), note: null }
  }
  if (req.kind === 'report') {
    const t = req.template_id ? reportTemplate(req.template_id) : undefined
    const doc: LayoutDoc = { kind: 'report', head: l.head, subject: t?.title ?? 'Report', date: '[Month and year]', subtitle: 'Sample report',
      blocks: (t?.sections ?? [{ title: 'Section', hint: 'The words and figures for this section go here.' }]).flatMap((s: any) => [{ t: 'h' as const, text: s.title }, { t: 'p' as const, text: `[${s.hint}]` }]) }
    return { ...base, kind: 'report', title: `${t?.title ?? 'Report'} (sample)`, css: PREVIEW_CSS, html: sampleBanner(accent) + layoutToHtml(doc, logo), note: null }
  }
  if (req.kind === 'notification' || req.kind === 'email') {
    const isEmail = req.kind === 'email'
    const head = logo ? `<img src="${esc(logo)}" alt="${esc(l.head.name)} logo" style="display:block;max-height:44px;max-width:180px;margin:0 0 14px">` : `<p style="margin:0 0 14px;font:700 16px/1.3 ${SANS};color:${accent}">${esc(l.head.name || 'Your service')}</p>`
    const body = isEmail
      ? `<p style="margin:0 0 10px">Hello [First name],</p><p style="margin:0 0 10px">[Your message to the team goes here, in short paragraphs.]</p><p style="margin:0 0 14px"><span style="display:inline-block;background:${accent};color:#fff;border-radius:8px;padding:10px 16px;font-weight:700">[Button label]</span></p><p style="margin:0;color:#4B5563">Thank you,<br>[Your name]</p>`
      : `<p style="margin:0 0 6px;font:700 17px/1.3 ${SANS};color:#1F2937">[Notification title]</p><p style="margin:0 0 10px">[Your message to the team goes here. It appears in their hub the next time they sign in.]</p><p style="margin:0;color:#4B5563">From [Your name]</p>`
    const html = `${sampleBanner(accent)}<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #E5E7EB;border-top:5px solid ${accent};border-radius:12px;padding:22px 24px;font:15px/1.55 ${SANS};color:#1F2937">${head}${body}</div>`
    return { ...base, kind: req.kind, title: `${isEmail ? 'Email' : 'Notification'} (sample)`, css: '', html, note: isEmail ? 'The real email also goes through the staff email wrapper.' : null }
  }
  return { ...base, kind: 'other', title: 'Sample', css: '', html: plain(accent, 'Sample', 'This option has no designed preview yet. It would look like your usual CareStream messages.', logo, l.head.name), note: 'No renderer for this kind yet.' }
}

function plain(accent: string, title: string, text: string, logo: string | null, name: string): string {
  const head = logo ? `<img src="${esc(logo)}" alt="${esc(name)} logo" style="display:block;max-height:44px;max-width:180px;margin:0 0 12px">` : ''
  return `${sampleBanner(accent)}<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #E5E7EB;border-radius:12px;padding:22px 24px;font:15px/1.55 ${SANS};color:#1F2937">${head}<p style="margin:0 0 8px;font-weight:700">${esc(title)}</p><p style="margin:0">${esc(text)}</p></div>`
}

/** HOUSE RULE 4: a sample can be saved as a PDF or printed too. The PDF carries the same placeholder words, your logo and letterhead, and SAMPLE printed on every page. */
export const SAMPLE_STAMP = 'SAMPLE: placeholder words only. Not a real document.'
export async function renderOptionPreviewPdf(tenantId: string, req: PreviewRequest, deps: PreviewDeps = {}): Promise<{ buffer: Buffer; filename: string }> {
  const l = await (deps.letterhead ?? loadLetterhead)(tenantId)
  const brand = await (deps.brand ?? brandColourFor)(tenantId)
  const name = `${req.kind}-${String(req.template_id ?? 'sample')}-sample`.replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 80) + '.pdf'
  if (req.kind === 'newsletter') {
    const tpl = (req.template_id && newsletterTemplate(req.template_id)) || (req.template_id && NEWSLETTER_TEMPLATES.find(t => t.type === req.template_id && t.layout === (req.layout ?? 'standard'))) || null
    if (tpl) {
      let logoPng: Buffer | null = null
      if (l.head.logoDataUrl) { try { const { logoForPdf } = await import('../policy/policy-pdf'); logoPng = await logoForPdf(l.head.logoDataUrl) } catch { logoPng = null } }
      const { renderNewsletterPdf } = await import('./newsletter-design')
      return { buffer: await renderNewsletterPdf({ templateId: tpl.id, title: tpl.type_title, body: sampleBody(tpl), brand: { name: l.head.name || 'Your service', accent: brand, logo: l.head.logoDataUrl ?? null, contact: [] }, sentBy: 'Your name', sample: true, stamp: SAMPLE_STAMP }, logoPng, null), filename: name }
    }
  }
  let doc: LayoutDoc
  if (req.kind === 'letter' && req.template_id && getLetterTemplate(req.template_id)) {
    const t = getLetterTemplate(req.template_id)!
    const values = { ...sampleLetterValues(t.fields as any), service_name: l.head.name || '[Service name]' }
    try { doc = letterLayout(t.id, values as any, l.head, null) } catch { doc = { kind: 'letter', head: l.head, subject: t.title, date: '[Date]', recipient: { name: '[Staff member]' }, blocks: [{ t: 'p', text: t.description }], closing: 'Yours sincerely,' } }
    doc = { ...doc, date: '[Date]', recipient: { name: '[Staff member name]', role: '[Job title]' }, signer: { name: '[Your name]', role: '[Your role]' } }
  } else if (req.kind === 'report') {
    const t = req.template_id ? reportTemplate(req.template_id) : undefined
    doc = { kind: 'report', head: l.head, subject: t?.title ?? 'Report', date: '[Month and year]', subtitle: 'Sample report', blocks: (t?.sections ?? [{ title: 'Section', hint: 'The words and figures for this section go here.' }]).flatMap((s: any) => [{ t: 'h' as const, text: s.title }, { t: 'p' as const, text: `[${s.hint}]` }]) }
  } else {
    const text = req.kind === 'email' ? 'Hello [First name]. [Your message to the team goes here, in short paragraphs.] [Button label]' : req.kind === 'notification' ? '[Notification title]. [Your message to the team goes here. It appears in their hub the next time they sign in.] From [Your name].' : 'This option has no designed preview yet. It would look like your usual CareStream messages.'
    doc = { kind: 'report', head: l.head, subject: `${req.kind === 'other' ? 'Sample' : req.kind === 'email' ? 'Email' : 'Notification'} (sample)`, date: '[Date]', blocks: [{ t: 'p', text }] }
  }
  const { renderLayoutPdf } = await import('../letters/layout-pdf')
  return { buffer: await renderLayoutPdf({ ...doc, stamp: SAMPLE_STAMP }), filename: name }
}

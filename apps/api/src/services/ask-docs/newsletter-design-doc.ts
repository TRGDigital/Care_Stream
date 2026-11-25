// Turns a saved newsletter document into the designed newsletter: the organisation's name, logo and contact details from Settings, the optional brand colour, the optional photo of the
// person (only when the administrator chose to include one), and who is sending it. The drawing itself is in newsletter-design.ts and needs no database.
import { prisma } from '../../db/client'
import { loadLetterhead } from '../letters/letterhead'
import { downloadFile, staffPhotoKey } from '../storage/s3'
import { siteUrl } from '../../lib/urls'
import { renderNewsletterHtml, renderNewsletterPdf, sampleBody, type DesignInput, type Target } from './newsletter-design'
import { newsletterTemplate } from './newsletter-templates'
import { staffHasPicture } from './newsletter-photo'

const p = () => prisma as any
export interface Doc { id: string; type: string; title: string; body: string; data: any }

async function photoFor(tenantId: string, doc: Doc): Promise<{ dataUrl: string; name: string; buffer: Buffer } | null> {
  const ph = doc.data?.photo
  if (!ph || ph.include !== true || !ph.user_id || ph.consent !== true) return null   // no recorded agreement from the person: no picture
  const u = await p().user.findFirst({ where: { id: String(ph.user_id), tenant_id: tenantId, is_active: true }, select: { name: true } })
  if (!u) return null
  try {
    if (!(await staffHasPicture(tenantId, String(ph.user_id)))) return { dataUrl: '', name: u.name, buffer: Buffer.alloc(0) }   // a removed picture is never served
    const buffer = await downloadFile(staffPhotoKey(tenantId, String(ph.user_id)))
    return { dataUrl: `data:image/jpeg;base64,${buffer.toString('base64')}`, name: u.name, buffer }
  } catch { return { dataUrl: '', name: u.name, buffer: Buffer.alloc(0) } }   // no picture on file: the slot shows their initials
}

async function nameForEmail(tenantId: string, doc: Doc): Promise<string> {
  try { const u = await p().user.findFirst({ where: { id: String(doc.data?.photo?.user_id ?? ''), tenant_id: tenantId, is_active: true }, select: { name: true } }); return u?.name ?? '' } catch { return '' }
}

/** Everything the designer needs for one saved newsletter. `target` "email" gets a logo address and no photo; "web" and the PDF get the logo and the photo inline. */
export async function designInputFor(o: { tenantId: string; doc: Doc; target: Target; sentBy?: string | null; draft?: { title?: string; body?: string } }): Promise<{ input: DesignInput; logoPng: Buffer | null; photoPng: Buffer | null }> {
  const l = await loadLetterhead(o.tenantId)
  const photo = o.target === 'web' ? await photoFor(o.tenantId, o.doc) : null
  const photoNote = o.target === 'email' && o.doc.data?.photo?.include === true && o.doc.data?.photo?.consent === true
  const emailName = photoNote ? await nameForEmail(o.tenantId, o.doc) : ''
  let logo: string | null = l.head.logoDataUrl ?? null
  if (o.target === 'email') logo = null   // the staff email wrapper already shows the organisation's logo, so it is not repeated
  let sentBy = o.sentBy ?? ''
  if (!sentBy && o.doc.data?.sent_by) sentBy = String(o.doc.data.sent_by)
  const input: DesignInput = {
    templateId: o.doc.data?.template_id ?? null, title: o.draft?.title ?? o.doc.title, body: o.draft?.body ?? o.doc.body,
    brand: { name: l.head.name, accent: typeof o.doc.data?.accent === 'string' && o.doc.data.accent ? o.doc.data.accent : (l.head.brandColour ?? null), logo, contact: (l.head.contactLines ?? []).slice(0, 3) },
    sentBy, photo: photo ? { dataUrl: photo.dataUrl, name: photo.name } : (photoNote ? { dataUrl: '', name: emailName, inHub: true } : null), links: { holiday: `${siteUrl()}/chat` },
  }
  let logoPng: Buffer | null = null
  if (l.head.logoDataUrl) { try { const { logoForPdf } = await import('../policy/policy-pdf'); logoPng = await logoForPdf(l.head.logoDataUrl) } catch { logoPng = null } }
  return { input, logoPng, photoPng: photo?.buffer?.length ? photo.buffer : null }
}

export async function designedHtml(o: { tenantId: string; doc: Doc; target: Target; sentBy?: string | null; draft?: { title?: string; body?: string } }): Promise<string> {
  const { input } = await designInputFor(o)
  return renderNewsletterHtml(input, o.target)
}
export async function designedPdf(o: { tenantId: string; doc: Doc; sentBy?: string | null; stamp?: string }): Promise<Buffer> {
  const { input, logoPng, photoPng } = await designInputFor({ ...o, target: 'web' })
  return renderNewsletterPdf(o.stamp ? { ...input, stamp: o.stamp } : input, logoPng, photoPng)
}
/** Sample designs of every layout of one newsletter type, for the thumbnails (marked SAMPLE). */
export async function sampleDesignsFor(tenantId: string, type: string): Promise<Array<{ id: string; layout: string; title: string; html: string }>> {
  const l = await loadLetterhead(tenantId)
  const { NEWSLETTER_TEMPLATES } = await import('./newsletter-templates')
  return NEWSLETTER_TEMPLATES.filter(t => t.type === type).map(t => ({
    id: t.id, layout: t.layout, title: t.title,
    html: renderNewsletterHtml({ templateId: t.id, title: t.type_title, body: sampleBody(newsletterTemplate(t.id)!), brand: { name: l.head.name || 'Your service', logo: l.head.logoDataUrl ?? null, contact: [] }, sentBy: 'Your name', sample: true }, 'web'),
  }))
}

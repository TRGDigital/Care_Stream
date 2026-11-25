// Turns a saved newsletter document into the designed newsletter: the organisation's name, logo and contact details from Settings, the optional brand colour, the optional photo of the
// person (only when the administrator chose to include one), and who is sending it. The drawing itself is in newsletter-design.ts and needs no database.
import { prisma } from '../../db/client'
import { loadLetterhead } from '../letters/letterhead'
import { downloadFile, staffPhotoKey } from '../storage/s3'
import { siteUrl } from '../../lib/urls'
import { renderNewsletterHtml, renderNewsletterPdf, sampleBody, type DesignInput, type Target } from './newsletter-design'
import { newsletterTemplate } from './newsletter-templates'
import { staffHasPicture, featuredOf, giftKey, GIFT_IMAGE_ID } from './newsletter-photo'
import { cleanContent, blockImageKey, BLOCK_IMAGE_ID } from './newsletter-edit'
import type { CustomIn, CustomImage } from './newsletter-design'

const p = () => prisma as any
export interface Doc { id: string; type: string; title: string; body: string; data: any }

type Person = { dataUrl: string; name: string; buffer: Buffer }
/** Every featured person with a recorded agreement. A person who left, or whose picture was removed, shows initials; nobody without agreement is ever included. */
async function peopleFor(tenantId: string, doc: Doc, withPictures: boolean): Promise<Person[]> {
  const out: Person[] = []
  for (const ph of featuredOf(doc.data)) {
    const u = await p().user.findFirst({ where: { id: String(ph.user_id), tenant_id: tenantId, is_active: true }, select: { name: true } })
    if (!u) continue
    if (!withPictures) { out.push({ dataUrl: '', name: u.name, buffer: Buffer.alloc(0) }); continue }
    try {
      if (!(await staffHasPicture(tenantId, String(ph.user_id)))) { out.push({ dataUrl: '', name: u.name, buffer: Buffer.alloc(0) }); continue }   // a removed picture is never served
      const buffer = await downloadFile(staffPhotoKey(tenantId, String(ph.user_id)))
      out.push({ dataUrl: `data:image/jpeg;base64,${buffer.toString('base64')}`, name: u.name, buffer })
    } catch { out.push({ dataUrl: '', name: u.name, buffer: Buffer.alloc(0) }) }   // no picture on file: the slot shows their initials
  }
  return out
}
/** The optional gift: its words, and its picture only for the screen, the PDF and the hub (email keeps the gift icon and the words). */
async function giftFor(tenantId: string, doc: Doc, withPicture: boolean): Promise<{ text: string; dataUrl: string | null; buffer: Buffer | null } | null> {
  const g = doc.data?.gift
  const text = typeof g?.text === 'string' ? g.text.trim().slice(0, 200) : ''
  let dataUrl: string | null = null, buffer: Buffer | null = null
  if (withPicture && typeof g?.image_id === 'string' && GIFT_IMAGE_ID.test(g.image_id)) {
    try {
      buffer = await downloadFile(giftKey(tenantId, g.image_id))
      const ext = g.image_id.split('.').pop(); dataUrl = `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${buffer.toString('base64')}`
    } catch { dataUrl = null; buffer = null }   // the picture is gone: the gift icon and the words still show
  }
  return text || dataUrl ? { text, dataUrl, buffer } : null
}

/** The blocks the tenant added, checked again as they are read (a stored block that no longer passes is left out, never drawn). */
export function customBlocksOf(data: any): CustomIn[] {
  const out: CustomIn[] = []
  for (const c of Array.isArray(data?.custom_blocks) ? data.custom_blocks.slice(0, 12) : []) {
    if (!c || typeof c.id !== 'string' || !/^c\d+$/.test(c.id)) continue
    const k = cleanContent(String(c.type), c.content)
    if (k.ok) out.push({ id: c.id, type: c.type, after: typeof c.after === 'string' ? c.after : null, content: k.content })
  }
  return out
}
/** The pictures of picture blocks, for the screen, the PDF and the hub (email shows the words and a note). A picture that has gone leaves the words. */
async function imagesFor(tenantId: string, custom: CustomIn[]): Promise<Record<string, CustomImage>> {
  const out: Record<string, CustomImage> = {}
  for (const c of custom) {
    const id = c.type === 'picture_text' ? String(c.content?.image_id ?? '') : ''
    if (!BLOCK_IMAGE_ID.test(id)) continue
    try { const buffer = await downloadFile(blockImageKey(tenantId, id)); const ext = id.split('.').pop(); out[c.id] = { dataUrl: `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${buffer.toString('base64')}`, buffer } } catch { /* the picture is gone */ }
  }
  return out
}

/** Everything the designer needs for one saved newsletter. `target` "email" gets a logo address and no photo; "web" and the PDF get the logo and the photo inline. */
export async function designInputFor(o: { tenantId: string; doc: Doc; target: Target; sentBy?: string | null; draft?: { title?: string; body?: string } }): Promise<{ input: DesignInput; logoPng: Buffer | null; photoPng: Buffer | null; photoPngs: Array<Buffer | null>; giftPng: Buffer | null }> {
  const l = await loadLetterhead(o.tenantId)
  const web = o.target === 'web'
  const people = await peopleFor(o.tenantId, o.doc, web)   // email gets the names only, for the initials
  const gift = await giftFor(o.tenantId, o.doc, web)
  const custom = customBlocksOf(o.doc.data)
  const customImages = web ? await imagesFor(o.tenantId, custom) : {}
  let logo: string | null = l.head.logoDataUrl ?? null
  if (o.target === 'email') logo = null   // the staff email wrapper already shows the organisation's logo, so it is not repeated
  let sentBy = o.sentBy ?? ''
  if (!sentBy && o.doc.data?.sent_by) sentBy = String(o.doc.data.sent_by)
  const input: DesignInput = {
    templateId: o.doc.data?.template_id ?? null, title: o.draft?.title ?? o.doc.title, body: o.draft?.body ?? o.doc.body,
    brand: { name: l.head.name, accent: typeof o.doc.data?.accent === 'string' && o.doc.data.accent ? o.doc.data.accent : (l.head.brandColour ?? null), logo, contact: (l.head.contactLines ?? []).slice(0, 3) },
    sentBy, people: people.map(x => ({ dataUrl: x.dataUrl, name: x.name, ...(web ? {} : { inHub: true }) })), gift: gift ? { text: gift.text, dataUrl: gift.dataUrl } : null, links: { holiday: `${siteUrl()}/chat`, hub: `${siteUrl()}/chat` },
    styles: o.doc.data?.block_styles && typeof o.doc.data.block_styles === 'object' ? o.doc.data.block_styles : undefined, custom, customImages,
  }
  let logoPng: Buffer | null = null
  if (l.head.logoDataUrl) { try { const { logoForPdf } = await import('../policy/policy-pdf'); logoPng = await logoForPdf(l.head.logoDataUrl) } catch { logoPng = null } }
  const photoPngs = people.map(x => (x.buffer.length ? x.buffer : null))
  return { input, logoPng, photoPng: photoPngs[0] ?? null, photoPngs, giftPng: gift?.buffer ?? null }
}

export async function designedHtml(o: { tenantId: string; doc: Doc; target: Target; sentBy?: string | null; draft?: { title?: string; body?: string } }): Promise<string> {
  const { input } = await designInputFor(o)
  return renderNewsletterHtml(input, o.target)
}
export async function designedPdf(o: { tenantId: string; doc: Doc; sentBy?: string | null; stamp?: string }): Promise<Buffer> {
  const { input, logoPng, photoPngs, giftPng } = await designInputFor({ ...o, target: 'web' })
  return renderNewsletterPdf(o.stamp ? { ...input, stamp: o.stamp } : input, logoPng, photoPngs, giftPng)
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

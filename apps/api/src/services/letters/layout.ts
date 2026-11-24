// ONE description of a formal document (letter, report or newsletter) that the PDF renderer, the Word renderer and the on screen preview all read, so the three always match.
// Pure data and string building: no database, no files. Nothing here prints a dash; a person's own text is printed as typed.

import type { Letterhead } from './letterhead'

export type BlockKind = 'p' | 'li' | 'h'
export interface LayoutBlock { t: BlockKind; text: string }
export interface SignatureImage { png: Buffer; width: number; height: number }

export interface LayoutDoc {
  kind: 'letter' | 'report' | 'newsletter'
  head: Letterhead
  /** The letter date, or the date line under a report title. */
  date?: string
  confidential?: boolean
  recipient?: { name: string; role?: string; addressLines?: string[] }
  /** A letter's subject line (bold) or a report or newsletter's title. */
  subject?: string
  subtitle?: string
  blocks: LayoutBlock[]
  closing?: string
  /** Who signs. The signature image is only ever present when that person chose to sign with their own signature. */
  signer?: { name: string; role?: string; signature?: SignatureImage | null }
  acknowledgement?: string | null
}

/** pdfkit's standard fonts cover Latin text; anything outside it would print as a gap, so it is dropped. Curly quotes, the pound and euro signs are kept. */
export function printable(s: string): string {
  return String(s ?? '').normalize('NFC').replace(/[‘’]/g, '’').replace(/[^\u0009\u000A -~ -ÿ’“”…•€]/g, '')
}

/** The footer text lines, ready to print on every page. */
export function footerFor(head: Letterhead): string[] {
  return (head.footerLines ?? []).map(printable).filter(Boolean)
}

/** Plain text and bullets in the simple form the newsletter and report agents write: ## headings, - bullets, blank line between paragraphs. */
export function parseBlocks(body: string): LayoutBlock[] {
  const out: LayoutBlock[] = []
  let para: string[] = []
  const flush = () => { if (para.length) { out.push({ t: 'p', text: para.join(' ').trim() }); para = [] } }
  for (const raw of String(body ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim()
    if (!line) { flush(); continue }
    const h = /^#{1,3}\s+(.*)$/.exec(line), li = /^[-*•]\s+(.*)$/.exec(line)
    if (h) { flush(); out.push({ t: 'h', text: h[1].trim() }) } else if (li) { flush(); out.push({ t: 'li', text: li[1].trim() }) } else para.push(line)
  }
  flush()
  return out
}

const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

/**
 * The same document as HTML, styled like a sheet of paper, for the preview in the Ask panel. Every value is escaped. The signature, when there is one, is a data URL
 * of the signer's OWN image: the caller only passes it for the person who is looking at the preview.
 */
export function layoutToHtml(d: LayoutDoc, logoDataUrl?: string | null): string {
  const h = d.head
  const head = `<div class="lh-head ${h.logoAlign === 'centre' ? 'lh-centre' : ''}">
    ${logoDataUrl ? `<img class="lh-logo" src="${esc(logoDataUrl)}" alt="">` : ''}
    <div class="lh-org"><strong>${esc(h.name)}</strong>${(h.addressLines ?? []).map(l => `<br>${esc(l)}`).join('')}${(h.contactLines ?? []).map(l => `<br>${esc(l)}`).join('')}</div>
  </div>`
  const body: string[] = []
  let inList = false
  for (const b of d.blocks) {
    if (b.t === 'li') { if (!inList) { body.push('<ul>'); inList = true } body.push(`<li>${esc(b.text)}</li>`); continue }
    if (inList) { body.push('</ul>'); inList = false }
    body.push(b.t === 'h' ? `<h3>${esc(b.text)}</h3>` : `<p>${esc(b.text).replace(/\n/g, '<br>')}</p>`)
  }
  if (inList) body.push('</ul>')
  const sig = d.signer?.signature ? `<img class="lh-sig" src="data:image/png;base64,${d.signer.signature.png.toString('base64')}" alt="Signature">` : '<div class="lh-gap"></div>'
  const top = d.kind === 'letter'
    ? `<p class="lh-date">${esc(d.date ?? '')}</p>${d.confidential ? '<p class="lh-conf">PRIVATE AND CONFIDENTIAL</p>' : ''}
       <p><strong>${esc(d.recipient?.name ?? '')}</strong>${d.recipient?.role ? `<br>${esc(d.recipient.role)}` : ''}${(d.recipient?.addressLines ?? []).map(l => `<br>${esc(l)}`).join('')}</p>
       <p class="lh-subject"><strong>${esc(d.subject ?? '')}</strong></p>`
    : `<h1 class="lh-title">${esc(d.subject ?? '')}</h1>${d.date ? `<p class="lh-date">${esc(d.date)}</p>` : ''}${d.subtitle ? `<p class="lh-date">${esc(d.subtitle)}</p>` : ''}`
  const close = d.kind === 'letter'
    ? `<p>${esc(d.closing ?? '')}</p>${sig}<p><strong>${esc(d.signer?.name ?? '')}</strong>${d.signer?.role ? `<br>${esc(d.signer.role)}` : ''}</p>${d.acknowledgement ? `<div class="lh-ack"><p>${esc(d.acknowledgement)}</p><p>Signed: ____________________ &nbsp; Date: ______________</p></div>` : ''}`
    : ''
  const foot = footerFor(h)
  return `<div class="lh-page">${head}<hr>${top}${body.join('')}${close}${foot.length ? `<div class="lh-foot">${foot.map(l => `<div>${esc(l)}</div>`).join('')}</div>` : ''}</div>`
}

/** The styles that make layoutToHtml look like a page. The web puts these in a style tag next to the preview. */
export const PREVIEW_CSS = `.lh-page{background:#fff;color:#1a1530;font:14px/1.55 Georgia,'Times New Roman',serif;padding:36px 40px;max-width:720px;margin:0 auto;border:1px solid #e5e7eb;box-shadow:0 1px 6px rgba(0,0,0,.06)}
.lh-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}.lh-head.lh-centre{flex-direction:column;align-items:center;text-align:center}
.lh-logo{max-height:56px;max-width:200px}.lh-org{font:12px/1.45 Arial,Helvetica,sans-serif;text-align:right;color:#5e4d70}.lh-centre .lh-org{text-align:center}
.lh-page hr{border:0;border-top:1px solid #d9d4e0;margin:14px 0 18px}.lh-date{color:#5e4d70;margin:0 0 12px}.lh-conf{font:bold 10px Arial,sans-serif;letter-spacing:.06em;color:#5e4d70;margin:0 0 4px}
.lh-title{font:bold 22px Arial,sans-serif;margin:0 0 6px}.lh-subject{margin:14px 0}.lh-page p{margin:0 0 10px}.lh-page ul{margin:0 0 10px;padding-left:20px}.lh-page h3{font:bold 14px Arial,sans-serif;margin:14px 0 6px}
.lh-sig{display:block;max-height:68px;max-width:227px;margin:8px 0 4px}.lh-gap{height:44px}.lh-ack{border:1px solid #d9d4e0;padding:10px 12px;margin-top:22px;font-size:13px}
.lh-foot{border-top:1px solid #d9d4e0;margin-top:26px;padding-top:8px;font:10px/1.45 Arial,sans-serif;color:#777;text-align:center}`

// Person-led emails to staff: the email shows the PERSON who allocated or sent something (round photo, name, role and home),
// the details below, and one button, like a social network notification. Pure HTML building, no database, no network, so it
// is easy to test and to preview. Table based and inline styled so it holds up in Outlook, Gmail and Apple Mail, with no
// scripts, and it still reads properly when images are blocked (the person's name and the headline are plain text).

import { LOGO_ROW } from './org-logo-markers'

const PURPLE = '#9B52B5'
const INK = '#1A1530'
const MID = '#5E4D70'

export interface PersonAdmin {
  name: string
  jobRole?: string | null
  homeName?: string | null
  avatarUrl?: string | null
}

export interface PersonEmailOptions {
  admin: PersonAdmin
  /** Plain text headline, for example "Sarah Jones has allocated you training". Escaped here. */
  headline: string
  /** A short plain sentence under the person, above the details. */
  intro?: string
  /** What was allocated, due date, estimated time, any note. Values are escaped. Empty values are left out. */
  details?: Array<{ label: string; value: string | null | undefined }>
  /** Trusted ready-made HTML shown inside the details card (for emails whose content is already built). */
  bodyHtml?: string
  button?: { label: string; href: string } | null
  /** Why they received it. Plain text. */
  footerNote: string
  /** Absolute URL of the CareStream logo. */
  logoUrl: string
}

export const escapeHtml = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

/** "Sarah Jones" becomes "SJ", "madonna" becomes "M". */
export function initialsOf(name: string): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  const first = Array.from(parts[0])[0] ?? ''
  const last = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? '') : ''
  return (first + last).toUpperCase() || '?'
}

const PALETTE = ['#7A3D9A', '#2563eb', '#0f766e', '#b45309', '#be185d', '#4f46e5', '#15803d', '#9a3412', '#0e7490', '#6d28d9']
/** A steady background colour for a name, dark enough for white letters. */
export function colourForName(name: string): string {
  let h = 0
  for (const ch of String(name || '')) h = (h * 31 + ch.codePointAt(0)!) >>> 0
  return PALETTE[h % PALETTE.length]
}

/** The From display name: "Sarah Jones via CareStream". Quotes, angle brackets and line breaks are stripped so it cannot break the header. */
export function personFrom(admin: Pick<PersonAdmin, 'name'>): string {
  const clean = String(admin.name || '').replace(/[\r\n"<>,;]/g, ' ').replace(/\s+/g, ' ').trim()
  return clean ? `${clean} via CareStream` : 'CareStream'
}

/** "Care Manager at Ferndale Nursing Home", or just the role. */
export function roleLine(admin: PersonAdmin): string {
  const role = (admin.jobRole || '').trim() || 'Admin'
  const home = (admin.homeName || '').trim()
  return home ? `${role} at ${home}` : role
}

function avatarHtml(admin: PersonAdmin): string {
  const name = escapeHtml(admin.name)
  if (admin.avatarUrl) {
    return `<img src="${escapeHtml(admin.avatarUrl)}" alt="${name}" width="96" height="96" style="display:block;width:96px;height:96px;border-radius:48px;border:0;background:#f3f0f6;margin:0 auto">`
  }
  const bg = colourForName(admin.name)
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto"><tr>
    <td width="96" height="96" align="center" valign="middle" bgcolor="${bg}" style="width:96px;height:96px;border-radius:48px;background:${bg};color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:34px;font-weight:700;line-height:96px;text-align:center">${escapeHtml(initialsOf(admin.name))}</td>
  </tr></table>`
}

/** The full HTML document for a person-led email. */
export function personLedEmail(o: PersonEmailOptions): string {
  const font = 'font-family:Inter,Arial,Helvetica,sans-serif'
  const rows = (o.details ?? []).filter(d => d.value !== null && d.value !== undefined && String(d.value).trim() !== '')
  const detailsRows = rows.map((d, i) => `
        <tr>
          <td valign="top" width="130" style="${font};padding:${i === 0 ? '0' : '12px'} 12px 0 0;font-size:12px;line-height:22px;color:${MID};text-transform:uppercase;letter-spacing:.04em">${escapeHtml(d.label)}</td>
          <td valign="top" style="${font};padding:${i === 0 ? '0' : '12px'} 0 0 0;font-size:15px;line-height:22px;color:${INK};font-weight:600">${escapeHtml(d.value)}</td>
        </tr>`).join('')
  const hasCard = rows.length > 0 || !!o.bodyHtml
  const card = hasCard ? `
    <tr><td style="padding:0 32px 8px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#faf8fc" style="border:1px solid #e5e7eb;border-radius:12px;border-collapse:separate;background:#faf8fc">
        <tr><td style="padding:18px 20px">
          ${rows.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${detailsRows}</table>` : ''}
          ${o.bodyHtml ? `<div style="${font};${rows.length ? 'margin-top:14px;' : ''}">${o.bodyHtml}</div>` : ''}
        </td></tr>
      </table>
    </td></tr>` : ''
  const button = o.button ? `
    <tr><td align="center" style="padding:22px 32px 6px">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="center" bgcolor="${PURPLE}" style="border-radius:8px;background:${PURPLE}">
          <a href="${escapeHtml(o.button.href)}" style="${font};display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px">${escapeHtml(o.button.label)}</a>
        </td>
      </tr></table>
    </td></tr>` : ''
  const intro = o.intro ? `
    <tr><td align="center" style="${font};padding:0 40px 18px;font-size:15px;line-height:24px;color:#374151">${escapeHtml(o.intro)}</td></tr>` : ''

  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${escapeHtml(o.headline)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f7" bgcolor="#f4f4f7">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#f4f4f7">${escapeHtml(o.headline)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f7" style="background:#f4f4f7"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;border-collapse:separate">
    <tr><td align="left" style="padding:20px 32px 8px">
      <img src="${escapeHtml(o.logoUrl)}" alt="CareStream" height="28" style="display:block;height:28px;width:auto;border:0;${font};font-size:15px;font-weight:700;color:${PURPLE}">
    </td></tr>
    ${LOGO_ROW}
    <tr><td align="center" style="${font};padding:20px 40px 22px;font-size:22px;line-height:30px;font-weight:700;color:${INK}">${escapeHtml(o.headline)}</td></tr>
    <tr><td align="center" style="padding:0 32px 10px">${avatarHtml(o.admin)}</td></tr>
    <tr><td align="center" style="${font};padding:6px 32px 0;font-size:17px;line-height:24px;font-weight:700;color:${INK}">${escapeHtml(o.admin.name)}</td></tr>
    <tr><td align="center" style="${font};padding:2px 32px 22px;font-size:14px;line-height:20px;color:${MID}">${escapeHtml(roleLine(o.admin))}</td></tr>
    ${intro}
    ${card}
    ${button}
    <tr><td align="center" style="${font};padding:26px 40px 24px;font-size:12px;line-height:18px;color:#9ca3af">${escapeHtml(o.footerNote)}</td></tr>
  </table>
</td></tr></table>
</body></html>`
}

// The words of an admin notification email. Pure, so it is tested and shared by the email and the preview in the admin page.
const esc = (s: unknown) => String(s ?? '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] as string))

export const NOTIFICATION_TITLE_MAX = 120
export const NOTIFICATION_BODY_MAX = 2000

/** Plain text to safe HTML: paragraphs on blank lines, line breaks kept inside a paragraph. Nothing the administrator types can become markup. */
export function notificationBodyToHtml(body: string): string {
  const paras = String(body ?? '').replace(/\r\n?/g, '\n').trim().split(/\n{2,}/).filter(p => p.trim())
  return paras.map((p, i) => `<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 ${i === paras.length - 1 ? 0 : 14}px">${esc(p.trim()).replace(/\n/g, '<br>')}</p>`).join('')
}

/** The card shown in the email: the title in bold, then the message. */
export function notificationCardHtml(title: string, body: string): string {
  return `<p style="color:#1A1530;font-size:17px;line-height:1.4;font-weight:700;margin:0 0 12px">${esc(title)}</p>${notificationBodyToHtml(body)}`
}

export function notificationHeadline(adminName: string, kind: 'new' | 'reminder' = 'new'): string {
  return kind === 'reminder' ? `${adminName} sent you a notification and it is waiting for you` : `${adminName} has sent you a notification`
}

export function notificationSubject(adminName: string, title: string, kind: 'new' | 'reminder' = 'new'): string {
  const t = title.length > 70 ? title.slice(0, 67).trimEnd() + '...' : title
  return kind === 'reminder' ? `Reminder: ${t}` : `${adminName}: ${t}`
}

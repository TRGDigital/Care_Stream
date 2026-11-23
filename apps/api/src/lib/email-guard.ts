// Never send email to addresses that cannot receive it. example.com, example.org, example.net and the .test, .example, .invalid and
// .localhost endings are reserved for documentation and testing (RFC 2606): mail to them bounces, and bounces count against our sending
// reputation. Test accounts use them for their fictional staff, so every allocation email and weekly reminder to those people would bounce.
//
// Importing this file wraps the one shared SendGrid client, so every email sent anywhere in the API goes through it. A message whose
// recipients are all unsendable is dropped quietly (logged, not an error): the action that triggered it still succeeds.
import sgMail from '@sendgrid/mail'
import { withOrgLogo } from './org-logo'
import { finalizeStaffEmail } from './staff-email-finalize'

const RESERVED_DOMAIN = /(^|\.)(example\.(com|org|net)|example|test|invalid|localhost)$/i

export function isUndeliverableEmail(address: unknown): boolean {
  const e = typeof address === 'string' ? address : (address as any)?.email
  if (typeof e !== 'string') return false
  const at = e.lastIndexOf('@')
  if (at < 0) return false
  return RESERVED_DOMAIN.test(e.slice(at + 1).trim().toLowerCase())
}

const keep = (r: unknown) => !isUndeliverableEmail(r)
const asList = (v: unknown): unknown[] => (v == null ? [] : Array.isArray(v) ? v : [v])

/** Returns the message with unsendable recipients removed, or null when nobody sendable is left to receive it. */
export function guardMessage(msg: any): any | null {
  if (!msg || typeof msg !== 'object') return msg
  const out = { ...msg }
  if (Array.isArray(msg.personalizations)) {
    out.personalizations = msg.personalizations
      .map((p: any) => ({ ...p, to: asList(p.to).filter(keep), ...(p.cc ? { cc: asList(p.cc).filter(keep) } : {}), ...(p.bcc ? { bcc: asList(p.bcc).filter(keep) } : {}) }))
      .filter((p: any) => p.to.length > 0)
    return out.personalizations.length ? out : null
  }
  const to = asList(msg.to).filter(keep)
  if (to.length === 0) return null
  out.to = Array.isArray(msg.to) ? to : to[0]
  if (msg.cc != null) { const cc = asList(msg.cc).filter(keep); out.cc = cc.length ? (Array.isArray(msg.cc) ? cc : cc[0]) : undefined }
  if (msg.bcc != null) { const bcc = asList(msg.bcc).filter(keep); out.bcc = bcc.length ? (Array.isArray(msg.bcc) ? bcc : bcc[0]) : undefined }
  return out
}

/** Links in our emails go straight to carestreamai.com. SendGrid's click tracking rewrites them to url9935.carestreamai.com, which has no
 *  secure certificate, so browsers warn "This site doesn't support a secure connection" when someone clicks a button. Switch it off on every
 *  message unless a caller explicitly chose otherwise. */
export function withoutClickTracking(msg: any): any {
  if (!msg || typeof msg !== 'object') return msg
  if (msg.trackingSettings?.clickTracking) return msg
  return { ...msg, trackingSettings: { ...(msg.trackingSettings ?? {}), clickTracking: { enable: false, enableText: false } } }
}

const SKIPPED: [any, object] = [{ statusCode: 202, body: '', headers: {} }, {}]

const g = sgMail as any
if (!g.__csEmailGuard) {
  g.__csEmailGuard = true
  const send = g.send.bind(g)
  g.send = async (data: any, isMultiple?: boolean, cb?: any) => {
    if (Array.isArray(data)) {
      const kept = await Promise.all(data.map(guardMessage).filter(Boolean).map(withoutClickTracking).map(async m => withOrgLogo(await finalizeStaffEmail(m))))
      if (kept.length === 0) { console.log('[email-guard] skipped: no deliverable recipient'); return SKIPPED }
      return send(kept, isMultiple, cb)
    }
    const m = guardMessage(data)
    if (!m) { console.log('[email-guard] skipped: no deliverable recipient'); return SKIPPED }
    return send(await withOrgLogo(await finalizeStaffEmail(withoutClickTracking(m))), isMultiple, cb)
  }
  const sendMultiple = g.sendMultiple.bind(g)
  g.sendMultiple = async (data: any, cb?: any) => {
    const m = guardMessage(data)
    if (!m) { console.log('[email-guard] skipped: no deliverable recipient'); return SKIPPED }
    return sendMultiple(await withOrgLogo(await finalizeStaffEmail(withoutClickTracking(m))), cb)
  }
}

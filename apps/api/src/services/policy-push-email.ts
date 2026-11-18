// The email to a client's admins when the CareStream team pushes missing policies to their Policies page.
// renderPolicyPushEmail is pure (data in, subject + html + text out); sendPolicyPushEmails finds the admins and sends.
// House style: friendly, short, plain words, no dashes.
import sgMail from '@sendgrid/mail'
import { prisma } from '../db/client'
import { emailWrapper, emailFooter } from './email/outbound'
import { siteUrl } from '../lib/urls'

const PURPLE = '#9B52B5', DARK = '#1A1530', BODY = '#374151', MUTED = '#6b7280'
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
const gbp = (p: number) => `£${p % 100 === 0 ? p / 100 : (p / 100).toFixed(2)}`
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

export type PushedPolicy = { slug: string; title: string; description: string; price_pence: number }
export type Rendered = { subject: string; html: string; text: string }

export function renderPolicyPushEmail(o: { firstName: string; orgName: string; items: PushedPolicy[]; policiesUrl: string; shopBase: string }): Rendered {
  const n = o.items.length
  const subject = `${n} ${plural(n, 'policy', 'policies')} missing from your library at ${o.orgName}`
  const link = (slug: string) => `${o.shopBase}/care-policies/${encodeURIComponent(slug)}`
  const rows = o.items.map((i) => `<tr><td style="padding:10px 12px 10px 0;border-top:1px solid #eee;vertical-align:top"><a href="${esc(link(i.slug))}" style="color:${DARK};font-size:14px;font-weight:600;text-decoration:none">${esc(i.title)}</a>${i.description ? `<br><span style="color:${MUTED};font-size:12px;line-height:1.5">${esc(i.description)}</span>` : ''}</td><td style="padding:10px 0;border-top:1px solid #eee;text-align:right;white-space:nowrap;vertical-align:top;color:${DARK};font-size:14px;font-weight:600">${esc(gbp(i.price_pence))}</td></tr>`).join('')
  const html = emailWrapper(`
    <p style="color:${DARK};font-size:15px;margin:0 0 14px">Hi ${esc(o.firstName)},</p>
    <p style="color:${BODY};font-size:15px;line-height:1.6;margin:0 0 14px">We compared the policies in ${esc(o.orgName)}'s library with the CareStream policies written for your type of service, and then read your own policy text to check. Nothing in your library deals with ${n === 1 ? 'this subject' : 'these subjects'} in substance:</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 20px">${rows}</table>
    <div style="text-align:center;margin:0 0 14px"><a href="${esc(o.policiesUrl)}" style="display:inline-block;padding:14px 28px;background:${PURPLE};color:#ffffff;font-size:15px;font-weight:600;border-radius:8px;text-decoration:none">See ${n === 1 ? 'it' : 'them'} on your Policies page</a></div>
    <p style="color:${MUTED};font-size:13px;line-height:1.5;margin:14px 0 0">${n === 1 ? 'It is' : 'They are'} listed at the top of your Policies page. You can dismiss any you do not need, and reply to this email if you would like to talk it through.</p>
    ${emailFooter(esc(o.orgName))}
  `)
  const text = [`Hi ${o.firstName},`, '', `We compared the policies in ${o.orgName}'s library with the CareStream policies written for your type of service, and then read your own policy text to check. Nothing in your library deals with ${n === 1 ? 'this subject' : 'these subjects'} in substance:`, '',
    ...o.items.map((i) => `- ${i.title} (${gbp(i.price_pence)})\n  ${link(i.slug)}`), '', `See ${n === 1 ? 'it' : 'them'} on your Policies page: ${o.policiesUrl}`].join('\n')
  return { subject, html, text }
}

const first = (name: string | null | undefined) => (String(name ?? '').trim().split(/\s+/)[0] || 'there')

/** Emails every active admin of the account. Returns how many went out. Never throws: a failed email must not undo the push. */
export async function sendPolicyPushEmails(tenantId: string, items: PushedPolicy[]): Promise<{ sent: number; failed: number }> {
  const out = { sent: 0, failed: 0 }
  try {
    if (!process.env.SENDGRID_API_KEY || !items.length) return out
    const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { name: true, feature_flags: true } })
    if (!tenant || (tenant.feature_flags as any)?.is_test) return out
    const admins = await (prisma as any).user.findMany({ where: { tenant_id: tenantId, role: 'admin', is_active: { not: false } }, select: { name: true, email: true } })
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    const from = process.env.SENDGRID_FROM_ADDRESS ?? process.env.SENDGRID_FROM_EMAIL
    for (const a of admins as any[]) {
      if (!a.email) continue
      const r = renderPolicyPushEmail({ firstName: first(a.name), orgName: tenant.name, items, policiesUrl: `${siteUrl()}/policies`, shopBase: siteUrl() })
      try { await (sgMail as any).send({ to: a.email, from, subject: r.subject, html: r.html, text: r.text }); out.sent++ } catch { out.failed++ }
    }
  } catch { /* leave counts as they are */ }
  return out
}

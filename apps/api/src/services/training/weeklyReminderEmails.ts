// The two weekly training emails, as pure renderers: plan in, subject + html + text out. Sending and logging are in weeklyReminders.ts.
// House style: friendly, short, plain words, no dashes. Buttons go straight into the hub (annual training and ordinary training are different hub sections).
import { staffWrapper, emailFooter } from '../email/outbound'
import { siteUrl } from '../../lib/urls'
import type { StaffPlan, DigestPlan, ListedItem } from './weeklyReminderLogic'

const PURPLE = '#9B52B5', DARK = '#1A1530', BODY = '#374151', MUTED = '#6b7280', RED = '#b91c1c'
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const day = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/London' })
const when = (d: Date | null) => (d ? day(d) : 'Not yet')

const button = (href: string, label: string) =>
  `<div style="text-align:center;margin:0 0 14px"><a href="${esc(href)}" style="display:inline-block;padding:14px 28px;background:${PURPLE};color:#ffffff;font-size:15px;font-weight:600;border-radius:8px;text-decoration:none">${esc(label)}</a></div>`

function dueText(i: ListedItem): { text: string; color: string } {
  if (i.overdue) return { text: `Overdue, was due ${day(i.due as Date)}`, color: RED }
  if (i.due) return { text: `Due ${day(i.due)}`, color: MUTED }
  return { text: i.in_progress ? 'Started' : 'Not started', color: MUTED }
}

export type Rendered = { subject: string; html: string; text: string }

/** The one-tap sign in link goes through /auth/link with the hub page to land on, so a person who has never signed in arrives where they need to be. */
export function withNext(magicUrl: string, hubUrl: string): string {
  const u = new URL(hubUrl)
  return `${magicUrl}${magicUrl.includes('?') ? '&' : '?'}next=${encodeURIComponent(u.pathname + u.search)}`
}

export function renderStaffEmail(p: StaffPlan, o: { magicUrl?: string } = {}): Rendered {
  const left = p.outstanding
  const headline = `${plural(left, 'training course')} to complete`
  const subject = `${headline} at ${p.org_name}`
  const progress = p.assigned_total > 0 ? ` (${p.completed_total} of ${p.assigned_total} done so far)` : ''
  const overdue = p.overdue > 0 ? ` <strong style="color:${RED}">${plural(p.overdue, 'course is', 'courses are')} overdue.</strong>` : ''
  const well = p.completed_this_week > 0 ? `<p style="color:${BODY};font-size:15px;line-height:1.6;margin:0 0 12px">Well done, you completed ${plural(p.completed_this_week, 'course')} this week.</p>` : ''
  const rows = p.listed.map((i) => { const d = dueText(i); return `<tr><td style="padding:8px 12px 8px 0;border-top:1px solid #eee;color:${DARK};font-size:14px">${esc(i.module_name)}<br><span style="color:${MUTED};font-size:12px;text-transform:capitalize">${esc(i.category)}</span></td><td style="padding:8px 0;border-top:1px solid #eee;text-align:right;white-space:nowrap;color:${d.color};font-size:13px">${esc(d.text)}</td></tr>` }).join('')
  const more = p.more > 0 ? `<p style="color:${MUTED};font-size:13px;margin:6px 0 0">and ${p.more} more in your hub.</p>` : ''
  const hub = [p.links.annual && { ...p.links.annual, label: `Open my annual training (${p.links.annual.count})` }, p.links.training && { ...p.links.training, label: `Open my training (${p.links.training.count})` }].filter(Boolean) as Array<{ url: string; count: number; label: string }>
  const primary = hub[0]
  let buttons: string
  if (p.never_signed_in && o.magicUrl && primary) {
    buttons = button(withNext(o.magicUrl, primary.url), 'Sign in and start my training')
      + `<p style="color:${MUTED};font-size:12px;text-align:center;margin:0 0 14px">This sign in link works once and expires in 7 days. If it has expired, go to ${esc(siteUrl())}/login and tap "Email me a sign-in link".</p>`
  } else {
    buttons = hub.map((h) => button(h.url, h.label)).join('')
  }
  const html = staffWrapper(`
    <p style="color:${DARK};font-size:15px;margin:0 0 14px">Hi ${esc(p.first_name)},</p>
    ${well}
    <p style="color:${BODY};font-size:15px;line-height:1.6;margin:0 0 16px">You have <strong>${plural(left, 'course')}</strong> still to complete at ${esc(p.org_name)}${esc(progress)}.${overdue} Here is what to do next:</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 6px">${rows}</table>
    ${more}
    <div style="margin:22px 0 6px">${buttons}</div>
    <p style="color:${MUTED};font-size:13px;line-height:1.5;margin:14px 0 0">You can do your training on your phone or computer, and your progress is saved as you go. You will get this reminder once a week while training is outstanding.</p>
    ${emailFooter(esc(p.org_name))}
  `)
  const text = [`Hi ${p.first_name},`, '', p.completed_this_week > 0 ? `Well done, you completed ${plural(p.completed_this_week, 'course')} this week.\n` : '', `You have ${plural(left, 'course')} still to complete at ${p.org_name}${progress}.`, '',
    ...p.listed.map((i) => `- ${i.module_name} (${dueText(i).text})`), p.more > 0 ? `and ${p.more} more in your hub.` : '', '', ...hub.map((h) => `${h.label}: ${h.url}`)].filter((l) => l !== '').join('\n')
  return { subject, html, text }
}

export function renderAdminDigest(p: DigestPlan): Rendered {
  const s = p.summary
  const subject = s.with_outstanding > 0 ? `Weekly training update for ${p.org_name}: ${s.with_outstanding} of ${s.team_size} staff have training to complete` : `Weekly training update for ${p.org_name}`
  const stat = (n: number | string, label: string, color = DARK) => `<td style="padding:10px 14px;text-align:center;background:#f8f6fb;border-radius:8px"><div style="font-size:22px;font-weight:700;color:${color}">${esc(n)}</div><div style="font-size:12px;color:${MUTED}">${esc(label)}</div></td><td style="width:8px"></td>`
  const stats = `<table style="width:100%;border-collapse:separate;margin:0 0 20px"><tr>${stat(`${s.with_outstanding} of ${s.team_size}`, 'staff with training to do')}${stat(s.outstanding_total, 'courses outstanding')}${stat(s.overdue_total, 'overdue', s.overdue_total ? RED : DARK)}${stat(s.completed_7d, 'completed in the last 7 days', '#047857')}</tr></table>`
  const heading = (t: string, color = DARK) => `<p style="color:${color};font-size:14px;font-weight:700;margin:22px 0 8px">${esc(t)}</p>`
  const never = p.never_signed_in.length ? heading('Have not signed in yet', RED)
    + `<p style="color:${BODY};font-size:14px;line-height:1.6;margin:0 0 8px">Training has been allocated to these people but they have never signed in. They may need their login sent again, which you can do from Staff.</p>`
    + `<ul style="margin:0 0 8px;padding-left:18px;color:${BODY};font-size:14px;line-height:1.7">${p.never_signed_in.map((u) => `<li>${esc(u.name)}${u.email ? ` (${esc(u.email)})` : ''}, ${plural(u.outstanding, 'course')} allocated</li>`).join('')}</ul>` : ''
  const stalled = p.stalled.length ? heading('Gone quiet, so we have stopped reminding them', RED)
    + `<p style="color:${BODY};font-size:14px;line-height:1.6;margin:0 0 8px">These people have had weekly reminders for ${p.stalled[0].weeks} weeks without signing in or finishing anything. We have stopped emailing them, so a conversation from you is the next step.</p>`
    + `<ul style="margin:0 0 8px;padding-left:18px;color:${BODY};font-size:14px;line-height:1.7">${p.stalled.map((u) => `<li>${esc(u.name)}, ${plural(u.outstanding, 'course')} outstanding</li>`).join('')}</ul>` : ''
  const top = p.top.length ? heading('Most training outstanding')
    + `<table style="width:100%;border-collapse:collapse"><tr style="color:${MUTED};font-size:12px;text-align:left"><th style="padding:4px 12px 4px 0">Name</th><th style="padding:4px 12px">Outstanding</th><th style="padding:4px 12px">Overdue</th><th style="padding:4px 0">Last active</th></tr>`
    + p.top.map((u) => `<tr><td style="padding:7px 12px 7px 0;border-top:1px solid #eee;color:${DARK};font-size:14px">${esc(u.name)}</td><td style="padding:7px 12px;border-top:1px solid #eee;font-size:14px">${u.outstanding}</td><td style="padding:7px 12px;border-top:1px solid #eee;font-size:14px;color:${u.overdue ? RED : BODY}">${u.overdue}</td><td style="padding:7px 0;border-top:1px solid #eee;color:${MUTED};font-size:13px">${esc(when(u.last_active))}</td></tr>`).join('') + '</table>' : ''
  const own = p.own ? heading('Your own training') + `<p style="color:${BODY};font-size:14px;line-height:1.6;margin:0 0 8px">You have ${plural(p.own.outstanding, 'course')} still to complete yourself.</p>`
    + [p.own.links.annual && button(p.own.links.annual.url, `Open my annual training (${p.own.links.annual.count})`), p.own.links.training && button(p.own.links.training.url, `Open my training (${p.own.links.training.count})`)].filter(Boolean).join('') : ''
  const progressUrl = `${siteUrl().replace(/\/$/, '')}/training?tab=progress`
  const html = staffWrapper(`
    <p style="color:${DARK};font-size:15px;margin:0 0 12px">Hi ${esc(p.first_name)},</p>
    <p style="color:${BODY};font-size:15px;line-height:1.6;margin:0 0 18px">Here is how training is going at ${esc(p.org_name)} this week.</p>
    ${stats}${never}${stalled}${top}${own}
    <div style="margin:26px 0 6px">${button(progressUrl, 'Open Staff Progress')}</div>
    <p style="color:${MUTED};font-size:13px;line-height:1.5;margin:10px 0 0">Staff with training outstanding get a reminder each Monday. You can switch these emails off in Settings under Notifications.</p>
    ${emailFooter(esc(p.org_name))}
  `)
  const text = [`Hi ${p.first_name},`, '', `Weekly training update for ${p.org_name}.`, `${s.with_outstanding} of ${s.team_size} staff have training to do, ${s.outstanding_total} courses outstanding, ${s.overdue_total} overdue, ${s.completed_7d} completed in the last 7 days.`, '',
    p.never_signed_in.length ? `Have not signed in yet: ${p.never_signed_in.map((u) => u.name).join(', ')}` : '', p.stalled.length ? `Gone quiet, reminders stopped: ${p.stalled.map((u) => u.name).join(', ')}` : '', '', `Open Staff Progress: ${progressUrl}`].filter((l) => l !== '').join('\n')
  return { subject, html, text }
}

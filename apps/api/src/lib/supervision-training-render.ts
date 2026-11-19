// The training detail as a document: one renderer for the email and the printed page, so they always say the same thing.
// Pure (detail in, HTML out). House style: plain words, no dashes. The CPD Certified mark is deliberately not used here: it may only be
// shown on carestreamai.com, so a printout or an email carries the words only.
import type { TrainingDetail, CourseDetail } from './supervision-training'

const DARK = '#1A1530', BODY = '#374151', MUTED = '#6b7280', RED = '#b91c1c', GREEN = '#15803d', LINE = '#e5e7eb'
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' }) : '')
const STATUS: Record<string, string> = { not_started: 'Not started', started: 'Started', complete: 'Completed', expired: 'Expired' }

function course(c: CourseDetail, action?: { status: string; text: string }): string {
  const dates = [`Allocated ${day(c.allocated_at)}`, c.due_date ? `due ${day(c.due_date)}${c.overdue ? ' (overdue)' : ''}` : '', c.started_at ? `started ${day(c.started_at)}` : '', c.completed_at ? `completed ${day(c.completed_at)}` : ''].filter(Boolean).join(', ')
  const facts = c.status === 'not_started'
    ? `<p style="margin:8px 0 0;font-size:13px;color:${BODY}">Nothing has been opened yet.</p>`
    : `<p style="margin:8px 0 0;font-size:13px;color:${BODY}"><strong>Score:</strong> ${c.score_pct != null ? `${c.score_pct}% (${c.correct} of ${c.answered} answered right)` : 'no questions answered'}. <strong>Questions:</strong> ${c.answered} of ${c.total_questions || 'unknown'}. <strong>Time on lesson:</strong> ${c.learn_minutes ? `${c.learn_minutes} minutes` : 'none'}${c.attempts ? `, ${c.attempts} ${c.attempts === 1 ? 'attempt' : 'attempts'}` : ''}${c.baseline ? `. <strong>Before the course:</strong> ${c.baseline.score} of ${c.baseline.total}` : ''}.</p>`
  const wrong = c.incorrect.length
    ? `<p style="margin:10px 0 4px;font-size:12px;font-weight:700;color:${RED};text-transform:uppercase;letter-spacing:.04em">Answered incorrectly (${c.incorrect.length})</p>` + c.incorrect.map((q) =>
        `<div style="margin:0 0 8px;padding:8px 10px;border:1px solid #fecaca;background:#fef2f2;border-radius:6px"><div style="font-size:13px;font-weight:600;color:${DARK}">${esc(q.question)}</div>` +
        (q.their_answer ? `<div style="font-size:12px;color:#991b1b">Their answer: ${esc(q.their_answer.letter)}${q.their_answer.text ? `. ${esc(q.their_answer.text)}` : ''}</div>` : '') +
        (q.correct_answer ? `<div style="font-size:12px;color:${GREEN}">Correct answer: ${esc(q.correct_answer.letter)}${q.correct_answer.text ? `. ${esc(q.correct_answer.text)}` : ''}</div>` : '') + '</div>').join('')
    : (c.answered > 0 ? `<p style="margin:8px 0 0;font-size:13px;color:${GREEN}">Everything answered so far was right.</p>` : '')
  return `<div style="border:1px solid ${LINE};border-radius:8px;padding:12px 14px;margin:0 0 12px;page-break-inside:avoid">
    <div style="font-size:15px;font-weight:700;color:${DARK}">${esc(c.module_name)} <span style="font-size:12px;font-weight:600;color:${MUTED}">${esc(STATUS[c.status] ?? c.status)}</span></div>
    <div style="font-size:12px;color:${MUTED};margin-top:2px">${esc(c.kind === 'Annual' ? 'Annual training' : 'Training')}. ${esc(dates)}.</div>
    ${action ? `<div style="font-size:12px;color:${MUTED};margin-top:2px">Supervision action: &ldquo;${esc(action.text)}&rdquo; (${action.status === 'done' ? 'done' : action.status === 'in_progress' ? 'in progress' : 'open'})</div>` : ''}
    ${facts}${wrong}
    ${c.reflection ? `<p style="margin:8px 0 0;font-size:12px;color:${BODY}"><strong>Their reflection:</strong> ${esc(c.reflection)}</p>` : ''}
  </div>`
}

/** The body: no page wrapper, so the email and the printed page can each add their own. */
export function renderDetailBody(d: TrainingDetail): string {
  const kind = d.supervision?.type ?? 'supervision'
  const heading = (t: string) => `<h3 style="margin:18px 0 8px;font-size:14px;color:${DARK}">${esc(t)}</h3>`
  const linked = d.linked.length
    ? d.linked.map((l) => (l.course ? course(l.course, { status: l.action_status, text: l.description }) : `<p style="font-size:13px;color:${MUTED}">${esc(l.description)}: the course allocation can no longer be found.</p>`)).join('')
    : `<p style="font-size:13px;color:${MUTED}">No training has been allocated against this ${esc(kind)} yet.</p>`
  const others = d.others.length ? heading(`Also allocated since ${d.since ? day(d.since) : 'the last supervision'}`) + d.others.map((c) => course(c)).join('') : ''
  const follow = d.follow_up.length
    ? heading('Gaps they went back over') + `<ul style="margin:0;padding-left:18px;font-size:13px;color:${BODY}">` + d.follow_up.map((f) => `<li>${esc(f.label ?? 'A question they had got wrong')} (${f.method === 'learn' ? 'went through the lesson, then retried' : 'retried straight away'}, ${esc(day(f.when))})</li>`).join('') + '</ul>'
    : ''
  return `<p style="margin:0 0 4px;font-size:13px;color:${MUTED}">${esc(d.person.job_role ?? '')}${d.supervision ? ` &middot; ${esc(kind)} on ${esc(day(d.supervision.held_on))}` : ''}</p>` +
    heading(`Training for this ${kind}`) + linked + others + follow +
    `<p style="margin:16px 0 0;font-size:11px;color:${MUTED}">Built from their training records on ${esc(day(d.generated_at))}. Confidential: this contains a member of staff's training records, so keep it securely and share it only with people who need it.</p>`
}

export const detailTitle = (d: TrainingDetail) => `Training detail: ${d.person.name}`

/** A full page for printing (opens in its own window and prints). */
export function renderDetailPrintPage(d: TrainingDetail, orgName: string): string {
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>${esc(detailTitle(d))}</title>
<style>body{font-family:Inter,Arial,sans-serif;color:${BODY};max-width:780px;margin:24px auto;padding:0 16px}h1{font-size:20px;color:${DARK};margin:0 0 2px}.org{font-size:12px;color:${MUTED};margin:0 0 14px}@media print{body{margin:0;max-width:none}}</style></head>
<body><h1>${esc(detailTitle(d))}</h1><p class="org">${esc(orgName)}</p>${renderDetailBody(d)}</body></html>`
}

/** The body of the email (the sender adds the greeting, the wrapper and the footer). */
export function renderDetailEmailBody(d: TrainingDetail, sentBy: string): string {
  return `<p style="color:${BODY};font-size:15px;line-height:1.6;margin:0 0 12px">${esc(sentBy)} sent you the training detail for <strong>${esc(d.person.name)}</strong>.</p>${renderDetailBody(d)}`
}

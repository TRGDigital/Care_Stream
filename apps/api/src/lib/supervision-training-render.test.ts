import test from 'node:test'
import assert from 'node:assert/strict'
import { renderDetailBody, renderDetailPrintPage, renderDetailEmailBody, detailTitle } from './supervision-training-render'
import type { TrainingDetail } from './supervision-training'

const course = (o: any = {}) => ({ enrollment_id: 'e1', module_id: 'm1', module_name: 'Documentation <and> Record Keeping', kind: 'Training', cpd: true, status: 'started', allocated_at: '2026-11-19T09:00:00Z', due_date: null, overdue: false, started_at: '2026-11-19T10:00:00Z', completed_at: null,
  answered: 4, total_questions: 5, correct: 1, score_pct: 25, attempts: 1, learn_minutes: 6, relearn_required: false, baseline: { score: 2, total: 5 }, reflection: null,
  incorrect: [{ question: 'When must you record?', their_answer: { letter: 'B', text: 'Weekly' }, correct_answer: { letter: 'A', text: 'At the time' } }], ...o })
const detail = (o: any = {}): TrainingDetail => ({ person: { id: 'u1', name: 'Blessing Nkemdirim', job_role: 'Senior Care Assistant' }, supervision: { id: 's1', type: 'supervision', held_on: '2026-11-20T10:00:00Z', status: 'booked' },
  linked: [{ action_id: 'a1', description: 'Complete training: Documentation and Record Keeping', action_status: 'open', added_on: null, course: course() }], others: [], follow_up: [], suggestions: [], outstanding: [], since: null, generated_at: '2026-11-19T11:00:00Z', ...o })

test('the document says what the page says: score, the wrong answer and the right one', () => {
  const h = renderDetailBody(detail())
  assert.match(h, /25% \(1 of 4 answered right\)/)
  assert.match(h, /Their answer: B\. Weekly/)
  assert.match(h, /Correct answer: A\. At the time/)
  assert.match(h, /Supervision action: &ldquo;Complete training: Documentation and Record Keeping&rdquo; \(open\)/)
  assert.match(h, /Confidential/)
})
test('anything from the database is escaped', () => {
  const h = renderDetailBody(detail())
  assert.doesNotMatch(h, /<and>/); assert.match(h, /Documentation &lt;and&gt; Record Keeping/)
  assert.doesNotMatch(renderDetailBody(detail({ person: { id: 'u', name: '<script>', job_role: '<b>' } })), /<script>|<b>/)
})
test('not started says nothing has been opened; an empty supervision says nothing is allocated', () => {
  assert.match(renderDetailBody(detail({ linked: [{ action_id: 'a', description: 'x', action_status: 'open', added_on: null, course: course({ status: 'not_started', answered: 0, incorrect: [] }) }] })), /Nothing has been opened yet/)
  assert.match(renderDetailBody(detail({ linked: [] })), /No training has been allocated against this supervision yet/)
})
test('no CPD mark, no dashes in the wording, and the print page and email wrap the same body', () => {
  const body = renderDetailBody(detail())
  assert.doesNotMatch(body, /cpd-certified|CPD Certified/i)
  assert.doesNotMatch(body.replace(/<[^>]*>/g, ' '), /[—–]/)
  assert.ok(renderDetailPrintPage(detail(), 'Ferndale').includes(body))
  assert.match(renderDetailPrintPage(detail(), 'Ferndale'), /logo-color\.png/)        // the CareStream logo heads the printed page
  assert.doesNotMatch(body, /logo-color/)
  assert.ok(renderDetailEmailBody(detail(), 'Len Burgess').includes(body))
  assert.equal(detailTitle(detail()), 'Training detail: Blessing Nkemdirim')
})

test('suggestions appear in the printout and email, with their evidence, escaped', () => {
  const h = renderDetailBody(detail({ suggestions: [{ id: 'low_score:e1', tone: 'concern', course: 'X', enrollment_id: null, title: 'Low score on <X>', evidence: ['Scored 25%.'], suggestion: 'Go through it together.', action_text: 'a', low_confidence: false }] }))
  assert.match(h, /Suggestions for this supervision/); assert.match(h, /Low score on &lt;X&gt;/); assert.match(h, /Scored 25%\./); assert.match(h, /prompts, not judgements/)
  assert.doesNotMatch(renderDetailBody(detail()), /Suggestions for this/)
})

test('print layout: pages can break inside a long course, but a wrong answer is never split', () => {
  const h = renderDetailBody(detail())
  assert.doesNotMatch(h.split('Answered incorrectly')[0], /page-break-inside:avoid/)   // the course card itself may run over a page
  assert.match(h, /fecaca[^"]*break-inside:avoid/)                                     // each question block stays whole
  assert.match(renderDetailPrintPage(detail(), 'x'), /@page\{size:A4;margin:14mm\}/)
})

test('a suggestion about one course prints inside that course, a pattern prints on its own, and the still-to-do list is included', () => {
  const sugg = (o: any) => ({ tone: 'check', course: 'C', enrollment_id: null, title: 'T', evidence: ['E'], suggestion: 'S', action_text: 'a', low_confidence: false, ...o })
  const h = renderDetailBody(detail({
    suggestions: [sugg({ id: 'low_score:e1', enrollment_id: 'e1', title: 'Inside the course' }), sugg({ id: 'pattern_low:all', title: 'Across courses' })],
    outstanding: [{ key: 'f2f:1', type: 'f2f', title: 'Fire drill', state: 'missed', note: 'Did not attend the session on 1 Nov 2026.', allocated_at: null, due_date: null, overdue: true, cpd: false }],
  }))
  const inside = h.indexOf('Inside the course'), across = h.indexOf('Across courses'), courseHead = h.indexOf('Training for this'), todo = h.indexOf('Allocated training still to do (1)')
  assert.ok(across > 0 && across < courseHead, 'pattern suggestion sits above the courses')
  assert.ok(inside > courseHead, 'course suggestion sits inside the course')
  assert.ok(todo > 0 && todo < courseHead && h.includes('Fire drill') && h.includes('Face to face') && h.includes('Missed (1)'))
  assert.ok(!/[\u2013\u2014]/.test(h), 'no em or en dashes')
})

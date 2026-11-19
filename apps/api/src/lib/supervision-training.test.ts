import test from 'node:test'
import assert from 'node:assert/strict'
import { composeBrief, snapshotOf, type BriefInput } from './supervision-training'

const now = new Date('2026-11-19T10:00:00Z')
const day = (n: number) => new Date(now.getTime() + n * 86_400_000)
const item = (o: any) => ({ module_name: 'Course', source: 'manual', status: 'not_started', overdue: false, due_soon: false, ...o })
const base = (o: Partial<BriefInput> = {}): BriefInput => ({
  person: { id: 'u1', name: 'Anna', job_role: 'Carer' }, items: [], cqc: { assigned: 0, answered: 0, pending: 0, avg_score: null, questions: [] },
  knowledgeGaps90d: 0, previous: null, actions: [], now, ...o,
})

test('nothing allocated says so, and nothing else', () => {
  const b = composeBrief(base())
  assert.deepEqual(b.topics, ['No training has been allocated to this person yet.'])
  assert.equal(b.totals.assigned, 0)
})
test('overdue, expired, low scores and due soon are raised, naming the courses', () => {
  const b = composeBrief(base({ items: [
    item({ module_name: 'Moving and handling', overdue: true, due_date: day(-5) }),
    item({ module_name: 'Fire safety', status: 'expired' }),
    item({ module_name: 'Medication', status: 'complete', score: { pct: 55 }, completed_at: day(-10) }),
    item({ module_name: 'Safeguarding', due_soon: true, due_date: day(10) }),
  ] }))
  const t = b.topics.join(' | ')
  assert.match(t, /1 course is overdue: Moving and handling/)
  assert.match(t, /A course has expired and needs renewing: Fire safety/)
  assert.match(t, /Scored under 70% on: Medication \(55%\)/)
  assert.match(t, /Due in the next 30 days: Safeguarding/)
  assert.equal(b.totals.overdue, 1)
})
test('a course finished since the last supervision is a prompt to ask how it was used', () => {
  const b = composeBrief(base({ previous: { type: 'supervision', held_on: day(-30) }, items: [
    item({ module_name: 'Dementia care', status: 'complete', score: { pct: 92 }, completed_at: day(-7), cpd_accredited: true, cpd_hours: 2 }),
    item({ module_name: 'Old course', status: 'complete', score: { pct: 80 }, completed_at: day(-90) }),
  ] }))
  assert.equal(b.training.completed_since.length, 1)
  assert.match(b.topics.join(' '), /Completed 1 course since the last supervision: Dementia care/)
  assert.equal(b.totals.cpd_hours, 2)
})
test('open earlier actions, knowledge gaps and weak CQC prep are raised; done actions are not', () => {
  const b = composeBrief(base({
    knowledgeGaps90d: 4,
    cqc: { assigned: 3, answered: 2, pending: 1, avg_score: 50, questions: [{ domain: 'Safe', score: 40, status: 'evaluated' }, { domain: 'Caring', score: 90, status: 'evaluated' }] },
    actions: [{ id: 'a', description: 'x', status: 'open', module_name: null, set_on: day(-20) }, { id: 'b', description: 'y', status: 'done', module_name: null, set_on: day(-20) }],
  }))
  const t = b.topics.join(' | ')
  assert.match(t, /Struggled with CQC prep questions in: Safe/)
  assert.doesNotMatch(t, /Caring/)
  assert.match(t, /1 CQC prep question is still unanswered/)
  assert.match(t, /Asked 4 questions/)
  assert.match(t, /1 action from earlier supervisions is still open/)
})
test('fewer than three unanswered questions is not worth raising', () => {
  assert.doesNotMatch(composeBrief(base({ knowledgeGaps90d: 2, items: [item({})] })).topics.join(' '), /Asked/)
})
test('the snapshot keeps only the few facts, with no personal detail beyond course names', () => {
  const s = snapshotOf(composeBrief(base({ items: [item({ module_name: 'A', overdue: true }), item({ module_name: 'B', status: 'complete', score: { pct: 80 }, completed_at: day(-1) })] })))
  assert.deepEqual(Object.keys(s).sort(), ['assigned', 'avg_score', 'completed', 'completed_since', 'cpd_hours', 'cqc_pending', 'due_soon_courses', 'knowledge_gaps_90d', 'overdue', 'overdue_courses', 'taken_at'])
  assert.deepEqual(s.overdue_courses, ['A'])
})

test('a renewed course is not called overdue or expired: only the latest row for a course counts', () => {
  const b = composeBrief(base({ items: [
    item({ module_id: 'm1', module_name: 'Fire safety', status: 'expired', overdue: true, assigned_at: day(-400), due_date: day(-35) }),
    item({ module_id: 'm1', module_name: 'Fire safety', status: 'complete', assigned_at: day(-40), completed_at: day(-30), score: { pct: 95 } }),
  ] }))
  assert.equal(b.totals.assigned, 1)
  assert.equal(b.training.overdue.length, 0)
  assert.equal(b.training.expired.length, 0)
  assert.doesNotMatch(b.topics.join(' '), /overdue|expired/)
})
test('an expired row that is not also overdue is only listed as expired', () => {
  const b = composeBrief(base({ items: [item({ module_id: 'm2', module_name: 'Medication', status: 'expired', overdue: true, assigned_at: day(-100) })] }))
  assert.equal(b.training.overdue.length, 0)
  assert.equal(b.training.expired.length, 1)
})

import { courseDetailOf } from './supervision-training'
const mod = { id: 'm1', name: 'Infection control', source: 'manual', cpd_accredited: false, questions: [
  { id: 'q1', text: 'When must you wash hands?', options: ['Before and after', 'Only after', 'Never', 'If dirty'], correct: 0 },
  { id: 'q2', text: 'Which PPE for body fluids?', options: ['Gloves and apron', 'Nothing', 'Mask only', 'Hat'], correct: 0 },
  { id: 'q3', text: 'Third', options: ['a', 'b', 'c', 'd'], correct: 2 } ] }
test('what was answered wrongly is shown with their answer and the right one', () => {
  const c = courseDetailOf({ id: 'e1', status: 'in_progress', created_at: day(-3), learn_seconds: 600, module: mod, answers: [
    { question_id: 'q1', answer_text: 'B', is_correct: false, answered_at: day(-2) },
    { question_id: 'q2', answer_text: 'A', is_correct: true, answered_at: day(-2) },
    { question_id: 'q3', answer_text: 'D', is_correct: false, answered_at: day(-1) } ] }, now)
  assert.equal(c.status, 'started'); assert.equal(c.answered, 2 + 1); assert.equal(c.correct, 1); assert.equal(c.score_pct, 33); assert.equal(c.total_questions, 3)
  assert.equal(c.incorrect.length, 2)
  assert.deepEqual(c.incorrect[0], { question: 'When must you wash hands?', their_answer: { letter: 'B', text: 'Only after' }, correct_answer: { letter: 'A', text: 'Before and after' } })
  assert.equal(c.incorrect[1].correct_answer?.letter, 'C')
  assert.equal(c.learn_minutes, 10)
})
test('status: nothing opened is not started; complete is complete; past expiry is expired', () => {
  assert.equal(courseDetailOf({ id: 'e', status: 'not_started', created_at: day(-1), module: mod, answers: [] }, now).status, 'not_started')
  assert.equal(courseDetailOf({ id: 'e', status: 'complete', created_at: day(-9), completed_at: day(-8), expires_at: day(300), module: mod, answers: [] }, now).status, 'complete')
  assert.equal(courseDetailOf({ id: 'e', status: 'complete', created_at: day(-900), completed_at: day(-800), expires_at: day(-5), module: mod, answers: [] }, now).status, 'expired')
  assert.equal(courseDetailOf({ id: 'e', status: 'not_started', created_at: day(-9), due_date: day(-2), module: mod, answers: [] }, now).overdue, true)
})
test('a question that no longer exists still shows, without made up options', () => {
  const c = courseDetailOf({ id: 'e', status: 'in_progress', created_at: day(-1), module: { ...mod, questions: [] }, answers: [{ question_id: 'gone', question_text: 'Old question', answer_text: 'B', is_correct: false }] }, now)
  assert.equal(c.incorrect[0].question, 'Old question'); assert.equal(c.incorrect[0].their_answer?.text, null); assert.equal(c.incorrect[0].correct_answer, null)
})

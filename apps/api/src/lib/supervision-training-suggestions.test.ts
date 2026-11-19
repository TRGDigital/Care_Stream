import test from 'node:test'
import assert from 'node:assert/strict'
import { suggestionsFor } from './supervision-training-suggestions'
import type { TrainingDetail, CourseDetail } from './supervision-training'

const now = new Date('2026-11-19T10:00:00Z')
const day = (n: number) => new Date(now.getTime() + n * 86_400_000).toISOString()
const course = (o: Partial<CourseDetail> = {}): CourseDetail => ({ enrollment_id: 'e1', module_id: 'm1', module_name: 'Record keeping', kind: 'Training', cpd: false, status: 'started', allocated_at: day(-3), due_date: null, overdue: false, started_at: day(-2), completed_at: null,
  answered: 8, total_questions: 8, correct: 6, score_pct: 75, attempts: 1, learn_minutes: 12, relearn_required: false, baseline: null, reflection: null, incorrect: [], ...o })
const q = (t: string) => ({ question: t, their_answer: { letter: 'B', text: 'x' }, correct_answer: { letter: 'A', text: 'y' } })
const detail = (courses: CourseDetail[], o: Partial<TrainingDetail> = {}): TrainingDetail => ({ person: { id: 'u', name: 'Blessing', job_role: null }, supervision: null,
  linked: courses.map((c, i) => ({ action_id: `a${i}`, description: 'x', action_status: 'open', added_on: null, course: c })), others: [], follow_up: [], suggestions: [], since: null, generated_at: now.toISOString(), ...o })
const ids = (d: TrainingDetail) => suggestionsFor(d, now).map((s) => s.id.split(':')[0])

test('a low score names the questions and what to do', () => {
  const s = suggestionsFor(detail([course({ answered: 8, correct: 2, score_pct: 25, incorrect: [q('When must you record?'), q('Who can see notes?'), q('How long are records kept?'), q('Fourth')] })]), now)
  assert.equal(s[0].tone, 'concern'); assert.equal(s[0].id.split(':')[0], 'low_score')
  assert.match(s[0].evidence.join(' '), /Scored 25% \(2 of 8 answered right\)/)
  assert.match(s[0].evidence.join(' '), /When must you record\?.*and 1 more/)
  assert.equal(s[0].low_confidence, false)
})
test('a short course is worded as worth checking, not as a verdict', () => {
  const s = suggestionsFor(detail([course({ answered: 4, correct: 1, score_pct: 25, incorrect: [q('a'), q('b'), q('c')] })]), now)
  assert.equal(s[0].low_confidence, true); assert.match(s[0].suggestion, /only a rough guide/)
})
test('mid, strong and good-with-misses each get the right tone', () => {
  assert.deepEqual(ids(detail([course({ score_pct: 65, answered: 8, correct: 5, incorrect: [q('a'), q('b'), q('c')] })])), ['mid_score'])
  const strong = suggestionsFor(detail([course({ status: 'complete', score_pct: 95, answered: 10, correct: 10, completed_at: day(-1) })]), now)
  assert.equal(strong[0].tone, 'praise'); assert.match(strong[0].suggestion, /buddy/)
  assert.deepEqual(ids(detail([course({ status: 'complete', score_pct: 88, answered: 8, correct: 7, incorrect: [q('a')] })])), ['good_with_misses'])
})
test('not started: overdue is a concern, a week old is a check, brand new says nothing', () => {
  assert.equal(suggestionsFor(detail([course({ status: 'not_started', answered: 0, score_pct: null, overdue: true, due_date: day(-2) })]), now)[0].tone, 'concern')
  assert.equal(suggestionsFor(detail([course({ status: 'not_started', answered: 0, score_pct: null, allocated_at: day(-8) })]), now)[0].tone, 'check')
  assert.equal(suggestionsFor(detail([course({ status: 'not_started', answered: 0, score_pct: null, allocated_at: day(-1) })]), now).length, 0)
})
test('learning gain, a drop, all attempts used and a rushed lesson', () => {
  assert.ok(ids(detail([course({ score_pct: 90, answered: 5, correct: 4, baseline: { score: 2, total: 5 } })])).includes('gain'))
  assert.ok(ids(detail([course({ score_pct: 40, answered: 5, correct: 2, baseline: { score: 4, total: 5 }, incorrect: [q('a')] })])).includes('drop'))
  assert.ok(ids(detail([course({ attempts: 3, relearn_required: true, score_pct: 55, answered: 6, correct: 3, incorrect: [q('a')] })])).includes('attempts'))
  assert.ok(ids(detail([course({ learn_minutes: 1, score_pct: 30, answered: 6, correct: 2, incorrect: [q('a')] })])).includes('rushed'))
})
test('patterns across courses, and concerns come before praise', () => {
  const d = detail([course({ enrollment_id: 'e1', module_name: 'A', score_pct: 30, answered: 6, correct: 2, incorrect: [q('a')] }), course({ enrollment_id: 'e2', module_name: 'B', score_pct: 40, answered: 6, correct: 2, incorrect: [q('b')] }), course({ enrollment_id: 'e3', module_name: 'C', status: 'complete', score_pct: 100, answered: 6, correct: 6 })])
  const s = suggestionsFor(d, now)
  assert.ok(s.some((x) => x.id === 'pattern_low:all'))
  const tones = s.map((x) => x.tone); assert.ok(tones.indexOf('praise') > tones.lastIndexOf('concern'))
  assert.equal(suggestionsFor(detail([course()], { follow_up: [{ method: 'retry', label: 'a', when: day(-1) }, { method: 'retry', label: 'b', when: day(-1) }, { method: 'retry', label: 'c', when: day(-1) }] }), now).some((x) => x.id === 'pattern_retry:all'), true)
})
test('no dashes in the wording, ids are unique, and nothing more than eight', () => {
  const many = Array.from({ length: 6 }, (_, i) => course({ enrollment_id: `e${i}`, module_name: `Course ${i}`, score_pct: 20, answered: 6, correct: 1, attempts: 3, relearn_required: true, learn_minutes: 1, overdue: true, due_date: day(-3), incorrect: [q('a')] }))
  const s = suggestionsFor(detail(many), now)
  assert.ok(s.length <= 8); assert.equal(new Set(s.map((x) => x.id)).size, s.length)
  for (const x of s) assert.doesNotMatch([x.title, ...x.evidence, x.suggestion, x.action_text].join(' '), /[—–]/)
})

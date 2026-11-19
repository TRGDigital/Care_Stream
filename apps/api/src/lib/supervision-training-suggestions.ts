// Suggestions for a supervisor, from how a person did on the training allocated to a supervision. Rules on the real scores and answers: no AI,
// no credit, the same result every time, and every suggestion shows the evidence it is based on. They are prompts for a conversation, not
// judgements about the person, and nothing is saved anywhere unless the supervisor chooses to add one as an agreed action.
import type { TrainingDetail, CourseDetail } from './supervision-training'

export type Suggestion = {
  id: string                                  // stable: rule + enrolment, so the same suggestion can be recognised again
  tone: 'concern' | 'check' | 'praise'
  course: string | null                       // null for a pattern across courses
  title: string
  evidence: string[]                          // what it is based on, in plain words
  suggestion: string                          // what the supervisor might do
  action_text: string                         // the agreed action it becomes if chosen
  low_confidence: boolean                     // a short course gives crude percentages: worded as "worth checking"
}

const DAY = 86_400_000
const SHORT_COURSE = 5          // fewer questions than this and a percentage is crude
const LOW = 50, MID = 80, HIGH = 90
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
const list = (xs: string[], n = 3) => xs.slice(0, n).map((x) => `“${x}”`).join(', ') + (xs.length > n ? ` and ${xs.length - n} more` : '')

function forCourse(c: CourseDetail, now: Date): Suggestion[] {
  const out: Suggestion[] = []
  const name = c.module_name
  const lowConf = c.answered < SHORT_COURSE
  const add = (rule: string, s: Omit<Suggestion, 'id' | 'course' | 'low_confidence'>, lc = false) => out.push({ id: `${rule}:${c.enrollment_id}`, course: name, low_confidence: lc, ...s })
  const wrongQs = c.incorrect.map((q) => q.question)

  // ── Not done yet ──
  if (c.status === 'not_started') {
    const waited = c.allocated_at ? Math.floor((now.getTime() - new Date(c.allocated_at).getTime()) / DAY) : 0
    if (c.overdue) add('overdue_unopened', { tone: 'concern', title: 'Overdue and not opened', evidence: [`${name} was due ${c.due_date ? new Date(c.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'earlier'} and nothing has been opened.`], suggestion: 'Ask what has been getting in the way: time on shift, access to a device, confidence with the subject. Agree a date together and protect the time to do it.', action_text: `Complete ${name} by an agreed date, with time set aside on shift` })
    else if (waited >= 7) add('unopened', { tone: 'check', title: 'Not started yet', evidence: [`${name} was allocated ${plural(waited, 'day', 'days')} ago and nothing has been opened.`], suggestion: 'Agree when they will do it and make sure they know how to get to it in their hub.', action_text: `Start ${name} and tell the supervisor when it is done` })
    return out
  }
  if (c.answered === 0) {
    add('no_answers', { tone: 'check', title: 'Started the lesson but not the questions', evidence: [`${name} has been opened${c.learn_minutes ? ` (${plural(c.learn_minutes, 'minute', 'minutes')} on the lesson)` : ''} but no questions have been answered.`], suggestion: 'Ask whether anything in the lesson was unclear, or whether they ran out of time.', action_text: `Finish the questions for ${name}` })
    return out
  }

  const pct = c.score_pct ?? 0
  const sample = `${c.correct} of ${c.answered} answered right`
  const hedge = lowConf ? ' With so few questions this is only a rough guide, so treat it as worth checking.' : ''

  // ── How it went ──
  if (pct < LOW) {
    add('low_score', { tone: 'concern', title: `Low score on ${name}`, evidence: [`Scored ${pct}% (${sample}).`, ...(wrongQs.length ? [`Answered incorrectly: ${list(wrongQs)}.`] : [])],
      suggestion: `Go through ${wrongQs.length === 1 ? 'the question' : 'the questions'} answered incorrectly together. Ask them to explain what they would actually do in practice, and listen for where the understanding differs from the correct answer. Then agree the follow up lesson and a date to try again.${hedge}`,
      action_text: `Go through the follow up lesson for ${name} and answer the questions again` }, lowConf)
  } else if (pct < MID) {
    add('mid_score', { tone: 'check', title: `Some gaps on ${name}`, evidence: [`Scored ${pct}% (${sample}).`, ...(wrongQs.length ? [`Answered incorrectly: ${list(wrongQs)}.`] : [])],
      suggestion: `Mostly secure, with a few points to firm up. Ask about ${wrongQs.length === 1 ? 'the one they missed' : 'the ones they missed'} and check they know what to do in a real situation. The follow up questions will let them close each gap.${hedge}`,
      action_text: `Work through the follow up questions for ${name}` }, lowConf)
  } else if (c.status === 'complete' && c.incorrect.length === 0) {
    add('strong', { tone: 'praise', title: `Strong result on ${name}`, evidence: [`Scored ${pct}% (${sample}), nothing answered incorrectly.`],
      suggestion: pct >= HIGH && !lowConf ? 'Ask how they use this in their day to day work. They could be a good person to buddy or support newer colleagues on this topic.' : 'Acknowledge it, and ask how they use this in their day to day work.',
      action_text: `Share how you use ${name} in your daily work with a newer colleague` }, lowConf)
  } else if (c.incorrect.length > 0) {
    add('good_with_misses', { tone: 'check', title: `Good result on ${name}, with a few misses`, evidence: [`Scored ${pct}% (${sample}).`, `Answered incorrectly: ${list(wrongQs)}.`],
      suggestion: 'Acknowledge the result, then check understanding on the point they missed.', action_text: `Revisit the questions missed in ${name}` }, lowConf)
  }

  // ── Learning gain ──
  if (c.baseline && c.baseline.total > 0) {
    const before = Math.round((c.baseline.score / c.baseline.total) * 100)
    if (pct >= before + 20 && c.answered >= 3) add('gain', { tone: 'praise', title: `Clear learning gain on ${name}`, evidence: [`Pre course check ${before}%, now ${pct}%.`], suggestion: 'The course has clearly added something. Ask what they learned that they did not know before, and what they will do differently.', action_text: `Put one thing you learned from ${name} into practice` })
    if (pct + 10 < before && c.answered >= 3) add('drop', { tone: 'concern', title: `Scored lower than before the course on ${name}`, evidence: [`Pre course check ${before}%, now ${pct}%.`], suggestion: 'That is unusual. It may mean the lesson was not clear, the questions were rushed, or something else was on their mind. Ask them how it went.', action_text: `Go back over the lesson for ${name} with the supervisor` })
  }

  // ── How they went about it ──
  if (c.relearn_required || c.attempts >= 3) add('attempts', { tone: 'concern', title: 'Used all the attempts', evidence: [`${plural(c.attempts, 'attempt', 'attempts')} on ${name}${c.relearn_required ? ', and they now have to go back over the lesson before trying again' : ''}.`],
    suggestion: 'Sit down with them and go through the lesson together. Consider a short practical observation, which can show more than another test.', action_text: `Go through ${name} together and agree whether a practical observation would help` })
  if (c.learn_minutes <= 2 && pct < 60 && c.answered >= 3) add('rushed', { tone: 'check', title: 'Very little time on the lesson', evidence: [`${plural(c.learn_minutes, 'minute', 'minutes')} on the lesson and a score of ${pct}%.`], suggestion: 'They may have rushed it. Ask whether they have a quiet time and place to do training, and whether the format suits them.', action_text: `Redo ${name} in protected time` }, lowConf)
  if (c.overdue && c.status !== 'complete') add('overdue', { tone: 'concern', title: `${name} is overdue`, evidence: [`Due ${c.due_date ? new Date(c.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'earlier'}, not yet completed.`], suggestion: 'Agree a new date and ask what would make it easier to finish.', action_text: `Finish ${name} by an agreed date` })
  return out
}

const ORDER = { concern: 0, check: 1, praise: 2 }

/** All suggestions for a training detail, most important first. A handful at most: more than that stops being useful. */
export function suggestionsFor(d: TrainingDetail, now: Date = new Date()): Suggestion[] {
  const courses = [...d.linked.map((l) => l.course), ...d.others].filter(Boolean) as CourseDetail[]
  const out = courses.flatMap((c) => forCourse(c, now))

  // ── Patterns across courses ──
  const started = courses.filter((c) => c.answered > 0)
  const lows = started.filter((c) => (c.score_pct ?? 100) < LOW)
  if (lows.length >= 2) out.push({ id: 'pattern_low:all', tone: 'check', course: null, low_confidence: false, title: 'Low scores on more than one course', evidence: [`Under ${LOW}% on ${lows.map((c) => c.module_name).join(', ')}.`],
    suggestion: 'When several courses go the same way it is worth asking about more than the content: workload, time to concentrate, confidence, or whether the way training is delivered suits them.', action_text: 'Talk through what would help them get the most from training and agree one change' })
  const late = courses.filter((c) => c.overdue && c.status !== 'complete')
  if (late.length >= 2) out.push({ id: 'pattern_late:all', tone: 'concern', course: null, low_confidence: false, title: 'More than one course overdue', evidence: [`Overdue: ${late.map((c) => c.module_name).join(', ')}.`], suggestion: 'Several overdue courses together usually point to time or access, not attitude. Ask, and agree protected time.', action_text: 'Agree protected time on shift to finish the overdue training' })
  const retries = d.follow_up.filter((f) => f.method === 'retry').length, learns = d.follow_up.filter((f) => f.method === 'learn').length
  if (retries >= 3 && learns === 0) out.push({ id: 'pattern_retry:all', tone: 'check', course: null, low_confidence: false, title: 'Retries straight away without the lesson', evidence: [`${plural(retries, 'question', 'questions')} retried immediately, none after going through the lesson.`], suggestion: 'Encourage them to choose Learn and retry. Going through the lesson first is what makes the answer stick.', action_text: 'Use Learn and retry on the follow up questions, not just retry' })

  return out.sort((a, b) => ORDER[a.tone] - ORDER[b.tone]).slice(0, 8)
}

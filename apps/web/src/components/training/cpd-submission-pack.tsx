'use client'

// The four documents the CPD Certification Service asks for when a course is
// submitted for accreditation:
//   1. Knowledge Test / Assessment  — assessed vs attendance, full Q&A, pass mark,
//      failure process
//   2. Feedback Form                — how participant feedback is captured
//   3. Delegate Attendance Certificate — worked example, with the CPD logo placeholder
//   4. Navigation Guide             — how a participant works through the course
//
// Every sheet is generated from the module's OWN data, so a submission can never
// drift from what the course actually does. Follows the CourseSpecification /
// course-printables pattern: fixed overlay, Close + Print, `.spec-sheet` +
// body.printing-spec for print isolation, CareStream logo in the header.

import { useRef, useState } from 'react'
import { X, Printer, Download, Loader2 } from 'lucide-react'
import { downloadElementAsPdf, safeFileName } from '@/lib/download-pdf'

export type CpdDoc = 'assessment' | 'feedback' | 'certificate' | 'navigation'

export const CPD_DOCS: Array<{ key: CpdDoc; label: string; hint: string }> = [
  { key: 'assessment',  label: '1 · Knowledge test & assessment', hint: 'Questions, answers, pass mark and the failure process' },
  { key: 'feedback',    label: '2 · Feedback form',               hint: 'How participant feedback is captured and used' },
  { key: 'certificate', label: '3 · Delegate certificate',        hint: 'Worked example with the CPD logo placeholder' },
  { key: 'navigation',  label: '4 · Navigation guide',            hint: 'How a participant works through the course' },
]

function printSheet() {
  document.body.classList.add('printing-spec')
  window.print()
  setTimeout(() => document.body.classList.remove('printing-spec'), 600)
}

function fmt(d?: string | null): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) } catch { return '—' }
}

function Shell({ docLabel, courseName, onClose, children }: { docLabel: string; courseName: string; onClose: () => void; children: React.ReactNode }) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)

  async function download() {
    if (!sheetRef.current || saving) return
    setSaving(true)
    try {
      await downloadElementAsPdf(sheetRef.current, safeFileName(`${courseName} - ${docLabel}`))
    } catch {
      // Fall back to the print dialog if the renderer fails for any reason.
      printSheet()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 print:bg-white print:p-0">
      <div className="my-6 w-full max-w-3xl">
        <div className="mb-3 flex items-center justify-between print:hidden">
          <button onClick={onClose} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-neutral-dark hover:bg-neutral-light"><X size={14} /> Close</button>
          <div className="flex items-center gap-2">
            <button onClick={printSheet} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-neutral-dark hover:bg-neutral-light"><Printer size={14} /> Print</button>
            <button onClick={download} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50">
              {saving ? <><Loader2 size={14} className="animate-spin" /> Preparing…</> : <><Download size={14} /> Download PDF</>}
            </button>
          </div>
        </div>

        <div ref={sheetRef} className="spec-sheet rounded-xl border border-gray-200 bg-white p-8 shadow-card">
          <div className="mb-5 flex items-start justify-between gap-4 border-b-2 border-teal pb-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal">CPD submission · {docLabel}</p>
              <h1 className="mt-0.5 text-xl font-bold text-neutral-dark">{courseName}</h1>
              <p className="mt-0.5 text-xs text-neutral-mid">CareStream · online, self-paced e-learning</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-color.png" alt="CareStream" className="h-12 w-auto shrink-0 object-contain" />
          </div>
          {children}
          <p className="mt-8 border-t border-gray-100 pt-3 text-[10px] leading-relaxed text-neutral-mid">
            Prepared by CareStream for CPD accreditation of &ldquo;{courseName}&rdquo;. Generated from the live course
            content, so this document reflects exactly what participants receive.
          </p>
        </div>
      </div>
    </div>
  )
}

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-1.5 mt-5 text-sm font-bold text-teal-dark first:mt-0">{children}</h2>
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 border-b border-gray-100 py-1.5 text-sm">
      <span className="w-52 shrink-0 font-medium text-neutral-mid">{label}</span>
      <span className="flex-1 text-neutral-dark">{children}</span>
    </div>
  )
}

// ─── 1 · Knowledge test & assessment ──────────────────────────────────────────

function AssessmentDoc({ m }: { m: any }) {
  const lc        = m?.learning_content ?? {}
  const sections  = Array.isArray(lc.sections) ? lc.sections : []
  const baseline  = Array.isArray(lc.baseline) ? lc.baseline : []
  const activities = Array.isArray(lc.activities) ? lc.activities : []
  const checklist = Array.isArray(lc.practical_checklist) ? lc.practical_checklist : []
  const questions = Array.isArray(m?.questions) ? m.questions : []
  const passMark  = m?.pass_mark ?? 80
  const toPass    = Math.ceil(questions.length * (passMark / 100))

  return (
    <>
      <H>Is the course assessed?</H>
      <p className="text-sm text-neutral-dark">
        <strong>Assessed, not attendance based.</strong> Completion is only recorded when the participant passes a
        multiple-choice assessment. Time spent in the lesson is tracked separately and does not, on its own, complete
        the course.
      </p>

      <H>Assessment at a glance</H>
      <div>
        <Row label="Format">Single-best-answer multiple choice, four options per question</Row>
        <Row label="Number of questions">{questions.length}</Row>
        <Row label="Pass mark">{passMark}%, {toPass} of {questions.length} correct</Row>
        <Row label="Delivery">Online, in the participant&apos;s own language (60+ languages supported)</Row>
        <Row label="Attempts">Three. After a third unsuccessful attempt the assessment locks and the participant is returned to the lesson; it reopens once they have worked through the learning content again, with the attempt count reset</Row>
        <Row label="Time limit">None, the course is self-paced</Row>
        {baseline.length > 0 && <Row label="Pre-course knowledge check">{baseline.length} questions, taken before teaching begins, to evidence measured learning gain</Row>}
        {activities.length > 0 && <Row label="Formative activities">{activities.length} interactive exercises (sequencing, categorising, matching) plus a knowledge check after each teaching section</Row>}
        {checklist.length > 0 && <Row label="Observed competency">{checklist.length}-point checklist completed by a manager or competent assessor, in addition to the knowledge assessment</Row>}
      </div>

      <H>How the assessment is structured</H>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-neutral-dark">
        {baseline.length > 0 && <li><strong>Pre-course check</strong>: {baseline.length} questions establish the participant&apos;s starting knowledge. Scored but never gates progress.</li>}
        <li><strong>Teach then check</strong>: {sections.length} teaching sections, each ending in a formative knowledge check with immediate feedback. These do not count toward the final result.</li>
        <li><strong>Final assessment</strong>: {questions.length} questions drawn from the bank below, order randomised per participant.</li>
        <li><strong>Result</strong>: scored immediately. {passMark}% or above passes the knowledge component.</li>
        <li><strong>Certificate</strong>: released once the participant has submitted the course feedback
            {m?.requires_practical ? ' and their manager has recorded the observed competency sign-off' : ''}.
            {m?.requires_practical ? ' Until then the participant sees the certificate as pending, with what is outstanding.' : ''}</li>
      </ol>

      <H>What happens on a fail</H>
      <p className="text-sm text-neutral-dark">
        A participant scoring below {passMark}% does <strong>not</strong> receive a certificate and the course remains
        incomplete on their training record. The result screen states the score achieved and the score required. They then:
      </p>
      <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-neutral-dark">
        <li>Are returned to the lesson to review the material, with no waiting period.</li>
        <li>Retake the assessment. Question order is re-randomised on each attempt.</li>
        <li>Meet any question they answered incorrectly again through the <strong>follow-up loop</strong>: the topic is
            re-taught in a short targeted lesson and re-asked on a later day, and only clears once answered correctly.</li>
        <li>After a <strong>third unsuccessful attempt the assessment locks</strong>. The participant is directed back
            through the learning content, and the assessment only reopens once they have re-engaged with it, at which
            point the attempt count resets. Repeated attempts on a still-unfamiliar topic are prevented by design.</li>
      </ol>
      <p className="mt-2 text-sm text-neutral-dark">
        Repeated failure is visible to the employer on the training record and in the compliance matrix, so the manager can
        intervene with additional support. For a care provider this is a safeguarding and competence matter, not simply an
        administrative one.
      </p>

      {baseline.length > 0 && (
        <>
          <H>Pre-course knowledge check</H>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-neutral-dark">
            {baseline.map((q: any, i: number) => (
              <li key={i}>
                <p>{q?.text}</p>
                <ul className="mt-0.5 space-y-0.5 pl-1 text-xs">
                  {(q?.options ?? []).map((o: string, oi: number) => (
                    <li key={oi} className={oi === q?.correct ? 'font-semibold text-green-700' : 'text-neutral-mid'}>
                      {String.fromCharCode(65 + oi)}. {o}{oi === q?.correct ? '  ✓ correct' : ''}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </>
      )}

      <H>Final assessment: questions and answers</H>
      <p className="mb-2 text-xs text-neutral-mid">Correct answer marked ✓. Presented in randomised order to each participant.</p>
      <ol className="list-decimal space-y-2.5 pl-5 text-sm text-neutral-dark">
        {questions.map((q: any, i: number) => (
          <li key={q?.id ?? i}>
            <p>{q?.text}</p>
            <ul className="mt-0.5 space-y-0.5 pl-1 text-xs">
              {(q?.options ?? []).map((o: string, oi: number) => (
                <li key={oi} className={oi === q?.correct ? 'font-semibold text-green-700' : 'text-neutral-mid'}>
                  {String.fromCharCode(65 + oi)}. {o}{oi === q?.correct ? '  ✓ correct' : ''}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      {checklist.length > 0 && (
        <>
          <H>Observed competency checklist</H>
          <p className="mb-1.5 text-sm text-neutral-dark">
            This topic also requires practical observation. A manager or competent assessor observes the participant at
            work and signs off each point. The knowledge certificate and the signed checklist together evidence competence.
          </p>
          <ol className="list-decimal space-y-0.5 pl-5 text-sm text-neutral-dark">
            {checklist.map((c: string, i: number) => <li key={i}>{c}</li>)}
          </ol>
        </>
      )}
    </>
  )
}

// ─── 2 · Feedback form ────────────────────────────────────────────────────────

function FeedbackDoc({ m }: { m: any }) {
  return (
    <>
      <H>How feedback is captured</H>
      <p className="text-sm text-neutral-dark">
        Feedback is collected <strong>in the course itself</strong>, on the result screen immediately after the assessment,
        not by a separate document or external survey link. Capturing it at the point of completion, while the experience is
        fresh, gives a materially higher response rate than emailing a form afterwards.
      </p>
      <div className="mt-2">
        <Row label="Format">In-product form, shown automatically on completion</Row>
        <Row label="When">Immediately after the final assessment, before the certificate</Row>
        <Row label="Required?">Required. The certificate is released once the feedback is submitted, so every completion carries a response rather than a self-selecting sample</Row>
        <Row label="Language">Presented in the participant&apos;s own language</Row>
        <Row label="Stored against">The individual completion record, so feedback is traceable to course and cohort</Row>
      </div>

      <H>The questions asked</H>
      <div className="rounded-lg border border-gray-200 p-4">
        <p className="mb-3 text-center text-sm font-semibold text-neutral-dark">Course feedback</p>

        {[
          { q: 'Quality of the course content', lo: 'Poor', hi: 'Excellent' },
          { q: 'Ease of navigating the course', lo: 'Difficult', hi: 'Very easy' },
          { q: 'Accessibility for you as a learner', lo: 'Hard to use', hi: 'Easy to use' },
          { q: 'Interactivity and engagement', lo: 'Not engaging', hi: 'Very engaging' },
          { q: 'How confident do you feel using this in your work?', lo: 'Not at all', hi: 'Very confident' },
          { q: 'How useful was this training for your role?', lo: 'Not useful', hi: 'Very useful' },
        ].map((row, i) => (
          <div key={i}>
            <p className="mb-1.5 text-xs font-medium text-neutral-dark">{i + 1}. {row.q}</p>
            <div className="mb-1 flex gap-1.5">
              {[1, 2, 3, 4, 5].map(n => <span key={n} className="flex h-8 flex-1 items-center justify-center rounded-lg border border-gray-300 text-sm font-semibold text-neutral-mid">{n}</span>)}
            </div>
            <div className="mb-3 flex justify-between text-[10px] text-neutral-mid"><span>{row.lo}</span><span>{row.hi}</span></div>
          </div>
        ))}

        <p className="mb-1.5 text-xs font-medium text-neutral-dark">7. Anything unclear or that you&apos;d change? (optional, free text)</p>
        <div className="h-14 rounded-lg border border-gray-300 bg-neutral-light/30" />
      </div>
      <p className="mt-2 text-xs text-neutral-mid">
        All six ratings must be given before the form can be submitted; the free-text comment is optional. The four
        course-quality measures were added at the request of the CPD assessor so that content, navigation, accessibility
        and interactivity are each evidenced separately rather than inferred from a single satisfaction score.
      </p>

      <H>Reflective practice</H>
      <p className="text-sm text-neutral-dark">
        Alongside the feedback form, participants are asked to record a short reflective statement. This is a learning
        instrument rather than a satisfaction measure, and it is retained on the participant&apos;s record as evidence of
        continuing professional development.
      </p>
      <div className="mt-2 rounded-lg border border-gray-200 p-4">
        <p className="text-sm font-semibold text-neutral-dark">Reflective practice</p>
        <p className="mt-0.5 text-xs text-neutral-mid">What will you do differently in your day to day work after this course?</p>
        <div className="mt-2 h-16 rounded-lg border border-gray-300 bg-neutral-light/30" />
      </div>

      <H>How feedback drives continuous improvement</H>
      <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-dark">
        <li><strong>The six ratings</strong> are aggregated per course, so a course scoring poorly on content, navigation, accessibility, interactivity, confidence or usefulness is identified without waiting for complaints, and it is clear which of those needs the work.</li>
        <li><strong>Free-text comments</strong> are reviewed for recurring themes: wording that confuses, examples that do not match practice, sections that feel too long.</li>
        <li><strong>Assessment analytics</strong> sit alongside the feedback: a question the majority answer incorrectly usually indicates a teaching or wording problem in the course, not a cohort problem, and is rewritten.</li>
        <li><strong>Measured learning gain</strong> (pre-course check versus final score) shows whether the course actually teaches, independently of whether participants enjoyed it.</li>
        <li>Courses are <strong>reviewed on a scheduled cycle</strong> and re-attested by a named competent person; feedback gathered since the last review is considered as part of that review, and any material change re-enters the approval process.</li>
      </ul>
    </>
  )
}

// ─── 3 · Delegate attendance certificate ──────────────────────────────────────

function CertificateDoc({ m }: { m: any }) {
  const hours = m?.duration_minutes ? Math.round((m.duration_minutes / 60) * 10) / 10 : null
  return (
    <>
      <H>Certificate issued to participants</H>
      <p className="text-sm text-neutral-dark">
        A certificate is stored on the participant&apos;s training record, where both they and their employer can view,
        print or download it at any time. A certificate is never issued for attendance alone
        {m?.requires_practical ? ', and never on the knowledge assessment alone' : ''}.
      </p>
      <div className="mt-2">
        <Row label="Issued when">
          The assessment is passed at {m?.pass_mark ?? 80}% or above, the participant has submitted the course feedback
          {m?.requires_practical ? ', and a manager or competent assessor has recorded the observed competency sign-off' : ''}
        </Row>
        {m?.requires_practical && (
          <Row label="Until then">
            The participant sees the certificate as pending, naming what is still outstanding. The sign-off records the
            assessor&apos;s name and date, and both are printed on the issued certificate
          </Row>
        )}
        <Row label="Issued to">The individual participant, on their own record</Row>
        <Row label="Format">On-screen and printable / downloadable as PDF</Row>
        {hours != null && <Row label="CPD hours stated">{hours} hours</Row>}
        <Row label="CPD Certified logo">To be placed as marked below, once accreditation is granted</Row>
      </div>

      <H>Example certificate</H>
      <p className="mb-3 text-xs text-neutral-mid">Worked example with sample participant data. The dashed area marks the CPD Certified logo placement.</p>

      <div className="overflow-hidden rounded-2xl border border-teal/20">
        <div className="flex items-center justify-between bg-gradient-to-r from-teal-dark via-teal to-teal-dark px-6 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.png" alt="CareStream" className="h-12 w-auto object-contain" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/85">CPD Approved Course</span>
        </div>

        <div className="px-8 pb-7 pt-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-teal">Certificate of Completion</p>
          <p className="mt-6 text-sm text-neutral-mid">This certifies that</p>
          <p className="mt-1 font-serif text-2xl font-bold text-neutral-dark">Sample Participant</p>
          <div className="mx-auto mt-2 h-px w-40 bg-gradient-to-r from-transparent via-teal/50 to-transparent" />
          <p className="mt-4 text-sm text-neutral-mid">has successfully completed</p>
          <p className="mt-1 text-lg font-semibold text-teal-dark">{m?.name ?? 'Course name'}</p>
          <p className="mt-2 text-sm text-neutral-mid">for Example Care Home</p>

          <div className="mx-auto mt-6 grid max-w-sm grid-cols-3 divide-x divide-gray-100 rounded-xl border border-gray-100 bg-neutral-light/40 py-3">
            <div>
              <p className="text-base font-bold text-teal">93%</p>
              <p className="mt-0.5 text-[9px] uppercase tracking-wide text-neutral-mid">Score</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-dark">{fmt(new Date().toISOString())}</p>
              <p className="mt-0.5 text-[9px] uppercase tracking-wide text-neutral-mid">Completed</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-dark">{hours != null ? `${hours} h` : '—'}</p>
              <p className="mt-0.5 text-[9px] uppercase tracking-wide text-neutral-mid">CPD hours</p>
            </div>
          </div>

          <p className="mx-auto mt-4 max-w-sm rounded-lg border border-teal/25 bg-teal-light/25 px-4 py-2 text-[11px] text-neutral-dark">
            <span className="font-semibold text-teal-dark">Measured learning gain: </span>
            scored 47% on the pre-course check, then 93% on the final assessment.
          </p>

          {m?.requires_practical && (
            <p className="mx-auto mt-2 max-w-sm rounded-lg border border-teal/25 bg-teal-light/25 px-4 py-2 text-[11px] text-neutral-dark">
              <span className="font-semibold text-teal-dark">Observed competency assessment: </span>
              verified by Sample Manager (Registered Manager) on {fmt(new Date().toISOString())}.
            </p>
          )}

          {/* CPD logo placeholder */}
          <div className="mx-auto mt-5 flex max-w-sm items-center justify-center gap-3 rounded-lg border-2 border-dashed border-teal/60 bg-teal-light/20 px-4 py-4">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-teal-dark">CPD Certified logo</p>
              <p className="mt-0.5 text-[10px] text-neutral-mid">Placeholder: logo and provider number to be applied on accreditation</p>
              <p className="mt-1 text-[10px] font-medium text-neutral-dark">
                &ldquo;CPD Certified · {hours != null ? `${hours} CPD hours` : 'N CPD hours'} · The CPD Certification Service, Provider [number]&rdquo;
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 border-t border-gray-100 pt-4">
            <span className="text-[9px] uppercase tracking-wide text-neutral-mid">Issued &amp; assessed by</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-color.png" alt="CareStream" className="h-8 w-auto object-contain" />
          </div>
        </div>
      </div>
    </>
  )
}

// ─── 4 · Navigation guide ─────────────────────────────────────────────────────

function NavigationDoc({ m }: { m: any }) {
  const lc         = m?.learning_content ?? {}
  const sections   = Array.isArray(lc.sections) ? lc.sections : []
  const baseline   = Array.isArray(lc.baseline) ? lc.baseline : []
  const activities = Array.isArray(lc.activities) ? lc.activities : []
  const questions  = Array.isArray(m?.questions) ? m.questions : []
  const mins       = m?.duration_minutes

  const steps: Array<{ t: string; d: string }> = [
    { t: 'Receive the course', d: 'Your manager assigns the course. You are notified and it appears in your CareStream hub. No installation is needed. It runs in a web browser on a phone, tablet or computer.' },
    { t: 'Sign in', d: 'Open the link and sign in. Your hub opens on your assigned training. Everything is shown in your own language; you can switch language at any point without losing your place.' },
    { t: 'Open the course', d: 'Select the course to see its overview: what it covers, what you will be able to do afterwards, and roughly how long it takes' + (mins ? ` (about ${mins} minutes)` : '') + '. You can stop at any point and your progress is saved.' },
    ...(baseline.length ? [{ t: 'Quick knowledge check', d: `Before teaching begins you answer ${baseline.length} short questions. This is not a test you can fail. It records what you already know, so your improvement can be measured at the end.` }] : []),
    { t: 'Work through the lesson', d: `The lesson is split into ${sections.length} short sections. Each teaches one idea, shows a real care scenario, then asks a quick check question. Answer it and you are told immediately whether you were right, with an explanation either way.` },
    ...(activities.length ? [{ t: 'Complete the activities', d: `${activities.length} interactive exercises are spread through the lesson: putting steps in the right order, sorting items into categories, or matching a term to its meaning. They practise what the section just taught.` }] : []),
    { t: 'Take the assessment', d: `When the lesson is finished you take the final assessment: ${questions.length} multiple-choice questions, four options each, one best answer. There is no time limit and you can go back and change an answer before submitting.` },
    { t: 'See your result', d: `You need ${m?.pass_mark ?? 80}% to pass and your score is shown straight away. If you do not pass, you are returned to the lesson and can retake the assessment, up to three attempts. See "If you do not pass" below.` },
    { t: 'Give feedback and reflect', d: 'You rate the course on six points: content quality, ease of navigation, accessibility, interactivity, how confident you feel using the learning, and how useful it was for your role. You can add a comment, and write a short reflective note on what you will do differently at work, which is kept on your record. The six ratings are required, and the certificate follows.' },
    ...(m?.requires_practical
      ? [{ t: 'Complete your observed competency assessment', d: 'This course also has a practical part. Your manager or a competent assessor watches you at work and signs off each point of the observation checklist. Until they record that sign-off, your certificate shows as pending and tells you what is outstanding.' }]
      : []),
    { t: 'Get your certificate', d: `Your certificate is saved to your training record once you have passed and given your feedback${m?.requires_practical ? ', and your manager has recorded the observed competency sign-off. The certificate names who verified your observed assessment and when' : ''}. You can view, print or download it at any time.` },
  ]

  return (
    <>
      <H>Before you start</H>
      <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-dark">
        <li>Works in any modern web browser on a phone, tablet or computer, with nothing to install.</li>
        <li>Your progress saves automatically. You can stop and pick up exactly where you left off.</li>
        <li>Available in over 60 languages. Change language at any point without losing your place.</li>
        <li>Text can be read aloud if you prefer to listen rather than read.</li>
        {mins ? <li>Allow roughly {mins} minutes in total. It does not have to be in one sitting.</li> : null}
      </ul>

      <H>Working through the course, step by step</H>
      <ol className="space-y-2.5">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-light/60 text-xs font-bold text-teal-dark">{i + 1}</span>
            <div>
              <p className="text-sm font-semibold text-neutral-dark">{s.t}</p>
              <p className="text-sm text-neutral-dark">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>

      <H>If you do not pass</H>
      <p className="text-sm text-neutral-dark">
        Nothing is lost and there is no penalty. You are shown your score and the score needed, and returned to the lesson to
        review it. You can retake the assessment straight away, and you have three attempts. Anything you answered incorrectly
        comes back to you a few days later as a short refresher question, so the gap is closed rather than forgotten.
      </p>
      <p className="mt-2 text-sm text-neutral-dark">
        If you do not pass on the third attempt the assessment pauses and you are asked to work through the lesson again.
        Once you have, it reopens and your attempts start afresh. This is not a penalty: it is there so that a fourth
        attempt follows some fresh learning rather than more guessing. Your manager can see if you are stuck and will
        offer support.
      </p>

      <H>Getting help</H>
      <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-dark">
        <li>Ask your manager or the person who assigned the course.</li>
        <li>Use the in-hub assistant to ask a question about your workplace policies at any time.</li>
        <li>If something in the course is unclear or looks wrong, say so in the feedback box at the end, and it is read.</li>
      </ul>
    </>
  )
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export function CpdSubmissionSheet({ doc, m, onClose }: { doc: CpdDoc; m: any; onClose: () => void }) {
  const name = m?.name ?? 'Course'
  if (doc === 'assessment')  return <Shell docLabel="Knowledge test & assessment" courseName={name} onClose={onClose}><AssessmentDoc m={m} /></Shell>
  if (doc === 'feedback')    return <Shell docLabel="Feedback form" courseName={name} onClose={onClose}><FeedbackDoc m={m} /></Shell>
  if (doc === 'certificate') return <Shell docLabel="Delegate certificate" courseName={name} onClose={onClose}><CertificateDoc m={m} /></Shell>
  return <Shell docLabel="Navigation guide" courseName={name} onClose={onClose}><NavigationDoc m={m} /></Shell>
}

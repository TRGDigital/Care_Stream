'use client'

// The CPD accreditation submission pack for a PROGRAMME (diploma / pathway),
// the multi-unit sibling of cpd-submission-pack.tsx.
//
// A programme is assessed differently from a single course — units are passed
// individually, then a synoptic assessment spans them — so these documents
// describe that structure rather than pretending it is one long course.

import { useRef, useState } from 'react'
import { X, Printer, Download, Loader2 } from 'lucide-react'
import { downloadElementAsPdf, safeFileName } from '@/lib/download-pdf'

export type CpdProgDoc = 'assessment' | 'feedback' | 'certificate' | 'navigation'

export const CPD_PROG_DOCS: Array<{ key: CpdProgDoc; label: string; hint: string }> = [
  { key: 'assessment',  label: '1 · Knowledge test & assessment', hint: 'Unit assessments, the synoptic paper, pass marks and the failure process' },
  { key: 'feedback',    label: '2 · Feedback form',               hint: 'How participant feedback is captured across the programme' },
  { key: 'certificate', label: '3 · Delegate certificate',        hint: 'Worked example with the CPD logo placeholder' },
  { key: 'navigation',  label: '4 · Navigation guide',            hint: 'How a participant works through the programme' },
]

const KIND_LABEL: Record<string, string> = { diploma: 'Diploma', pathway: 'Pathway', award: 'Award' }

function printSheet() {
  document.body.classList.add('printing-spec')
  window.print()
  setTimeout(() => document.body.classList.remove('printing-spec'), 600)
}

function Shell({ docLabel, name, kind, onClose, children }: { docLabel: string; name: string; kind: string; onClose: () => void; children: React.ReactNode }) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)

  async function download() {
    if (!sheetRef.current || saving) return
    setSaving(true)
    try {
      await downloadElementAsPdf(sheetRef.current, safeFileName(`${name} — ${docLabel}`))
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
              <h1 className="mt-0.5 text-xl font-bold text-neutral-dark">{name}</h1>
              <p className="mt-0.5 text-xs text-neutral-mid">CareStream · multi-unit online {(KIND_LABEL[kind] ?? 'programme').toLowerCase()}, self-paced</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-color.png" alt="CareStream" className="h-12 w-auto shrink-0 object-contain" />
          </div>
          {children}
          <p className="mt-8 border-t border-gray-100 pt-3 text-[10px] leading-relaxed text-neutral-mid">
            Prepared by CareStream for CPD accreditation of &ldquo;{name}&rdquo;. Generated from the live programme
            structure, so this document reflects exactly what participants receive.
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

function totals(p: any) {
  const units    = Array.isArray(p?.units) ? p.units : []
  const required = units.filter((u: any) => !u.is_optional)
  const synoptic = Array.isArray(p?.synoptic_questions) ? p.synoptic_questions : []
  const minutes  = units.reduce((n: number, u: any) => n + (u.duration_minutes ?? 0), 0)
  return { units, required, synoptic, minutes, hours: minutes ? Math.round((minutes / 60) * 10) / 10 : null }
}

// ─── 1 · Knowledge test & assessment ──────────────────────────────────────────

function AssessmentDoc({ p }: { p: any }) {
  const { units, required, synoptic, hours } = totals(p)
  const practical = units.filter((u: any) => u.requires_practical)
  const toPass = Math.ceil(synoptic.length * ((p?.synoptic_pass_mark ?? 80) / 100))

  return (
    <>
      <H>Is the programme assessed?</H>
      <p className="text-sm text-neutral-dark">
        <strong>Assessed at two levels, not attendance based.</strong> Each unit carries its own assessment which must be
        passed individually, and the programme then closes with a <strong>synoptic assessment</strong> — questions that
        deliberately require knowledge from more than one unit at once. Passing every unit alone does not complete the
        programme.
      </p>

      <H>Assessment at a glance</H>
      <div>
        <Row label="Units">{required.length} required{units.length > required.length ? `, plus ${units.length - required.length} optional` : ''}</Row>
        <Row label="Unit assessment">Multiple choice, four options, single best answer — each unit passed on its own merits</Row>
        <Row label="Unit pass mark">{required[0]?.pass_mark ?? 80}% per unit</Row>
        <Row label="Synoptic assessment">{synoptic.length} questions spanning two or more units each</Row>
        <Row label="Synoptic pass mark">{p?.synoptic_pass_mark ?? 80}% — {toPass} of {synoptic.length} correct</Row>
        {hours != null && <Row label="Taught volume">{hours} hours across the units</Row>}
        {p?.require_practical && practical.length > 0 && <Row label="Observed competency">{practical.length} unit{practical.length === 1 ? '' : 's'} additionally require a manager-signed observation</Row>}
        {p?.require_reflection && <Row label="Reflective account">Required — a written statement of intended change in practice</Row>}
        <Row label="Order">{p?.sequential ? 'Sequential — units unlock in order' : 'Any order — the participant chooses'}</Row>
        <Row label="Attempts">Unlimited on both unit and synoptic assessments</Row>
      </div>

      <H>Completion rule</H>
      <p className="text-sm text-neutral-dark">The programme is only marked complete when <strong>all</strong> of the following are true:</p>
      <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-neutral-dark">
        <li>Every required unit has been passed at its own pass mark.</li>
        {p?.require_practical && practical.length > 0 && <li>Every unit requiring observation has been signed off by a manager or competent assessor.</li>}
        {synoptic.length > 0 && <li>The synoptic assessment has been passed at {p?.synoptic_pass_mark ?? 80}%.</li>}
        {p?.require_reflection && <li>A reflective account has been submitted.</li>}
      </ol>

      <H>The units</H>
      <ol className="list-decimal space-y-0.5 pl-5 text-sm text-neutral-dark">
        {units.map((u: any) => (
          <li key={u.module_id}>
            {u.name}
            {u.is_optional ? <span className="text-neutral-mid"> (optional)</span> : null}
            {u.duration_minutes ? <span className="text-neutral-mid"> — {u.duration_minutes} min</span> : null}
            {u.question_count ? <span className="text-neutral-mid">, {u.question_count} questions</span> : null}
            {u.requires_practical ? <span className="text-amber-700"> · observed assessment required</span> : null}
          </li>
        ))}
      </ol>

      <H>What happens on a fail</H>
      <p className="text-sm text-neutral-dark">
        <strong>A unit:</strong> no unit certificate is issued and the programme stays incomplete. The participant reviews
        that unit&apos;s lesson and retakes it, with question order re-randomised. Anything answered incorrectly returns
        days later as a short refresher and only clears once answered correctly.
      </p>
      <p className="mt-1.5 text-sm text-neutral-dark">
        <strong>The synoptic assessment:</strong> the score and the score required are shown. The participant may revisit
        any unit before retaking it, as many times as needed. Because synoptic questions span units, a pattern of failure
        indicates which unit needs revisiting rather than simply that the paper was hard.
      </p>
      <p className="mt-1.5 text-sm text-neutral-dark">
        There is no cap on attempts and no penalty, because the objective is competence rather than a single passing score.
        Repeated failure is visible to the employer, who can intervene with support — in a care setting that is a competence
        and safeguarding matter, not an administrative one.
      </p>

      {synoptic.length > 0 && (
        <>
          <H>Synoptic assessment — questions and answers</H>
          <p className="mb-2 text-xs text-neutral-mid">Correct answer marked ✓. Each question names the units it draws upon.</p>
          <ol className="list-decimal space-y-2.5 pl-5 text-sm text-neutral-dark">
            {synoptic.map((q: any, i: number) => (
              <li key={q?.id ?? i}>
                <p>{q?.text}</p>
                <ul className="mt-0.5 space-y-0.5 pl-1 text-xs">
                  {(q?.options ?? []).map((o: string, oi: number) => (
                    <li key={oi} className={oi === q?.correct ? 'font-semibold text-green-700' : 'text-neutral-mid'}>
                      {String.fromCharCode(65 + oi)}. {o}{oi === q?.correct ? '  ✓ correct' : ''}
                    </li>
                  ))}
                </ul>
                {Array.isArray(q?.draws_on) && q.draws_on.length > 0 && (
                  <p className="mt-0.5 text-[11px] text-teal-dark">Draws on: {q.draws_on.join(' + ')}</p>
                )}
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-neutral-mid">
            Each unit&apos;s own question bank is provided in that unit&apos;s individual course submission.
          </p>
        </>
      )}
    </>
  )
}

// ─── 2 · Feedback form ────────────────────────────────────────────────────────

function FeedbackDoc({ p }: { p: any }) {
  const { required } = totals(p)
  return (
    <>
      <H>How feedback is captured</H>
      <p className="text-sm text-neutral-dark">
        Feedback is captured <strong>in-product at two points</strong>: after each unit, and again as a reflective account
        for the programme as a whole. Collecting it at the moment of completion, rather than by a separate survey emailed
        afterwards, gives a materially higher response rate and more specific answers.
      </p>
      <div className="mt-2">
        <Row label="Per unit">Two rating questions and a free-text box on each unit&apos;s result screen</Row>
        <Row label="Per programme">A reflective account covering the programme as a whole</Row>
        <Row label="Required?">Ratings optional{p?.require_reflection ? '; the reflective account is required to complete the programme' : ''}</Row>
        <Row label="Language">Presented in the participant&apos;s own language</Row>
        <Row label="Granularity">Stored per unit, so a weak unit is identifiable rather than hidden in a programme average</Row>
      </div>

      <H>The questions asked after each unit</H>
      <div className="rounded-lg border border-gray-200 p-4">
        <p className="mb-3 text-center text-sm font-semibold text-neutral-dark">Quick feedback (optional)</p>
        <p className="mb-1.5 text-xs font-medium text-neutral-dark">1. How confident do you feel using this in your work?</p>
        <div className="mb-1 flex gap-1.5">
          {[1, 2, 3, 4, 5].map(n => <span key={n} className="flex h-8 flex-1 items-center justify-center rounded-lg border border-gray-300 text-sm font-semibold text-neutral-mid">{n}</span>)}
        </div>
        <div className="mb-3 flex justify-between text-[10px] text-neutral-mid"><span>Not at all</span><span>Very confident</span></div>
        <p className="mb-1.5 text-xs font-medium text-neutral-dark">2. How useful was this training for your role?</p>
        <div className="mb-1 flex gap-1.5">
          {[1, 2, 3, 4, 5].map(n => <span key={n} className="flex h-8 flex-1 items-center justify-center rounded-lg border border-gray-300 text-sm font-semibold text-neutral-mid">{n}</span>)}
        </div>
        <div className="mb-3 flex justify-between text-[10px] text-neutral-mid"><span>Not useful</span><span>Very useful</span></div>
        <p className="mb-1.5 text-xs font-medium text-neutral-dark">3. Anything unclear or that you&apos;d change? (optional, free text)</p>
        <div className="h-14 rounded-lg border border-gray-300 bg-neutral-light/30" />
      </div>

      <H>Programme reflective account</H>
      <p className="text-sm text-neutral-dark">
        {p?.require_reflection
          ? 'Required to complete the programme. It is a learning instrument rather than a satisfaction measure, and is retained on the participant’s record and printed in summary on the certificate transcript as evidence of continuing professional development.'
          : 'Invited at the end of the programme and retained on the participant’s record as evidence of continuing professional development.'}
      </p>
      <div className="mt-2 rounded-lg border border-gray-200 p-4">
        <p className="text-sm font-semibold text-neutral-dark">Reflective account</p>
        <p className="mt-0.5 text-xs text-neutral-mid">In your own words: what will you do differently at work because of this programme? Give a real example.</p>
        <div className="mt-2 h-20 rounded-lg border border-gray-300 bg-neutral-light/30" />
      </div>

      <H>How feedback drives continuous improvement</H>
      <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-dark">
        <li><strong>Per-unit scores</strong> are compared across the {required.length} required units, so a single weak unit is visible rather than averaged away.</li>
        <li><strong>Synoptic performance by question</strong> shows which combinations of units participants struggle to connect — usually a sign that a link between units needs teaching more explicitly.</li>
        <li><strong>Measured learning gain</strong> across the programme (pre-course checks versus final scores) evidences whether it teaches, independently of satisfaction.</li>
        <li><strong>Free-text comments</strong> are reviewed for recurring themes and fed into the scheduled content review.</li>
        <li>Units and the programme are <strong>re-attested by a named competent person</strong> on review; material change re-enters the approval process.</li>
      </ul>
    </>
  )
}

// ─── 3 · Delegate certificate ─────────────────────────────────────────────────

function CertificateDoc({ p }: { p: any }) {
  const { units, required, synoptic, hours } = totals(p)
  const kind = KIND_LABEL[p?.kind] ?? 'Programme'
  return (
    <>
      <H>Certificate issued to participants</H>
      <p className="text-sm text-neutral-dark">
        Yes. A single {kind.toLowerCase()} certificate is issued <strong>automatically on completion</strong> of the whole
        programme and stored on the participant&apos;s record. Individual unit certificates are issued as each unit is
        passed; the {kind.toLowerCase()} certificate is additional to those and carries a full transcript.
      </p>
      <div className="mt-2">
        <Row label="Issued when">Every required unit passed{synoptic.length > 0 ? `, synoptic assessment passed at ${p?.synoptic_pass_mark ?? 80}%` : ''}{p?.require_reflection ? ', and the reflective account submitted' : ''}</Row>
        <Row label="Format">On-screen and printable / downloadable as PDF</Row>
        {hours != null && <Row label="CPD hours stated">{hours} hours, substantiated by recorded time on the lessons</Row>}
        <Row label="Transcript">Every unit listed with its score and completion date</Row>
        <Row label="CPD Certified logo">To be placed as marked below, once accreditation is granted</Row>
      </div>

      <H>Example certificate</H>
      <p className="mb-3 text-xs text-neutral-mid">Worked example with sample participant data. The dashed area marks the CPD Certified logo placement.</p>

      <div className="overflow-hidden rounded-2xl border border-teal/20">
        <div className="flex items-center justify-between bg-gradient-to-r from-teal-dark via-teal to-teal-dark px-6 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-white.png" alt="CareStream" className="h-12 w-auto object-contain" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/85">{kind}</span>
        </div>

        <div className="px-8 pb-7 pt-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-teal">{kind}</p>
          <p className="mt-1 text-[9px] uppercase tracking-[0.25em] text-neutral-mid">Multi-unit programme · assessed knowledge, applied judgement and reflective practice</p>
          <p className="mt-5 text-sm text-neutral-mid">This certifies that</p>
          <p className="mt-1 font-serif text-2xl font-bold text-neutral-dark">Sample Participant</p>
          <div className="mx-auto mt-2 h-px w-40 bg-gradient-to-r from-transparent via-teal/50 to-transparent" />
          <p className="mt-4 text-sm text-neutral-mid">has successfully completed the</p>
          <p className="mt-1 font-serif text-xl font-semibold text-teal-dark">{p?.name ?? 'Programme name'}</p>
          <p className="mt-2 text-sm text-neutral-mid">for Example Care Home</p>

          <div className="mx-auto mt-6 grid max-w-md grid-cols-4 divide-x divide-gray-100 rounded-xl border border-gray-100 bg-neutral-light/40 py-3">
            <div><p className="text-base font-bold text-teal">{required.length}</p><p className="mt-0.5 text-[9px] uppercase tracking-wide text-neutral-mid">Units</p></div>
            <div><p className="text-base font-bold text-teal">{hours ?? '—'}</p><p className="mt-0.5 text-[9px] uppercase tracking-wide text-neutral-mid">CPD hours</p></div>
            <div><p className="text-base font-bold text-teal">{synoptic.length > 0 ? '91%' : '—'}</p><p className="mt-0.5 text-[9px] uppercase tracking-wide text-neutral-mid">Final assessment</p></div>
            <div><p className="text-xs font-semibold text-neutral-dark">Sample date</p><p className="mt-0.5 text-[9px] uppercase tracking-wide text-neutral-mid">Completed</p></div>
          </div>

          <p className="mx-auto mt-4 max-w-md rounded-lg border border-teal/25 bg-teal-light/25 px-4 py-2 text-[11px] text-neutral-dark">
            <span className="font-semibold text-teal-dark">Measured learning gain: </span>
            scored 44% on the pre-course knowledge checks and 89% across the unit assessments, passing the cross-unit final assessment at 91%.
          </p>

          {/* CPD logo placeholder */}
          <div className="mx-auto mt-5 flex max-w-md items-center justify-center rounded-lg border-2 border-dashed border-teal/60 bg-teal-light/20 px-4 py-4">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-teal-dark">CPD Certified logo</p>
              <p className="mt-0.5 text-[10px] text-neutral-mid">Placeholder — logo and provider number to be applied on accreditation</p>
              <p className="mt-1 text-[10px] font-medium text-neutral-dark">
                &ldquo;CPD Certified · {hours != null ? `${hours} CPD hours` : 'N CPD hours'} · The CPD Certification Service — Provider [number]&rdquo;
              </p>
            </div>
          </div>

          {units.length > 0 && (
            <div className="mt-5 text-left">
              <p className="mb-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-teal">Units completed — transcript</p>
              <div className="overflow-hidden rounded-lg border border-gray-100">
                <table className="w-full text-[10px]">
                  <thead className="bg-neutral-light/50 text-neutral-mid">
                    <tr><th className="px-2 py-1 text-left font-medium">Unit</th><th className="px-2 py-1 text-right font-medium">Score</th><th className="px-2 py-1 text-right font-medium">Time</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {units.slice(0, 6).map((u: any) => (
                      <tr key={u.module_id}>
                        <td className="px-2 py-1 text-neutral-dark">{u.name}</td>
                        <td className="px-2 py-1 text-right text-neutral-dark">sample</td>
                        <td className="px-2 py-1 text-right text-neutral-mid">{u.duration_minutes ? `${u.duration_minutes} min` : '—'}</td>
                      </tr>
                    ))}
                    {units.length > 6 && <tr><td className="px-2 py-1 text-neutral-mid" colSpan={3}>…and {units.length - 6} more</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-5 flex items-center justify-center gap-2 border-t border-gray-100 pt-4">
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

function NavigationDoc({ p }: { p: any }) {
  const { units, required, synoptic, hours } = totals(p)
  const kind = (KIND_LABEL[p?.kind] ?? 'programme').toLowerCase()

  const steps: Array<{ t: string; d: string }> = [
    { t: `Receive the ${kind}`, d: `Your manager enrols you. It appears in your CareStream hub under My Diplomas, showing every unit and your progress through them. Nothing to install — it runs in a web browser on a phone, tablet or computer.` },
    { t: 'See what it involves', d: `Opening it shows what you will be able to do at the end, the ${required.length} units you need to complete${units.length > required.length ? `, any optional extras` : ''}${hours != null ? `, and roughly how long it takes (about ${hours} hours in total)` : ''}. You are not expected to do it in one sitting.` },
    { t: 'Work through the units', d: p?.sequential
        ? 'Units unlock in order — finish one to open the next. Each is a full course: a short lesson taught in sections, interactive activities, then its own assessment.'
        : 'Take the units in whatever order suits you. Each is a full course: a short lesson taught in sections, interactive activities, then its own assessment.' },
    { t: 'Pass each unit', d: 'Each unit ends with its own multiple-choice assessment. Passing issues a certificate for that unit straight away and ticks it off your progress. Your progress is saved at every step.' },
    ...(p?.require_practical ? [{ t: 'Complete observed assessments', d: 'Some units also need a manager or senior colleague to watch you carry out the task at work and sign a checklist. Ask your manager to arrange this — the programme cannot complete without it.' }] : []),
    ...(synoptic.length ? [{ t: 'Take the final assessment', d: `Once every required unit is done, the final assessment unlocks: ${synoptic.length} questions that bring together more than one unit at a time. You need ${p?.synoptic_pass_mark ?? 80}% to pass, and you can retake it as often as you need.` }] : []),
    ...(p?.require_reflection ? [{ t: 'Write your reflective account', d: 'In your own words, what will you do differently at work because of this programme? A real example is worth more than a general statement. This is required to complete.' }] : []),
    { t: 'Get your certificate', d: `Your ${kind} certificate is issued automatically and saved to your record, listing every unit with its score. You can view, print or download it at any time.` },
  ]

  return (
    <>
      <H>Before you start</H>
      <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-dark">
        <li>Works in any modern web browser on a phone, tablet or computer.</li>
        <li>Your progress saves automatically, unit by unit. Stop and resume whenever you like.</li>
        <li>Available in over 60 languages, and text can be read aloud.</li>
        <li>Units you have already completed elsewhere in your training count towards this {kind} — you will not be asked to repeat them.</li>
        {hours != null ? <li>Allow roughly {hours} hours in total, spread over as long as you need.</li> : null}
      </ul>

      <H>Working through it, step by step</H>
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

      <H>The units</H>
      <ol className="list-decimal space-y-0.5 pl-5 text-sm text-neutral-dark">
        {units.map((u: any) => (
          <li key={u.module_id}>
            {u.name}
            {u.is_optional ? <span className="text-neutral-mid"> (optional)</span> : null}
            {u.duration_minutes ? <span className="text-neutral-mid"> — about {u.duration_minutes} minutes</span> : null}
          </li>
        ))}
      </ol>

      <H>If you do not pass something</H>
      <p className="text-sm text-neutral-dark">
        Nothing is lost and there is no penalty. For a unit, review its lesson and retake the assessment — as many times as
        you need. Anything you got wrong comes back a few days later as a short refresher question, so the gap closes rather
        than being forgotten. For the final assessment, you can revisit any unit before trying again. Your manager can see
        if you are stuck and will offer support.
      </p>

      <H>Getting help</H>
      <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-dark">
        <li>Ask your manager or whoever enrolled you.</li>
        <li>Use the in-hub assistant to ask about your workplace policies at any time.</li>
        <li>If something is unclear or looks wrong, say so in the feedback box at the end of the unit — it is read.</li>
      </ul>
    </>
  )
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export function CpdProgrammeSheet({ doc, p, onClose }: { doc: CpdProgDoc; p: any; onClose: () => void }) {
  const name = p?.name ?? 'Programme'
  const kind = p?.kind ?? 'diploma'
  if (doc === 'assessment')  return <Shell docLabel="Knowledge test & assessment" name={name} kind={kind} onClose={onClose}><AssessmentDoc p={p} /></Shell>
  if (doc === 'feedback')    return <Shell docLabel="Feedback form" name={name} kind={kind} onClose={onClose}><FeedbackDoc p={p} /></Shell>
  if (doc === 'certificate') return <Shell docLabel="Delegate certificate" name={name} kind={kind} onClose={onClose}><CertificateDoc p={p} /></Shell>
  return <Shell docLabel="Navigation guide" name={name} kind={kind} onClose={onClose}><NavigationDoc p={p} /></Shell>
}
